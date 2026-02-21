# Handover to next agent

**Date:** 2025-02-21  
**Read this first** when resuming work on PathLinks. For full context, read `docs/AGENT_CONTEXT_RESUME.md`.

---

## What is PathLinks?

UK GP clinical decision support web app: blood test actioning, **1920 Decision tools** by system with NICE-based management, Protocols, Learning library, EMIS Integration, Device authorisation (Vercel-style code + URL).

**Live:** https://pathlinks-clinical.vercel.app  
**Deploy:** `npx vercel --prod --yes` from repo root.

**Important:** After any change that affects the app (data, templates, UI), **commit then deploy to Vercel** so the user can see updates. They do not use localhost.

---

## Current state (shutdown handover)

- **Decision tools:** **1920 tools**, **all** have a **topic-specific** template. **0** use the system fallback. Audit: `node scripts/audit-all-sections-fallback.js` (expect 0 on fallback).
- **Templates:** `scripts/management-content.json` – first keyword match wins. **DKA** and **Verification of death** have correct emergency/procedure content; **Type 1 diabetes – DKA** shows DKA management (admit, fluids, insulin, K+), not HbA1c/drug choice.
- **Protocol cache:** App fetches `decision_tools_protocol.json?v=5`; bump version in `app/script.js` when protocol changes.
- **Vercel:** All changes deployed; live at https://pathlinks-clinical.vercel.app.

---

## Key files (do not lose)

| File | Role |
|------|------|
| `scripts/management-content.json` | Topic-specific templates (DKA, Verification of death, endocrine, procedures, derm, gastro, etc.). First keyword match wins. |
| `scripts/build-decision-tools.js` | Builds `data/decision_tools_protocol.json`; contains system-specific fallbacks (used only when no template matches). |
| `data/decision_tools_protocol.json` | Built output; **copy to `app/data/`** after build. |
| `app/data/decision_tools_protocol.json` | What the live app loads. |
| `app/script.js` | Loads protocol with `?v=5`; Decision tools UI. |
| `docs/FORENSIC_AUDIT_ALL_SECTIONS.md` | Full audit: all sections, 0 on fallback. |
| `scripts/audit-all-sections-fallback.js` | Lists tools on fallback; run after build. |
| `docs/AGENT_CONTEXT_RESUME.md` | Full project context and layout. |
| `oauth/device.html` | Device authorisation page. |

---

## Commands

- **Rebuild Decision tools:** `node scripts/build-decision-tools.js` then `cp data/decision_tools_protocol.json app/data/`
- **Audit (check fallback count):** `node scripts/audit-all-sections-fallback.js`
- **Deploy:** `npx vercel --prod --yes`

---

## Repo state at handover

- **Committed:** All session work (DKA template, Verification of death, full forensic audit, all 1920 topic-specific, cache v5). See recent commits.
- **Untracked:** `.cursor/` (local IDE – do not commit).

---

## Suggested next steps (optional)

- Add or refine topic-specific templates in `scripts/management-content.json` if any new tool titles are added; rebuild, copy to `app/data/`, bump cache version, deploy.
- If user reports wrong content for a tool: add a **more specific** template (with keywords that match that title) **before** any broader template that might match it (e.g. DKA before generic diabetes).

---

*End of handover. Use `docs/AGENT_CONTEXT_RESUME.md` for detailed paths and history.*
