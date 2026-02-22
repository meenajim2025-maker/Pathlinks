# Decision Tools – Accuracy Audit

This document summarises the audit and fixes applied to improve **accuracy** and reduce **wrong management options** and **duplication** across all sections of the decision tools protocol.

## Summary of fixes applied

### 1. Broad template keywords narrowed (wrong matches removed)

| Template | Previous keywords | Change | Reason |
|-----------|-------------------|--------|--------|
| **CKD optimization** | `ckd`, `renal`, `egfr` | Removed `renal`. Now: `ckd`, `chronic kidney`, `egfr` | "Renal colic", "Renal stone", "Renal artery stenosis", "Renal cell cancer", "Vasculitis – renal" were incorrectly getting CKD (ACEi/ARB/SGLT2i/NG203) content. |
| **Joint examination** | `orthopaedic examination`, `examination`, `orthopaedics` | Removed bare `examination`. Now: `orthopaedic examination`, `orthopaedics`, `joint examination`, `musculoskeletal examination` | "Back to basics heart sounds and cardiac examination" and "PR examination" were incorrectly getting orthopaedic joint-exam content. |
| **Wellbeing** | `wellbeing`, `resilience`, `support`, `prevention` | Removed `support` and `prevention`. Now: `wellbeing`, `resilience` | "Post-MI – secondary prevention", "Primary prevention of cardiovascular disease", "Pressure ulcer – prevention", "Bereavement – support", "Falls prevention", "Prescribing medicines... NG215" were incorrectly getting wellbeing overview content. |

### 2. New specific templates added

| Condition / topic | Template ID | Purpose |
|-------------------|-------------|---------|
| **Renal colic / ureteric colic / kidney stone / renal stone** | `renal-colic-mgt` | Correct CKS/NICE NG118 content (pain, imaging, MET, referral) instead of CKD optimization. |
| **Post-MI secondary prevention** | `post-mi-mgt` | Aspirin/statins/beta-blocker/ACEi/cardiac rehab (NG185, NG106, NG172) instead of wellbeing. |
| **Post-stroke (BP target, secondary prevention)** | `post-stroke-mgt` | BP target, antiplatelet, statin, AF (NG128, NG217) – matched before TIA so "Post-stroke – BP target" is correct. |
| **Primary prevention / QRISK3** | (added to existing `statin-decision`) | Keywords `primary prevention`, `qrisk3` so "Primary prevention of cardiovascular disease... QRISK3" gets statin/QRISK content. |
| **Heart sounds / cardiac examination** | (added to existing `echo-mgt`) | Keywords `heart sounds`, `cardiac examination` so cardiac exam topic gets echo/indications content. |
| **Renal artery stenosis** | `renal-artery-stenosis-mgt` | BP, ACEi caution, referral – not CKD optimization. |
| **Renal cell cancer** | `renal-cell-cancer-mgt` | 2WW, haematuria, mass – not CKD. |
| **Vasculitis – renal** | `vasculitis-renal-mgt` | ANCA, nephrology, immunosuppression – not CKD. |
| **Pressure ulcer** | `pressure-ulcer-mgt` | Prevention and treatment (NG179) – not wellbeing. |
| **Falls prevention** | `falls-prevention-mgt` | Multifactorial assessment, exercise, vitamin D (CG161, NG231) – not wellbeing. |
| **Prescribing medicines dependence (NG215)** | `dependence-ng215-mgt` | Tapering, review, shared decision-making – not wellbeing. |
| **PR / rectal examination** | `pr-examination-mgt` | Indication, technique, chaperone, 2WW – not joint examination. |

### 3. Verification

- **Wrong-match check**: No tool now has `ckd-complex-mgmt`, `joint-exam`, `wellbeing-overview`, or `tia-triage` when the title does not relate to CKD, orthopaedic/joint exam, wellbeing/resilience, or TIA/stroke respectively.
- **Build**: `node scripts/build-decision-tools.js` completes; 1510 tools written to `data/decision_tools_protocol.json` and copied to `app/data/`.
- **Sections**: All sections use template-derived steps (no inappropriate fallback); only "PR examination" used procedures fallback and now has a dedicated PR examination template.

## Duplication (by design)

Some conditions appear under two titles because of different sources:

- **Learning library (KB)**: one tool per topic with subtitle "– Management" (e.g. "Actinic keratosis – Management").
- **Bulk / extra tools**: same condition without subtitle (e.g. "Actinic keratosis").

The build deduplicates only by **exact title** (case-insensitive), so both can appear. This is intentional: one is the condition name, the other the management-focused variant. If you want a single tool per condition, the build would need to normalise titles (e.g. strip " – Management") before deduplication.

## Template matching rules (reminder)

- **First match wins**: templates are checked in order; the first template with a keyword that matches the tool title (word boundary, case-insensitive) is used.
- **Specific before broad**: place specific condition templates (e.g. "renal colic", "post-stroke") before broad ones (e.g. "renal", "stroke").
- **Keyword scope**: avoid single words that appear across many titles (e.g. "renal", "examination", "prevention", "support") unless the template is intended for a wide set.

## Files changed

- `scripts/management-content.json` – keyword changes and new templates as above.
- `data/decision_tools_protocol.json` and `app/data/decision_tools_protocol.json` – rebuilt.
- `docs/DECISION_TOOLS_ACCURACY_AUDIT.md` – this audit.

## Recommended next steps

1. **Cache**: Bump protocol cache-bust (e.g. `?v=11`) in the app so clients load the updated protocol.
2. **Spot-check**: Manually check a few tools per section (e.g. Renal colic, Post-MI, Pressure ulcer – prevention, PR examination) in the UI.
3. **Future audits**: When adding new bulk/extra tools, add or adjust templates so new titles match the correct pathway (specific templates before broad).
