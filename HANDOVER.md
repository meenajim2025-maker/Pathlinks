# Handover summary for next agent

**Date:** February 2026  
**Last updated:** After Decision Tools “other clinical topics” specific templates, other-misc shrink, commit and push to Vercel.

**Context:** User reported Education Sandbox (Clinical Sandbox) as non-functional across multiple browsers. Multiple fix attempts were made. Later: UI was reverted to a simpler layout; then a full audit of Decision Tools was done to fix wrong management options and duplication. Latest: alcohol pathways split, prophylaxis/domestic violence/falls fixed, and “other clinical topics” replaced with specific evidence-based plans per topic.

**UI reversion:** Sidebar restored (Dark Mode toggle, "Education Sandbox"). Decision tools: search + system + topic filter + topic select, single tool panel (no NICE filter, exports, back/prev/next/random/print, red flags, copy). Sandbox: "Clinical Sandbox Mode", two-column simulation, "End Simulation & Grade" / "Cancel Case" / "Return to Menu". Root `index.html` kept in sync with `app/index.html`.

**Decision Tools accuracy (latest):** Broad template keywords were narrowed and specific templates added so tools no longer get wrong content (e.g. Renal colic → CKD, Post-MI → wellbeing, PR examination → joint exam). **Other clinical topics:** Generic dropdown replaced with topic-specific templates (deprescribing, frailty, malnutrition, polypharmacy, sarcopenia, cachexia, travel, vitamins/minerals, hydration, homeless/asylum/care home, complementary, doping, concussion, occupational health, prison, medicolegal, LPA, multimorbidity, vulnerable adult, jet lag, insurance, lifestyle diet, neuropathic gabapentin/pregabalin, gold standard framework/capacity). `other-misc-mgt` has `keywords: []`; unmatched “other” tools use system fallback. See **Decision Tools build & audit** below and `docs/DECISION_TOOLS_ACCURACY_AUDIT.md`.

---

## Current project structure (relevant to Sandbox, Decision Tools & deploy)

- **`app/`** – Main app used in production:
  - `app/index.html` – Full UI (dashboard, Decision tools, Calculators, **Education Sandbox**), embeds `#sandbox-scenarios-json`, loads `main.js` and `sandbox-main.js`.
  - `app/main.js` – Main app logic (renamed from `script.js`). **Nav is set up first** (before any async fetch) so Sandbox tab and others work even if dashboard data fails.
  - `app/sandbox-main.js` – Sandbox logic (renamed from `sandbox.js`). Reads scenarios from embedded `#sandbox-scenarios-json` first, then falls back to `fetch('./data/sandbox_scenarios.json')`. Calls `initSandbox()` on load (if DOM ready) and is also invoked when user clicks Sandbox nav.
  - `app/data/sandbox_scenarios.json` – Scenario data (also embedded in HTML for reliability).
- **`app/data/`** – Runtime data for the app:
  - `decision_tools_protocol.json` – **Built** from scripts (see below). ~1510 tools; protocol loaded by `main.js` with cache-bust query (e.g. `?v=10`).
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
  **Other clinical topics:** Specific templates added for deprescribing (general + antihypertensive, antipsychotic, benzodiazepine, PPI, statin), frailty, malnutrition, polypharmacy, sarcopenia, cachexia, travel, vitamin/mineral, hydration, homeless/asylum/care home, complementary therapy, doping, sport concussion, occupational health, prison, medicolegal, LPA, multimorbidity, vulnerable adult, jet lag, insurance, lifestyle diet, neuropathic gabapentin/pregabalin, gold standard framework/capacity. `other-misc-mgt` has `keywords: []` so it never matches; true catch-all uses system fallback.  
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
- **Deploy:** `npx vercel --prod` or `npm run deploy`.
- **Live URL:** https://pathlinks-clinical.vercel.app
- **`vercel.json`:** Rewrites `/` → `/app/index.html`, `/(.*)` → `/app/$1`; cache headers for `/data/` and `/app/data/`.

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

- **Project is saved in local git.** All edits committed (commit: Decision Tools specific templates, other-misc shrink, handover). **No git remote is configured**—to push to Vercel, add your repo as `origin` and run `git push -u origin main`, or deploy with `npx vercel --prod` from the project root.
- **Decision Tools:** Rebuilt; 1510 tools; wrong matches fixed; alcohol/prophylaxis/domestic violence/falls/other-clinical specific templates in place; `other-misc-mgt` keywords emptied; audit doc at `docs/DECISION_TOOLS_ACCURACY_AUDIT.md`.
- **Root vs app:** Keep `index.html` in sync with `app/index.html` after any UI change.
- **Next agent:** For Sandbox issues, follow "Suggested next steps" above. For Decision Tools, see `docs/DECISION_TOOLS_ACCURACY_AUDIT.md` and `scripts/management-content.json`; rebuild with `node scripts/build-decision-tools.js` after template/source changes and bump protocol `?v=` in `app/main.js` if needed. Optional: add COPD-specific malnutrition template if “Malnutrition in people with chronic obstructive pulmonary disease” needs different content from general malnutrition.

---

End of handover.
