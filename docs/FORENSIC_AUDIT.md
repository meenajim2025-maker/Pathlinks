# Forensic Audit – PathLinks Repo & Deploy

**Date:** 2025-02-16  
**Scope:** Local git state, root vs `app/` duplication, data files, anonymization, and Vercel deploy.

---

## 1. Git state

- **Branch:** `main` (no remotes listed in short status).
- **Last commit:** `9075c9e` – *PathLinks v3.1 - Fixed thyroid analysis, redesigned EMIS Integration, deployed to Vercel*
- **Uncommitted:**
  - **Modified (tracked):** `.gitignore`, `README.md`, `app/index.html`, `app/script.js`, `app/style.css`, `index.html`, `script.js`, `style.css`
  - **Untracked:** `app/data/clinical_topics_learning.json`, `app/data/knowledge_base.json`, `data/clinical_topics_learning.json`, `data/knowledge_base.json`, `docs/DEPLOY_VERCEL.md`, `docs/KNOWLEDGE_EXTRACTION.md`, `package.json`, `requirements.txt`, `scripts/` (entire dir)

**Implication:** All MP3-derived data, anonymization, learning library, and Vercel-related docs/scripts are **not in version control**. Deploys via `npx vercel --prod` from the working tree include these files (Vercel uploads the current directory). Git-based deploys (e.g. “Deploy from GitHub”) would **not** include `data/knowledge_base.json` or `app/data/knowledge_base.json` unless they are committed.

---

## 2. Repository layout and duplication

- **Root:** `index.html`, `script.js`, `style.css`, `data/blood_tests_protocol.json` (tracked). `data/knowledge_base.json` and `data/clinical_topics_learning.json` exist but are untracked.
- **app/:** Same structure: `index.html`, `script.js`, `style.css`, `app/data/blood_tests_protocol.json` (tracked). `app/data/knowledge_base.json` and `app/data/clinical_topics_learning.json` exist but are untracked.

**Vercel:** `vercel.json` uses `"builds":[{"src":"**/*","use":"@vercel/static"}]` with no `rootDirectory`. So the **project root** is the deployment root. The live site is served from the repo root: `https://pathlinks-clinical.vercel.app/` loads **root** `index.html` and **root** `script.js`, and fetches `./data/` → **root** `data/` (e.g. `data/blood_tests_protocol.json`, `data/knowledge_base.json`). The `app/` folder is just another set of files under the same deploy; it is not the document root.

**Conclusion:** The **canonical** app for the live URL is **root** `index.html`, `script.js`, `style.css`, and **root** `data/`. Keeping `app/` in sync avoids drift if anything ever serves from `app/` (e.g. local server or future config change).

---

## 3. Root vs app/ file diff

- **index.html:** Identical (202 lines each).
- **style.css:** Identical (578 lines each).
- **script.js:** **Different.** Root has 660 lines, app has 656. Only difference is in `getRelatedLearning()`:
  - **Root (current):** Skips the first ~15% of transcript (intro), then takes up to 380 characters of clinical content. Aligns with anonymization (intros removed).
  - **app/ (old):** Uses first 280 characters of transcript (no skip). Can show intro text if present.

**Change made:** `app/script.js` was updated to use the same skip-intro + 380-character logic as root so both copies behave identically.

---

## 4. Data files

- **data/knowledge_base.json** and **app/data/knowledge_base.json:** Identical (89,306 bytes). Both contain anonymized transcripts (no “Roger Henderson”, “Kate Chesterman”, “my name is”, “I'm a GP” in raw form); intros removed or replaced with “(Intro removed; no clinical content in this segment.)”.
- **data/blood_tests_protocol.json:** Tracked; committed. Same protocol used by root and (if ever used) app.
- **data/clinical_topics_learning.json:** Untracked; built from MP3 filenames only (no transcript text). Fallback when `knowledge_base.json` is missing.
- **data/knowledge_base.json.bak:** Backup written by `scripts/anonymize_transcripts.py`. Ignored by `.gitignore` (`data/*.bak`).

---

## 5. Scripts

All under `scripts/` (untracked):

- **anonymize_transcripts.py** – Replaces known names with `[Name]`/`[Organisation]`, strips intro sentences, writes backup to `data/knowledge_base.json.bak`, overwrites `data/knowledge_base.json`.
- **transcribe_mp3_to_knowledge.py** – Whisper transcription from USB MP3s → `data/knowledge_base.json`.
- **parse-mp3-topics.js** – Builds topic list from MP3 filenames → `data/clinical_topics_learning.json`.
- **run-transcription.sh** – Wraps transcription with project ffmpeg (e.g. `node_modules/ffmpeg-static`).

**Recommendation:** Run anonymization after any re-transcription or manual edit of transcripts. Then copy `data/knowledge_base.json` to `app/data/knowledge_base.json` if you want both paths identical before deploy.

---

## 6. .gitignore

Current entries: `.vercel`, `.venv`, `__pycache__`, `*.pyc`, `data/transcripts/`, `data/*.bak`, `node_modules/`.

- `data/*.bak` correctly excludes the anonymization backup.
- `data/knowledge_base.json` and `data/clinical_topics_learning.json` are **not** ignored; they are simply untracked. Adding them to git would make the repo self-contained for git-based deploys and other clones.

---

## 7. Deploy checklist (for future reference)

1. **Anonymize:**  
   `python3 scripts/anonymize_transcripts.py`  
   (Updates `data/knowledge_base.json` only.)

2. **Sync app data (optional but recommended):**  
   `cp data/knowledge_base.json app/data/knowledge_base.json`

3. **Deploy:**  
   `npx vercel --prod` (or `npm run deploy`) from project root.  
   The live site uses **root** `index.html` and **root** `data/`. Ensure root `data/knowledge_base.json` is the anonymized version (step 1 does this).

4. **If using Git-based deploys:** Commit `data/knowledge_base.json` and `app/data/knowledge_base.json` (and optionally `data/clinical_topics_learning.json`, `scripts/`, `docs/`) so the deployed build includes them.

---

## 8. Summary of changes made in this audit

1. **docs/FORENSIC_AUDIT.md** added (this file).
2. **app/script.js** updated so `getRelatedLearning()` matches root: skip first ~15% of transcript, then up to 380 characters (no raw intro in related-learning snippets).
3. No changes to anonymization logic or data file contents; both knowledge_base copies were already anonymized and in sync.
