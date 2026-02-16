# Decision tools – context for future sessions

**Last updated:** 2025-02-16

## What this is

- **~1900 decision tools** (systems: cardiovascular, dermatology, mental-health, gastroenterology, endocrinology, musculoskeletal, respiratory, paediatrics, renal-urology, women-health, infectious, neurology, haematology, ent, procedures-general, other).
- Each tool has **real management**: NICE-based steps with **drug names, doses, referral (2WW/routine/emergency)**. No generic “look at guidelines”.
- Sources: (1) learning library × 3 (assessment, management, referral), (2) extra-nice-tools.json, (3) extra-tools-bulk.json (bySystem), (4) **extra-tools-bulk-1000.json** (additional ~900 conditions in same pattern).

## How to add more conditions

1. **Same pattern:** Add entries to `scripts/extra-tools-bulk-1000.json` in the `tools` array: `{"systemId": "cardiovascular", "title": "Condition name"}` (or use `scripts/extra-tools-bulk.json` bySystem arrays).
2. **Topic-specific management:** Add a template in `scripts/management-content.json` under `templates` with `keywords` (match tool title) and `steps` (dropdowns with real drug/referral guidance). If no template matches, the **system fallback** in `scripts/build-decision-tools.js` (`getSystemFallbackSteps(systemId)`) is used – already real drugs and referral per system.
3. **Rebuild:**  
   `node scripts/build-decision-tools.js`  
   then  
   `cp data/decision_tools_protocol.json app/data/`
4. **Deploy:**  
   `npx vercel --prod --yes`

## Key files

| File | Purpose |
|------|--------|
| `scripts/build-decision-tools.js` | Builds data/decision_tools_protocol.json from KB + nice map + management-content + extra-nice-tools + extra-tools-bulk + **extra-tools-bulk-1000** |
| `scripts/management-content.json` | Topic-specific NICE steps (hypertension, AF, COPD, diabetes, depression, UTI, etc.). First keyword match wins. |
| `scripts/extra-tools-bulk-1000.json` | Additional conditions: `tools: [{ systemId, title }, ...]`. ~900 entries. |
| `scripts/extra-tools-bulk.json` | By-system title lists. |
| `scripts/nice-guideline-map.json` | Keyword → NICE NG/CKS refs. |
| `data/decision_tools_protocol.json` | Output; also copied to app/data/ for deploy. |

## Current counts (approx)

- Learning library: 189 topics × 3 = 567
- extra-nice-tools: ~97
- extra-tools-bulk (bySystem): ~334
- extra-tools-bulk-1000: ~894  
- **Total: ~1902**

To add another batch of 1000: add ~1000 items to `extra-tools-bulk-1000.json` (or create `extra-tools-bulk-2000.json` and load it in the build script the same way).
