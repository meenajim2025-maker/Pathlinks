# Handover to next agent

**Date:** 2026-06-12  
**Read this first** when resuming work on PathLinks. Full context: `HANDOVER.md` at repo root. Session snapshot: `docs/HANDOVER_2026-06-12.md`.

---

## What is PathLinks?

UK GP clinical decision support web app: blood test actioning, **Decision tools**, **Voice triage**, Drug interactions, Education Sandbox, Protocols. Deployed on Vercel.

**Live:** https://pathlinks-clinical.vercel.app  
**Vercel account:** meenajim2025@gmail.com  
**Deploy:** See `docs/DEPLOY_VERCEL.md` (use prebuilt + `vercel@43.3.0` if blocked).

---

## Current state (12 Jun 2026)

- **Decision tools:** **1574 tools**. Build: `node scripts/build-decision-tools.js`. Sources: `scripts/management-content.json`, `scripts/build-decision-tools.js` (`SYSTEM_GUIDANCE`, fallbacks). Output: `data/` → copied to `app/data/`.
- **Voice triage:** Sidebar tab in `app/index.html`; logic `app/voice-triage.js`; API routes `api/voice-triage/{transcribe,assess,speak}.js`; gateway `api/_lib/gateway.js`. Requires `PATHREADY_API_KEY` on server (set on Vercel Production).
- **AI gateway:** `config/ai-gateways.json` (endpoints only), `scripts/ai-gateway.js`, docs `docs/AI_GATEWAY_SETUP.md`, local `.env` (gitignored).
- **Sections improved:** other, triage, ophthalmology, procedures-general (see `HANDOVER.md`).

---

## Key files

| File | Role |
|------|------|
| `app/index.html` | Main UI (Voice triage tab, Decision tools, etc.) |
| `app/voice-triage.js` | Voice triage frontend |
| `api/voice-triage/*.js` | STT, LLM assess, TTS serverless routes |
| `api/_lib/gateway.js` | Shared gateway + env key |
| `config/ai-gateways.json` | LLM/STT/TTS endpoint config (no secrets) |
| `scripts/management-content.json` | Decision tool templates |
| `scripts/build-decision-tools.js` | Protocol builder |
| `vercel.json` | Rewrites; `/api/*` not rewritten to `/app/` |
| `docs/DEPLOY_VERCEL.md` | Deploy instructions |
| `docs/AI_GATEWAY_SETUP.md` | API key setup |

---

## Commands

```bash
node scripts/build-decision-tools.js          # rebuild decision tools
npx vercel pull --yes --environment=production
npx vercel build --yes --prod
npx vercel@43.3.0 deploy --prebuilt --prod --yes
```

After protocol changes: bump `?v=` in `app/main.js`. After UI changes: sync `index.html` from `app/index.html`.

---

## Repo state

- **Branch:** `main`, no remote
- **Latest feature commit:** `d512708` Voice triage
- **Secrets:** `.env` local only; `PATHREADY_API_KEY` on Vercel Production
- **Do not commit:** `.env`, `.vercel/`, `.cursor/`

---

## Optional follow-ups

- Harden JSON parsing in `api/voice-triage/assess.js` when LLM returns thinking/reasoning before JSON
- Link GitHub in Vercel + verify secondary email so latest CLI deploy works without v43 workaround
- Free disk space on dev machine if deploy commands fail (ENOSPC)

---

*End of handover. See `HANDOVER.md` for full project history and Decision Tools audit.*
