# Section audits – index

All sections have been audited for consistency (structure, wording, NICE/CKS refs). Each audit doc lists templates, notes wording standards, and any fixes applied.

| Section | Audit doc | Fixes applied |
|---------|-----------|----------------|
| Cardiovascular & Cardiac | [CARDIOVASCULAR_SECTION_AUDIT.md](CARDIOVASCULAR_SECTION_AUDIT.md) | NICE refs added to HF, AF options |
| Diabetes & Endocrinology | [DIABETES_SECTION_AUDIT.md](DIABETES_SECTION_AUDIT.md) | PCOS option ref added |
| Respiratory & Sleep | [RESPIRATORY_SECTION_AUDIT.md](RESPIRATORY_SECTION_AUDIT.md) | NICE/BTS refs added to COPD, asthma, pneumonia, bronchiectasis, OSA |
| Dermatology | [DERMATOLOGY_SECTION_AUDIT.md](DERMATOLOGY_SECTION_AUDIT.md) | Pyoderma/Vasculitis option ref added |
| Mental Health | [MENTAL_HEALTH_SECTION_AUDIT.md](MENTAL_HEALTH_SECTION_AUDIT.md) | NICE refs added to depression, phobia, PTSD/OCD, bipolar, SSRI options |
| Gastroenterology | [GASTROENTEROLOGY_SECTION_AUDIT.md](GASTROENTEROLOGY_SECTION_AUDIT.md) | IBD flare, coeliac workup refs added |
| Musculoskeletal | [MUSCULOSKELETAL_SECTION_AUDIT.md](MUSCULOSKELETAL_SECTION_AUDIT.md) | — |
| Paediatrics | [PAEDIATRICS_SECTION_AUDIT.md](PAEDIATRICS_SECTION_AUDIT.md) | — |
| Renal & Urology | [RENAL_UROLOGY_SECTION_AUDIT.md](RENAL_UROLOGY_SECTION_AUDIT.md) | — |
| Women's Health | [WOMENS_HEALTH_SECTION_AUDIT.md](WOMENS_HEALTH_SECTION_AUDIT.md) | (PCOS in cardio/diabetes audit) |
| Infectious | [INFECTIOUS_SECTION_AUDIT.md](INFECTIOUS_SECTION_AUDIT.md) | — |
| Neurology | [NEUROLOGY_SECTION_AUDIT.md](NEUROLOGY_SECTION_AUDIT.md) | Migraine options refs added |
| Haematology | [HAEMATOLOGY_SECTION_AUDIT.md](HAEMATOLOGY_SECTION_AUDIT.md) | — |
| ENT | [ENT_SECTION_AUDIT.md](ENT_SECTION_AUDIT.md) | — |
| Procedures & General | [PROCEDURES_GENERAL_SECTION_AUDIT.md](PROCEDURES_GENERAL_SECTION_AUDIT.md) | — |

**Standard:** Topic templates use `MANAGEMENT PLAN:` (or OVERVIEW), numbered steps, and end with at least one NICE/CKS/BTS ref where applicable.

**Rebuild:** After any change to `scripts/management-content.json`, run `node scripts/build-decision-tools.js` then `cp data/decision_tools_protocol.json app/data/`.

---

## Build logic: 3-part guidance for all sections

When a tool title contains *assessment*, *diagnosis*, *management*, *treatment*, *referral*, or *follow-up* and **no topic template** matches, the build now uses that **system’s 3-part consultant guidance** (Assessment & red flags | Management | Referral) instead of generic assessment/management/referral snippets. This applies to every section that has a `SYSTEM_GUIDANCE` entry: cardiovascular, cardiology, dermatology, mental-health, gastroenterology, endocrinology, musculoskeletal, respiratory, paediatrics, renal-urology, women-health, infectious, neurology, haematology, ent, procedures-general, and other. Implemented in `scripts/build-decision-tools.js` (module-level `SYSTEM_GUIDANCE`, early return in `getSystemFallbackSteps`).
