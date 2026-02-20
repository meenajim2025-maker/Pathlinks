# Context for next agent – resume work here

**Last updated:** 2025-02-16  
**Purpose:** Read this file first so the next agent can continue without losing context.

---

## 1. What this project is

**PathLinks** is a UK GP clinical decision support web app. It includes:

- **Clinical decision tool (dashboard):** Blood test actioning (select test, enter value → NICE-aligned guidance, EMIS coding).
- **Decision tools:** ~1900 tools by system (cardiovascular, dermatology, mental-health, gastroenterology, endocrinology, musculoskeletal, respiratory, paediatrics, renal-urology, women-health, infectious, neurology, haematology, ent, procedures-general, other). Each tool has **real NICE-based management** (drugs, doses, referral). No generic “see guidelines”.
- **Protocols:** Browse all blood tests and view full protocol text.
- **Learning library:** Search/read transcript content (from USB MP3 extraction) if `knowledge_base.json` is present.
- **EMIS Integration:** Download XML for EMIS Web.

**Live app:** https://pathlinks-clinical.vercel.app  
**Repo:** PathLinks Clinical (this workspace). Deploy is via Vercel from repo root.

---

## 2. What was done in this session (so you can continue)

- **Forensic audit:** Identified that “sore throat below cow’s milk allergy” etc. were **ordering/discoverability** issues, not wrong system. Doc: `docs/FORENSIC_AUDIT_DECISION_TOOLS.md`.
- **Decision tools build:** Tools are **sorted A–Z by title** within each system in `scripts/build-decision-tools.js`.
- **Topic filter:** “Filter topics (type to narrow)” in Decision tools; topic dropdown filters by text and shows “Showing X of Y topics”.
- **Search all systems:** “Search all systems” box at top of Decision tools; type 2+ chars → dropdown of matches (title + system); click a result → that topic opens with **correct management plan** (fix: we no longer rely on system/tool change handlers; we set system, populate full topic list, then render the panel from the **same tool object** we clicked, so the right condition’s plan always shows).
- **Misplaced topics:** In `scripts/extra-tools-bulk-1000.json`, “Restless legs” and “Narcolepsy” were moved from `mental-health` to `neurology`.
- **Deploy:** Deployed to Vercel with `npx vercel --prod --yes`.

**Committed (earlier):** A–Z sort, topic filter, Search all systems UI, Restless legs/Narcolepsy fix, audit doc.  
**Management plan audit:** Topic-specific templates added (chest pain, pericarditis, syncope, Addison’s, goitre, ENT/gastro/paeds, etc.); system fallbacks for endo/renal/ENT/neuro/haematology; “dermatology”/“skin condition” at end of list. **Final step:** single generic catch-all replaced with **system-specific consultant-grade plans** per system (cardiovascular, dermatology, gastro, paediatrics, etc.). **0 tools** now on generic plan; every tool has topic-specific or system-specific plan. See `docs/MANAGEMENT_PLAN_AUDIT_SENIOR_CONSULTANT.md`.  
**Device authorisation:** Vercel-style user code (XXXX-XXXX) and URL `/oauth/device.html?user_code=...`; nav “Device authorisation” and `oauth/device.html`.  
**Handover:** `docs/HANDOVER_NEXT_AGENT.md` – short handover for the next agent. All changes committed (see latest commit).

---

## 3. Project layout (key paths)

| Path | Purpose |
|------|--------|
| `app/` | Core web app: `index.html`, `style.css`, `script.js`. Uses `app/data/` for JSON. |
| Root | Same app served from repo root for Vercel: `index.html`, `style.css`, `script.js`; uses `data/` (see vercel.json if needed). |
| `data/` | `blood_tests_protocol.json`, `decision_tools_protocol.json` (built), `knowledge_base.json` (optional, from USB/scripts). |
| `app/data/` | Copy of data for app; must have `decision_tools_protocol.json` (and optionally knowledge_base) for full features. |
| `scripts/build-decision-tools.js` | Builds `data/decision_tools_protocol.json` from knowledge_base, nice map, management-content, extra-nice-tools, extra-tools-bulk, extra-tools-bulk-1000. **Sorts tools A–Z** per system. |
| `scripts/management-content.json` | Topic-specific NICE steps (keywords + steps). Fallback is system-specific steps in build script. |
| `scripts/extra-tools-bulk-1000.json` | Bulk conditions: `tools: [{ systemId, title }, ...]`. |
| `docs/DECISION_TOOLS_CONTEXT.md` | How to add conditions, rebuild, deploy. |
| `docs/FORENSIC_AUDIT_DECISION_TOOLS.md` | Audit: ordering, filter, search, placement, knowledge base. |
| `docs/MANAGEMENT_PLAN_AUDIT_SENIOR_CONSULTANT.md` | Senior consultant audit; all tools now topic- or system-specific (0 generic plan). |
| `docs/HANDOVER_NEXT_AGENT.md` | **Handover to next agent** – read this first when resuming. |
| `oauth/device.html` | Device authorisation page (Vercel-style code + URL). |

---

## 4. Commands to know

- **Build Decision tools:**  
  `node scripts/build-decision-tools.js`  
  then  
  `cp data/decision_tools_protocol.json app/data/`
- **Run locally:** e.g. `npx serve .` or open `index.html` / `app/index.html` in browser.
- **Deploy:**  
  `npx vercel --prod --yes`
- **Anonymize transcripts (before deploy if KB changed):**  
  `python3 scripts/anonymize_transcripts.py`  
  then copy `data/knowledge_base.json` to `app/data/` if the app uses it.

---

## 5. Current repo state (at handoff)

- **Committed:** All session work (Decision tools UX, management audit and system-specific catch-all, device auth, vercel.json, oauth/, handover doc). See latest commit message.
- **Untracked (optional):** `app/data/clinical_topics_learning.json`, `app/data/knowledge_base.json`, `data/clinical_topics_learning.json`, `data/knowledge_base.json` – from USB/transcription; add or .gitignore as you prefer. Do not commit `.cursor/`.

**Next agent:** Read `docs/HANDOVER_NEXT_AGENT.md` first, then this file for full context.

---

## 6. Where to read more

- **Decision tools (add conditions, management, rebuild):** `docs/DECISION_TOOLS_CONTEXT.md`
- **Audit and design decisions:** `docs/FORENSIC_AUDIT_DECISION_TOOLS.md`
- **Project overview and features:** `README.md`

Use this file as the single entry point for context when resuming the project.
