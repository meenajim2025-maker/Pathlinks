# PathLinks Clinical Decision Support (V2.0)

A clinical decision-support **aid for UK healthcare professionals**, designed to streamline blood-test actioning, with NICE-aligned decision tools and calculators.

> **Important:** PathLinks is a decision-support aid for registered healthcare professionals. It is **not a registered medical device** and is **not** a substitute for clinical judgement. Always verify against the current NICE CKS, BNF/BNFc and local policy. EMIS Web export is **partial / in development** (see notes below).
>
> **Canonical project status lives in [`docs/STATE.md`](docs/STATE.md).** Older dated handovers are in `docs/archive/`.

## 🚀 Key Features

- **Protocol-Driven Actioning**: Over 50 standard blood tests with NICE-aligned clinical guidance.
- **Diabetes Management**: Automated interpretation of HbA1c (Prediabetes, T2DM diagnosis, and intensification triggers).
- **Lipid & CVD Risk**: Integrated **QRISK3 Calculator** that can simulate EMIS data imports.
- **Antenatal & Viral Screening**: Safe interpreting of HIV, Syphilis, Hep B, and Varicella (Chickenpox) in pregnancy.
- **Immunology & Allergy**: Grade-based interpretation of Specific IgE (RAST) and post-vaccination immunity checks (Anti-HBs).
- **Tumour Markers**: Age-specific PSA thresholds and NICE 2WW referral prompts for CA125, CA19-9, etc.
- **EMIS export (partial / in development)**: Downloadable XML protocol scaffold. **Only a handful of blood tests currently carry EMIS read codes** — the remaining 91 are flagged as TODO in `blood_tests_protocol.json`. Full result-filing automation is not yet delivered.
- **Learning Topics**: Searchable clinical learning summaries (derived from educational transcripts; source licensing to be confirmed before public/commercial redistribution).
- **Decision Tools**: **894** clinical decision tools by system (down from 1,574 on 2026-10-11 — tools whose plan text was identical to five or more others were merged into one representative; the retired titles still work in search). **40 tools carry fully specific, per-tool management plans** (drugs, doses, referral thresholds, named NICE CKS/BNF sources); 41 representatives are honestly labelled *Shared plan … (needs specific content)* and are the current backlog. Live numbers: `docs/CENSUS.md`.
- **Clinical Calculators**: Dedicated section for **QRISK3**, **NEWS2**, **Wells Score (DVT)**, and **CURB-65**, with contextual links from the clinical dashboard.
- **Dermatology Refinement**: Highly specific management plans for **Psoriasis**, **Scalp conditions**, **Acne**, **Fungal infections**, and **Actinic Keratosis**, aligned with NICE CKS and PCDS.

## 📁 Project Structure

- `/app`: **The canonical web application** — `index.html`, `style.css`, `main.js`, `sandbox-main.js`, `voice-triage.js`, and `app/data/` (runtime clinical data). This is what Vercel serves.
- `/app/data` is the **only** data directory (the `/data` mirror was removed 2026-10-11 after it drifted). `merged_tools.json` records every merged tool and what it merged into; `tools-index.json` carries aliases for search.
- `/scripts`: `build-decision-tools.js` (sources + `tool-overrides.json` → `app/data/decision_tools_protocol.json`; merges template-shared plans), `tool-overrides.json` (**per-tool curated plans — the place to add real content**), `census-specificity.js` (`npm run census`; `npm test` fails if generic content rises or curated content falls — `census-ceiling.json`), `validate-data.js`, plus transcription helpers.
- `/emis_templates`: EMIS Web XML. `PathLinks_Complete_Protocol.xml` is the real protocol; `PathLinks_V23.xml` is an empty stub.
- `/docs`: **`STATE.md` (canonical status)**, EMIS setup guide, clinical protocol, audits; dated handovers in `docs/archive/`.

**Deploy:** Vercel serves from the repo root but `vercel.json` **rewrites all non-`/api` routes into `/app`**, so the live app is `app/index.html` + `app/main.js`. (The old duplicate root `index.html`/`script.js` were removed on 2026-06-14 — do not recreate them.) Run `npm test` before deploying.

## 🛠️ How to Use

1. **Dashboard**: Open `http://localhost:3000` to access the clinical analysis tool.
2. **Actioning**: Select a category and parameter, enter the value, and follow the clinical checklist.
3. **Protocols**: Browse all tests and click **View Guidance** for full protocol text.
4. **Learning topics**: Search and read clinical learning summaries (if `knowledge_base.json` is present).
5. **EMIS export (partial)**: A protocol XML can be downloaded, but read-code mapping is incomplete — see `docs/STATE.md` before relying on it.

> **Decision-tool evidence text:** the transcript-derived `evidence` field was removed on 2026-06-14 for IP/quality reasons. Tools now ship curated NICE-aligned management steps only. `npm test` enforces that no transcript text or `[Name]` tokens return.

### Extracting knowledge from USB MP3s

With the USB drive connected (e.g. at `/Volumes/NO NAME`):

1. **Parse filenames**: `node scripts/parse-mp3-topics.js "/Volumes/NO NAME"`
2. **Transcribe** (requires [ffmpeg](https://ffmpeg.org) and Python):  
   `python -m venv .venv && .venv/bin/pip install -r requirements.txt`  
   then  
   `.venv/bin/python scripts/transcribe_mp3_to_knowledge.py "/Volumes/NO NAME"`  
   Use `--limit 5` to test; omit for full run. See **docs/KNOWLEDGE_EXTRACTION.md** for details.

## 📋 Version History

- **V2.3 (2026-10-11)**: Quality over count. Merged 662 template-shared tools into 76 representatives (1,574 → 887); added per-tool override layer and 114 curated plans across all 19 systems (every shared-plan placeholder replaced) (NICE CKS/BNF, awaiting clinician sign-off); census gate in `npm test`; single data directory; Foreman working method (`CLAUDE.md`, `docs/WORKING_RULES.md`, `docs/OWNER_RULINGS.md`).

- **V2.2 (2026-06-14)**: Remediation pass — removed transcript-derived evidence text and `[Name]` tokens; added data provenance/review metadata; expanded drug interactions to 82 pairs; added a healthcare-professional access gate and stronger disclaimers; scaffolded EMIS code fields; added `npm test` data validation; removed dead duplicate root files; consolidated docs (`docs/STATE.md`).
- **V2.1**: Learning topics from USB MP3s—parse filenames, transcribe with Whisper, search and read transcripts in-app; protocol View Guidance modal.
- **V2.0**: Massive expansion into Antenatal, Vaccination Immunity, and RAST Allergy testing.
- **V1.9**: Added Diabetes Management (HbA1c) and NG28 escalation logic.
- **V1.8**: Integrated QRISK3 Calculator and EMIS data simulation.
- **V1.7**: Added Lipids expansion and fixed Tumour Marker age-specific logic.

---
*Developed for PathLinks Clinical Governance.*
