# Handover to next agent

**Date:** 2025-02-16  
**Read this first** when resuming work on PathLinks. For full context, also read `docs/AGENT_CONTEXT_RESUME.md`.

---

## What is PathLinks?

UK GP clinical decision support web app: blood test actioning, **~1920 Decision tools** by system with NICE-based management, Protocols, Learning library, EMIS Integration, Device authorisation (Vercel-style code + URL).

**Live:** https://pathlinks-clinical.vercel.app  
**Deploy:** `npx vercel --prod --yes` from repo root.

**Important:** After making any changes that affect the app (data, scripts, UI), **always deploy to Vercel** so the user can see the changes. They do not have another way to view updates (e.g. localhost is not used). Commit first, then run `npx vercel --prod --yes`.

---

## What was completed (this session)

1. **Decision tools UX**  
   - Tools sorted A–Z within each system.  
   - Topic filter (“Filter topics”) and “Search all systems” with correct management plan on click.  
   - Restless legs / Narcolepsy moved to neurology in bulk data.

2. **Management plans – no generic plan left**  
   - **Senior consultant audit** (`docs/MANAGEMENT_PLAN_AUDIT_SENIOR_CONSULTANT.md`): analysed all tools; added many topic-specific templates and system-specific fallbacks.  
   - **Final change:** the single generic “Holistic Management Plan” catch-all was **replaced by system-specific consultant-grade plans**. Every tool now has either a **topic-specific** template (from `management-content.json`) or a **system-specific** plan (cardiovascular, dermatology, ENT, gastro, paediatrics, etc.) with NICE-referenced content. **0** tools use a one-size-fits-all generic plan.

3. **Device authorisation**  
   - Vercel-style flow: user code (XXXX-XXXX) and URL `/oauth/device.html?user_code=...`.  
   - Nav item “Device authorisation”; page at `oauth/device.html`.

4. **Vercel**  
   - `vercel.json` updated (cache headers for `/data/` and `/app/data/`).

---

## Key files (do not lose)

| File | Role |
|------|------|
| `scripts/build-decision-tools.js` | Builds decision tools; contains **system-specific catch-all** plans (no generic plan). |
| `scripts/management-content.json` | Topic-specific templates (first keyword match wins). Broad “dermatology”/“skin condition” at end. |
| `data/decision_tools_protocol.json` | Built output; copy to `app/data/` after build. |
| `docs/MANAGEMENT_PLAN_AUDIT_SENIOR_CONSULTANT.md` | Audit, recommendations 1–5, QA counts. |
| `docs/AGENT_CONTEXT_RESUME.md` | Full project context and layout. |
| `oauth/device.html` | Device auth page. |

---

## Commands

- **Rebuild Decision tools:** `node scripts/build-decision-tools.js` then `cp data/decision_tools_protocol.json app/data/`
- **Deploy:** `npx vercel --prod --yes`

---

## Repo state at handover

- **Committed:** All changes from this session (see commit message).  
- **Optional untracked:** `data/knowledge_base.json`, `app/data/knowledge_base.json` (from USB/transcription) – add or .gitignore as you prefer.  
- **Do not commit:** `.cursor/` (local IDE).

---

## Suggested next steps (optional)

- Add more topic-specific templates in `management-content.json` to match more condition titles (reduces use of system-specific catch-all).  
- Deploy to Vercel after pull so live app reflects latest management plans and device auth.

---

*End of handover. Use `docs/AGENT_CONTEXT_RESUME.md` for detailed paths and history.*
