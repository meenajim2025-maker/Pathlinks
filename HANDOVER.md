# Handover summary for next agent

**Date:** February 2026  
**Last updated:** 12 Jun 2026 – Voice triage deployed to Vercel; handover for shutdown. **Next agent: read `docs/HANDOVER_NEXT_AGENT.md` first.**

**Latest (12 Jun 2026):** **Voice triage** live at https://pathlinks-clinical.vercel.app — STT, LLM disposition (999 / same-day / 24–48h / self-care), TTS; serverless API at `/api/voice-triage/*`; `PATHREADY_API_KEY` on Vercel Production. Deploy via prebuilt + `vercel@43.3.0` (see `docs/DEPLOY_VERCEL.md`). Session snapshot: `docs/HANDOVER_2026-06-12.md`.

**Earlier (23 Feb 2026):** **Other clinical topics** – SYSTEM_GUIDANCE.other + fallback (deprescribing, frailty, capacity/LPA, travel/medicolegal). **GP Triage** – SYSTEM_GUIDANCE.triage + steps with NICE NG51/253–255, CG176, NG143, NG10, NHS 111, WHO IITT, RCGP, RACGP; topic triage evidence updated. **Ophthalmology** – New SYSTEM_GUIDANCE.ophthalmology + fallback (RCOphth Emergency Eye Care); red eye/conjunctivitis/emergencies/general eye templates; nice-guideline-map. **Deploy:** `npx vercel --prod --yes`; live https://pathlinks-clinical.vercel.app. Earlier: New **Drug interactions** section (paste drug list → check vs BNF-style data in `app/data/drug_interactions.json`). **Triage-specific pathways** for wound – severe, head injury, collapse/unconscious, mental health – crisis with yes/no steps and short synopses (what counts as 999, same-day, etc.). Generic triage is 4-step yes/no. Management templates support **matchAll** so only the right title gets each pathway. See **`docs/HANDOVER_2026-02-22.md`** for details.

**Context:** User reported Education Sandbox (Clinical Sandbox) as non-functional across multiple browsers. Multiple fix attempts were made. Later: UI was reverted to a simpler layout; then a full audit of Decision Tools was done to fix wrong management options and duplication. Latest: alcohol pathways split, prophylaxis/domestic violence/falls fixed; “other clinical topics” replaced with specific evidence-based plans; senior-doctor critical pass (safeguarding, refeeding, concussion, deprescribing, LPA, etc.); **Child abuse – recognition** bug fixed (was showing fever traffic light—fever template had keyword “child”; now dedicated child-abuse template, fever keywords narrowed to phrases).

**UI reversion:** Sidebar restored (Dark Mode toggle, "Education Sandbox"). Decision tools: search + system + topic filter + topic select, single tool panel (no NICE filter, exports, back/prev/next/random/print, red flags, copy). Sandbox: "Clinical Sandbox Mode", two-column simulation, "End Simulation & Grade" / "Cancel Case" / "Return to Menu". Root `index.html` kept in sync with `app/index.html`.

**Decision Tools accuracy (latest):** Broad template keywords were narrowed and specific templates added so tools no longer get wrong content (e.g. Renal colic → CKD, Post-MI → wellbeing, PR examination → joint exam). **Other clinical topics:** Generic dropdown replaced with topic-specific templates (deprescribing, frailty, malnutrition, polypharmacy, sarcopenia, cachexia, travel, vitamins/minerals, hydration, homeless/asylum/care home, complementary, doping, concussion, occupational health, prison, medicolegal, LPA, multimorbidity, vulnerable adult, jet lag, insurance, lifestyle diet, neuropathic gabapentin/pregabalin, gold standard framework/capacity). `other-misc-mgt` has `keywords: []`; unmatched “other” tools use system fallback. **Child abuse:** Dedicated template for “Child abuse – recognition” / child protection (NICE NG76, CKS, Working Together); fever template keywords changed from single-word “child”/“fever”/“under 5” to phrases (“fever in under-5s”, “fever – under 5”, “fever – traffic light”, “fever – neonatal”) so “Child abuse” no longer matches fever. See **Decision Tools build & audit** below and `docs/DECISION_TOOLS_ACCURACY_AUDIT.md`.

---

## Current project structure (relevant to Sandbox, Decision Tools & deploy)

- **`app/`** – Main app used in production:
  - `app/index.html` – Full UI (dashboard, Decision tools, Calculators, **Education Sandbox**), embeds `#sandbox-scenarios-json`, loads `main.js` and `sandbox-main.js`.
  - `app/main.js` – Main app logic (renamed from `script.js`). **Nav is set up first** (before any async fetch) so Sandbox tab and others work even if dashboard data fails.
  - `app/sandbox-main.js` – Sandbox logic (renamed from `sandbox.js`). Reads scenarios from embedded `#sandbox-scenarios-json` first, then falls back to `fetch('./data/sandbox_scenarios.json')`. Calls `initSandbox()` on load (if DOM ready) and is also invoked when user clicks Sandbox nav.
  - `app/data/sandbox_scenarios.json` – Scenario data (also embedded in HTML for reliability).
- **`app/data/`** – Runtime data for the app:
  - `decision_tools_protocol.json` – **Built** from scripts (see below). ~**1574 tools**; ophthalmology section; Other clinical topics and GP triage use improved system guidance and fallbacks. Protocol: bump `?v=` in `app/main.js` after protocol changes. Audit: `docs/DECISION_TOOLS_ACCURACY_AUDIT.md`. Formerly: 1510 tools; protocol loaded by `main.js` with cache-bust query (e.g. `?v=10`).
  - `tools-index.json` – Built with protocol; used for search/index.
  - `sandbox_scenarios.json` – Sandbox scenario definitions (also embedded in HTML).
- **Root** – Used by Vercel for `/`:
  - `index.html` – **Copy of `app/index.html`**. **Keep in sync with `app/index.html` when the app UI changes.**
  - `script.js`, `sandbox.js`, `style.css` – Legacy; Vercel may serve these if paths are requested.
  - `index-root-backup.html` – Backup of original root index.

---

## Decision Tools build & audit

- **Build command:** `node scripts/build-decision-tools.js`  
  Reads: `data/knowledge_base.json`, `scripts/nice-guideline-map.json`, `scripts/management-content.json`, `scripts/extra-nice-tools.json`, `scripts/extra-tools-bulk.json`, `scripts/extra-tools-bulk-1000.json`.  
  Writes: `data/decision_tools_protocol.json`, `data/tools-index.json`, then copies both to `app/data/`.

- **Management content:** `scripts/management-content.json`  
  Templates are matched by **first keyword match** (word boundary) on the tool title. Order matters: specific templates must appear before broad ones (e.g. "renal colic" before "ckd"/"renal").

- **Accuracy audit (done):**  
  Broad keywords were narrowed (CKD: removed "renal"; joint-exam: removed bare "examination"; wellbeing: removed "support"/"prevention"). New/specific templates added: renal colic & renal stone, post-MI, post-stroke, renal artery stenosis, renal cell cancer, vasculitis–renal, pressure ulcer, falls prevention, prescribing dependence NG215, PR examination; heart sounds/cardiac examination and primary prevention/QRISK3 added to existing templates.  
  **Alcohol:** Split so each pathway has its own management (brief advice, AUDIT, harmful use, dependence, detox/withdrawal, liver, pancreatitis, neuropathy – alcohol).  
  **Prophylaxis:** Endocarditis template narrowed to "endocarditis"/"infective endocarditis"; separate templates for varices, malaria, meningococcal, pertussis prophylaxis.  
  **Domestic violence:** Dedicated template (safeguarding, PH50, NG76) for domestic violence, honour-based violence, elder abuse, FGM.  
  **Falls – intervention:** Dedicated template (multifactorial assessment, CG161, NG231) for falls – intervention/risk/multifactorial/orthostatic/bone health.  
  **Other clinical topics:** Specific templates added for deprescribing (general + antihypertensive, antipsychotic, benzodiazepine, PPI, statin), frailty, malnutrition, polypharmacy, sarcopenia, cachexia, travel, vitamin/mineral, hydration, homeless/asylum/care home, complementary therapy, doping, sport concussion, occupational health, prison, medicolegal, LPA, multimorbidity, vulnerable adult, jet lag, insurance, lifestyle diet, neuropathic gabapentin/pregabalin, gold standard framework/capacity. Senior-doctor critical pass: safeguarding (MARAC, refeeding, concussion red flags, deprescribing taper, LPA verify OPG, etc.). `other-misc-mgt` has `keywords: []` so it never matches; true catch-all uses system fallback.  
  **Child abuse:** Template for child abuse/child protection/safeguarding – child (NICE NG76, CKS, Working Together). Fever-in-under-5s template keywords narrowed to phrases only (no bare “child”) so “Child abuse – recognition” does not match fever.  
  Full list and verification: **`docs/DECISION_TOOLS_ACCURACY_AUDIT.md`**.

- **After changing management-content or sources:** Run `node scripts/build-decision-tools.js`, then bump the protocol cache query in `app/main.js` (e.g. `?v=11`) so clients load the new protocol.

---

## What was wrong (findings)

1. **Vercel serves root `index.html` for `/`**  
   Rewrites in `vercel.json` send `/` → `/app/index.html` and `/(.*)` → `/app/$1`, but for the root URL, a **static file** at root takes precedence, so the browser was receiving the **root** `index.html`, not `app/index.html`.

2. **Root HTML pointed at wrong scripts**  
   Root `index.html` referenced `script.js` and `sandbox.js`. Those exist at **root** in the repo, so Vercel served them for `/script.js` and `/sandbox.js`. The **app** logic (nav-first, sandbox with embedded data) lives in `app/main.js` and `app/sandbox-main.js`, so it never ran.

3. **Sandbox depends on both**  
   - Nav handler in `main.js` must run (so Sandbox tab switches view and calls `initSandbox()`).  
   - `initSandbox()` in `sandbox-main.js` must run and get scenarios (embedded in page or from `app/data/sandbox_scenarios.json`).

**Fix applied:** Root `index.html` was replaced with a copy of `app/index.html`, so the live page now loads `main.js` and `sandbox-main.js` and includes the embedded `#sandbox-scenarios-json`. Verification: `curl` of live site showed `src="main.js"`, `src="sandbox-main.js"`, and `id="sandbox-scenarios-json"`. User still reported “still nothing,” so either caching/device or another runtime issue may remain.

---

## Deployment (Vercel)

- **Project:** pathlinks-clinical (see `.vercel/project.json`).
- **Account:** meenajim2025@gmail.com
- **Deploy:** See `docs/DEPLOY_VERCEL.md`. Recommended: `npx vercel build --prod --yes` then `npx vercel@43.3.0 deploy --prebuilt --prod --yes`.
- **Live URL:** https://pathlinks-clinical.vercel.app
- **`vercel.json`:** Rewrites `/` → `/app/index.html`; `/api/*` excluded from app rewrite; cache headers for `/data/` and `/app/data/`.

**Important:** Root `index.html` is what gets served for `/`. Keep it in sync with `app/index.html` after any app UI changes (e.g. copy `app/index.html` to `index.html`).

---

## Suggested next steps for next agent

1. **Confirm what the user sees**  
   e.g. Blank sandbox area, “Loading scenarios…”, no tab switch, console/network errors. That will say whether the problem is: wrong HTML/scripts still cached, JS error, or something else (e.g. CSS hiding the panel).

2. **Test locally**  
   Serve `app/` only (e.g. `cd app && python3 -m http.server 3333`) and open `/`, then open Education Sandbox. If it works locally, the issue is deployment/caching/root index; if not, the issue is in `main.js` / `sandbox-main.js` or DOM (e.g. missing IDs or wrong view toggling).

3. **If deployment is the issue**  
   - Ensure root `index.html` is identical to `app/index.html` (or generated from it in a build step).  
   - Consider setting Vercel **Root Directory** to `app` in the project settings so only `app/` is deployed and there is no root/index confusion.

4. **If Sandbox still doesn’t run**  
   - In `app/main.js`, confirm the nav click handler runs for `#nav-sandbox` and calls `initSandbox` (and that `initSandbox` is defined when the handler runs, i.e. `sandbox-main.js` loads after `main.js`).  
   - In `app/sandbox-main.js`, confirm `initSandbox()` runs (on load and/or on nav click), finds `#sandbox-scenario-list` and `#sandbox-scenarios-json`, parses the JSON, and calls `renderSandboxScenarios()`.  
   - Check for script errors in console and failed network requests (e.g. for `main.js` or `sandbox-main.js`).

---

## Key file reference

| Purpose | Path |
|--------|------|
| App entry (real) | `app/index.html` |
| Root entry (deployed for `/`) | `index.html` (copy of app) |
| Main app script | `app/main.js` |
| Sandbox script | `app/sandbox-main.js` |
| Scenario data (file) | `app/data/sandbox_scenarios.json` |
| Scenario data (embedded) | Inside `app/index.html` and root `index.html` in `<script type="application/json" id="sandbox-scenarios-json">` |
| Decision tools protocol (built) | `app/data/decision_tools_protocol.json` (and `data/decision_tools_protocol.json`) |
| Management templates (source) | `scripts/management-content.json` |
| Build script | `scripts/build-decision-tools.js` |
| Decision Tools accuracy audit | `docs/DECISION_TOOLS_ACCURACY_AUDIT.md` |
| Vercel config | `vercel.json` |
| Backup of original root index | `index-root-backup.html` |

---

## Script load order (in both index files)

1. `<script type="application/json" id="sandbox-scenarios-json">...</script>`
2. `<script src="main.js">`
3. `<script src="sandbox-main.js">`

So `main.js` runs first and sets up nav (including Sandbox click); then `sandbox-main.js` defines `initSandbox` and runs it on load. Clicking Sandbox calls `initSandbox()` again.

---

## Save state / Handover checklist

- **Project is saved in local git.** Latest feature: Voice triage (`d512708`). Handover docs updated 12 Jun 2026. **No git remote**—deploy per `docs/DEPLOY_VERCEL.md`. Live: https://pathlinks-clinical.vercel.app
- **Decision Tools:** Rebuilt; **1574 tools**; ophthalmology section; Other clinical topics and GP triage use improved system guidance and fallbacks. Protocol: bump `?v=` in `app/main.js` after protocol changes. Audit: `docs/DECISION_TOOLS_ACCURACY_AUDIT.md`.
- **Root vs app:** Keep `index.html` in sync with `app/index.html` after any UI change.
- **Next agent:** Read **`docs/HANDOVER_NEXT_AGENT.md`** first. For Decision Tools: `scripts/management-content.json` (first keyword match; specific before broad); `scripts/build-decision-tools.js`; rebuild `node scripts/build-decision-tools.js`; bump protocol `?v=` in `app/main.js` if needed. Avoid broad single-word keywords; use phrases or specific terms.

---

End of handover.
