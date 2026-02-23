# Handover to next agent

**Date:** 2026-02-23  
**Read this first** when resuming work on PathLinks. Full context: `HANDOVER.md` at repo root.

---

## What is PathLinks?

UK GP clinical decision support web app: blood test actioning, **Decision tools** by system with NICE/Royal College–based management, Drug interactions, Education Sandbox, Protocols. Deployed on Vercel.

**Live:** https://pathlinks-clinical.vercel.app  
**Deploy:** `npx vercel --prod --yes` from repo root (no git remote; deploy via Vercel CLI).

**Important:** After any change that affects the app (data, templates, UI), **commit to local git then run `npx vercel --prod --yes`** so the user sees updates.

---

## Current state (23 Feb 2026)

- **Decision tools:** **1574 tools**. Built by `node scripts/build-decision-tools.js`. Sources: `data/knowledge_base.json`, `scripts/management-content.json`, `scripts/nice-guideline-map.json`, `scripts/extra-tools-bulk.json`, `scripts/extra-tools-bulk-1000.json`. Output: `data/decision_tools_protocol.json` and `data/tools-index.json` (copied to `app/data/`).
- **Sections** include: cardiovascular, dermatology, mental-health, gastroenterology, endocrinology, musculoskeletal, respiratory, paediatrics, renal-urology, women-health, infectious, neurology, haematology, ent, procedures-general, other, pain-management, **triage**, **ophthalmology** (from extra-tools-bulk).
- **System guidance & fallbacks:** In `scripts/build-decision-tools.js`: `SYSTEM_GUIDANCE` (consultant-standard options per system) and `getSystemFallbackSteps(systemId, title)` (used when no template matches). **Other clinical topics** and **GP Triage** and **Ophthalmology** have dedicated guidance and fallback options (RCOphth for eye; NICE/NHS 111/WHO IITT/RCGP/RACGP for triage).
- **Templates:** `scripts/management-content.json` – **first keyword match** on tool title wins; put **specific** templates before **broad** ones. Use phrases, not single broad words (e.g. avoid bare "child").
- **Protocol cache:** App loads `decision_tools_protocol.json?v=...` in `app/main.js`. Bump `?v=` after rebuilding the protocol so clients get the new file.

---

## Key files

| File | Role |
|------|------|
| `scripts/management-content.json` | Topic-specific templates; first keyword match; order matters. |
| `scripts/build-decision-tools.js` | Builds protocol; contains SYSTEM_GUIDANCE and getSystemFallbackSteps. |
| `data/decision_tools_protocol.json` | Built output; also copied to `app/data/`. |
| `app/data/decision_tools_protocol.json` | What the live app loads. |
| `app/main.js` | Loads protocol with `?v=...`; Decision tools UI; nav. |
| `app/index.html` | Main UI; keep root `index.html` in sync for Vercel `/`. |
| `vercel.json` | Rewrites `/` → `/app/index.html`; cache headers. |
| `HANDOVER.md` | Full handover, structure, Sandbox notes, deploy. |
| `docs/DECISION_TOOLS_ACCURACY_AUDIT.md` | Template audit and keyword rules. |

---

## Commands

- **Rebuild Decision tools:** `node scripts/build-decision-tools.js` (writes to `data/` and copies to `app/data/`)
- **Bump protocol cache:** In `app/main.js`, change the `?v=N` query on the protocol URL
- **Deploy:** `npx vercel --prod --yes`

---

## Repo state at handover

- **Committed:** All session work (Other clinical topics, GP triage international refs, ophthalmology RCOphth, HANDOVER updates). Latest commit includes handover doc updates.
- **Untracked:** `.cursor/` (local IDE – do not commit).
- **No git remote.** Deploy only via `npx vercel --prod --yes`.

---

## Suggested next steps (optional)

- Add or refine templates in `scripts/management-content.json` for new tool titles; rebuild; bump protocol version; deploy.
- If a tool shows wrong content: add a **more specific** template (matching that title) **before** any broader template that might match.
- Keep root `index.html` in sync with `app/index.html` after UI changes.

---

*End of handover. See `HANDOVER.md` for project structure, Sandbox, and detailed Decision Tools audit.*
