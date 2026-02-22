# Same-options by section – changes and identification

## Summary

**Issue:** Multiple pathways (tools) were showing the **same management options** (e.g. alcohol had 5+ pathways all with the same 3-step addiction content). This document records what was fixed and what was identified for future work.

---

## Changes made

### 1. Alcohol (14 tools → pathway-specific)

**Before:** All alcohol-related tools matched one template (`alcohol-overview` + withdrawal + maintenance).

**After:** Separate templates so each pathway has appropriate options:

| Tool title | StepId / content now |
|------------|------------------------|
| Alcohol – brief advice | `alcohol-brief-advice` – AUDIT & brief intervention |
| Young people and alcohol | `alcohol-brief-advice` |
| Alcohol – AUDIT | `alcohol-audit` – Screening & follow-up |
| Alcohol – harmful use | `alcohol-harmful` – Harmful use (non-dependent) |
| Alcohol – dependence | `alcohol-overview` – Full 3-step (overview + withdrawal + maintenance) |
| Alcohol use disorders | `alcohol-overview` |
| Alcohol and health... (review) | `alcohol-overview` |
| Alcohol – detox | `alcohol-withdrawal-ciwa` – Withdrawal & Wernicke's only |
| Alcohol – withdrawal | `alcohol-withdrawal-ciwa` |
| Alcohol – liver / Alcohol – liver disease | `alcohol-liver-mgt` – Alcohol-related liver disease |
| Alcohol – pancreatitis | `alcohol-pancreatitis-mgt` – Alcohol-related pancreatitis |
| Neuropathy – alcohol | `neuropathy-alcohol-mgt` – Alcohol-related neuropathy (thiamine, abstain, pain) |

NAFLD in type 2 diabetes remains on `liver-misc-mgt` (correct).

### 2. Prophylaxis (endocarditis was matching all “prophylaxis” titles)

**Before:** Template with keywords `["endocarditis", "prophylaxis"]` so **any** title containing “prophylaxis” got endocarditis content (Varices, Gout, Malaria, Meningococcal, Pertussis, Migraine, HIV PrEP).

**After:**

- **Endocarditis:** Keywords narrowed to `["endocarditis", "infective endocarditis"]` only.
- **New templates added:**
  - Varices – prophylaxis → `varices-prophylaxis-mgt` (variceal bleeding prophylaxis)
  - Malaria – prophylaxis / Malaria prophylaxis → `malaria-prophylaxis-mgt` (travel chemoprophylaxis)
  - Meningococcal – prophylaxis → `meningococcal-prophylaxis-mgt` (contact prophylaxis)
  - Pertussis – prophylaxis → `pertussis-prophylaxis-mgt` (contact prophylaxis)
- Gout – prophylaxis → already correct via `gout-management` (includes prophylaxis option).
- Migraine – prophylaxis → already correct via migraine template (`migraine-acute` with prophylaxis step).
- HIV pre-exposure prophylaxis → remains `hiv-mgt` (acceptable).

---

## Other sections – identification (no code changes yet)

These stepIds still have **5+ tools** sharing the same dropdown(s). Some are intentionally one topic with many subtopics (e.g. asthma-steps, bp-stage); others may warrant splitting later.

| StepId | Count | Section / topic | Note |
|--------|-------|------------------|------|
| fever-child | 20 | Paediatrics | Fever/traffic light + child mental health – consider splitting fever vs mental health |
| diabetes-stage | 20 | Endocrinology | LADA, MODY, gestational, podcast titles – consider splitting by subtype |
| asthma-steps | 16 | Respiratory | Asthma acute/biologics/brittle/child – one stepped template may be OK |
| thyroid-action | 15 | Endocrinology | Hypothyroidism dose/pregnancy/starting – one template may be OK |
| dep-overview | 14 | Mental health | Depression mild/moderate/elderly/bipolar – consider splitting |
| vte-diagnosis | 13 | Cardiovascular | DVT/PE Wells, duration, pregnancy – one template may be OK |
| migraine-acute | 13 | Neurology | Migraine/headache/child/cervicogenic – consider splitting headache types |
| ckd-stage | 13 | Renal | CKD anaemia/bone/dialysis – one template may be OK |
| hiv-mgt | 13 | Infectious | HIV monitoring/PEP/drug interactions – one template may be OK |
| bp-stage | 12 | Cardiovascular | Hypertension first-line/CKD/diabetes/pregnancy – one template may be OK |
| copd-action | 12 | Respiratory | COPD diagnosis/exacerbation/overlap – one template may be OK |
| upper-gi-cancer-mgt | 12 | Gastroenterology | Barrett's/colorectal/gastric 2WW – consider splitting cancer 2WW vs Barrett's |
| bone-mgt | 12 | MSK / Endocrinology | Osteoporosis/DEXA/fracture – one template may be OK |
| uti-type | 12 | Renal / Paediatrics | UTI child/infant/imaging – one template may be OK |
| anaemia | 12 | Haematology | Microcytic/macrocytic/haemolytic – one template may be OK |

**Recommendation:** Use this list when prioritising the next “same-options” pass. Focus first on sections where the **clinical intent** of each tool title clearly differs (e.g. “Fever – neonatal” vs “Child mental health – Management” both on `fever-child`).

---

## Files changed

- `scripts/management-content.json` – Alcohol split into multiple templates; neuropathy – alcohol; endocarditis keywords narrowed; varices/malaria/meningococcal/pertussis prophylaxis templates added (and malaria/pertussis order adjusted).
- Build run; `data/` and `app/data/` protocol updated.

---

## Build & verify

```bash
node scripts/build-decision-tools.js
```

Then in the app, spot-check: Alcohol – brief advice vs Alcohol – dependence vs Alcohol – liver vs Neuropathy – alcohol; and Varices – prophylaxis, Malaria – prophylaxis, Meningococcal – prophylaxis, Pertussis – prophylaxis.
