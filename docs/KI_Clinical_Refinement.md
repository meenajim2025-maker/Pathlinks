# KI: Clinical Decision Support Refinement (PathLinks)

## Summary
This Knowledge Item documents the refactoring of the PathLinks clinical decision support tool to improve data-driven clinical coding and safety-netting. It covers the transition from hardcoded logic to dynamic JSON exploration for blood tests and decision protocols.

## Key Concepts & Architecture
- **Data Driven Logic**: The application uses `blood_tests_protocol.json` to define reference ranges, EMIS Read codes, and clinical actions.
- **Age-Specific Ranges**: Reference ranges for blood tests can now be scoped by age using keys like `age_40_49` in the `ranges` object.
- **Decision Tool Pipeline**: `scripts/build-decision-tools.js` aggregates data from `management-content.json` and `knowledge_base.json` to generate `decision_tools_protocol.json`.
- **Safety Badging**: UI distinguishes between localized "Specific Pathways" (Green) and NICE fallback "Generic Pathways" (Orange).

## Implementation Details

### Blood Test Analysis (`script.js`)
- `findAgeRange`: A recursive-like helper that iterates through the `ranges` object to find age-bound keys.
- `analyseResult`: Dynamically pulls `emisCode` and `guidance` from the JSON object. It handles low, high, and pathological (1.5x) thresholds.

### EMIS Coding Patterns
- **AKI**: Proposed code `444..`.
- **Platelets**: Proposed code `42P..`.
- **Hypothyroidism**: Proposed code `C10..`.
- **Default**: `66Y..` (Result actioned via protocol).

## Clinical Refinement: Specialist/Consultant Phase (2026)
- **Royal College Alignment**: Transitioned from generic NICE CKS to specialist-grade guidelines from **RCP, BCS, BTS, BASH, BSG, BSR, BAUS, RCPCH, and RCOphth**.
- **Management Strategy**: 
    - **Cardiology**: Shifted to "Four Pillars" for HF and invasive CTCA/Ablation triggers for Angina/AF.
    - **Neurology**: Integrated BASH stratified care for Migraine and RCP/NICE stroke triage targets.
    - **Respiratory**: Adopted BTS/SIGN step-wise maintenance and RCPCH paediatric dosing.
    - **Procedures**: Added surgical indicators for GP Minor Surgery, US-guided injection protocols, and palliative care "Big 4" SC regimens.
- **Decision Architecture**:
    - **Two-Column UI**: Grid-based display separating selectors from guidance.
    - **Sticky Documentation**: Continuous visibility of management plans.
    - **System-Level Fallbacks**: Enhanced `scripts/build-decision-tools.js` to provide specialized advice even when specific keyword matches fail.

## Maintenance Notes
- After editing `management-content.json`, you **must** run `node scripts/build-decision-tools.js` and verify with `npx vercel --prod`.
- The `app/data/` directory is the deployment source; ensure root `data/` changes are compiled for production.
