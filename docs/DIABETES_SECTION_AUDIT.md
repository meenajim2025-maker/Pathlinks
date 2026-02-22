# Diabetes & Endocrinology section – consistency audit

**Date:** 2025-02-21  
**Scope:** Decision tools in **Endocrinology & Diabetes**; templates that match diabetes/endocrine titles in `scripts/management-content.json` and system fallback in `scripts/build-decision-tools.js`.

---

## 1. Diabetes-specific templates

| Template (keywords) | Question / step title | Structure | NICE refs |
|--------------------|------------------------|-----------|-----------|
| DKA, ketoacidosis, type 1 diabetes – dka | Type 1 diabetes – DKA (emergency) | 1 step, 2 options (Primary care / Inpatient) | NG17, NG28, CKS ✓ |
| type 2 diabetes, diabetes, hba1c | 1. HbA1c Target; 2. Drug Choice (NICE 2024) | 2 steps | NG28 ✓ |
| hypoglycaemia | Hypoglycaemia | 1 step, 2 options (Diabetic / Non-diabetic) | NG17, NG28, CKS ✓ |
| diabetes insipidus | Diabetes insipidus | 1 step, 1 option | CKS ✓ |
| metabolic syndrome | Metabolic syndrome | 1 step, 1 option | CKS, NG28 ✓ |
| insulinoma | Insulinoma | 1 step, 1 option | CKS ✓ |

---

## 2. Other endocrine templates (same section)

| Template (keywords) | Question | NICE refs |
|--------------------|----------|-----------|
| diabetes insipidus | Assessment & referral | CKS ✓ |
| hypercalcaemia / hypocalcaemia / calcium | Calcium disorder, Hypercalcaemia, Hypocalcaemia | CKS ✓ |
| osteoporosis, bone, Paget's | Bone / osteoporosis | NG146, CKS ✓ |
| bisphosphonate holiday | Bisphosphonate holiday | NG146, CKS ✓ |
| Graves, thyroiditis, subclinical hyperthyroidism, hyperthyroidism | Various | NG145, CKS ✓ |
| hypoglycaemia | Diabetic / Non-diabetic | NG17, NG28, CKS ✓ |
| Cushing's, acromegaly, Addison's, adrenal | Suspect / referral / emergency | CKS ✓ |
| steroid prescribing | Steroid prescribing / long-term use | CKS ✓ |

---

## 3. Wording consistency

- **Heading:** All use `MANAGEMENT PLAN:` (some with suffix e.g. "Consultant Grade", "BMS/RCOG"). Aligned with cardiovascular standard.
- **Body:** Numbered steps (1. 2. 3.) throughout. ✓
- **End refs:** All diabetes and DKA/hypoglycaemia options end with NICE/CKS. ✓
- **Type 2 diabetes template:** Broad keyword "diabetes" and "hba1c" – any endocrinology tool whose title contains these gets this template; ensure "type 1" topics don’t match (they match DKA or hypoglycaemia first due to keyword order). Template order in file is correct: DKA before type 2 diabetes.

---

## 4. Recommended standard (diabetes topic templates)

- Same as cardiovascular: `MANAGEMENT PLAN:`, numbered steps, always end with at least one ref (`NICE NG28.` or `NICE NG17, NG28, CKS.`).
- Emergencies: DKA and hypoglycaemia already state "999" / "Admit" where appropriate. ✓

---

## 5. System fallback (endocrinology)

- **Title-based:** "Assessment" / "Management" / "Referral" → generic bp-assessment, endo-mgmt, bp-referral.
- **Endocrinology-specific management fallback** (`systemId === 'endocrinology'`): single option "Hormone & Metabolic Review" covering Thyroid, Diabetes, Adrenal, Safety-net. Used when no template matches.
- **Catch-all** (`guidance-endocrinology`): 3-part structure (Assessment & red flags | Management | Referral) with diabetes, thyroid, adrenal, DKA/HHS, red flags. Used for tools that don’t match "assessment" / "management" / "referral" and no topic template.

KB-derived endocrinology tools (e.g. "Addison's – emergency") match topic templates (e.g. adrenal insufficiency) and get specific steps; those that don’t get the 3-part endocrinology block. No change recommended for diabetes-specific fallback.

---

## 6. Suggested edits (applied in this session)

- **PCOS** (in women-health template): Option "PCOS" did not end with a NICE/CKS ref. Add e.g. "NICE NG28, CKS PCOS." for metabolic screening and metformin. *(Optional; PCOS is gynaecology but references T2DM.)*
- No other diabetes or endocrine templates missing NICE refs; structure is consistent.

---

## 7. Tools on generic fallback (diabetes)

If a tool title is e.g. "Type 2 diabetes – Assessment and diagnosis", it matches "assessment" and gets generic bp-assessment, not the endocrine 3-part block. To give such tools the full endocrine block, the build script could use the system catch-all (guidance-endocrinology) for endocrinology when no topic template matches, instead of title-based assessment/management/referral – same approach as suggested for cardiovascular. Currently not implemented.

---

*Next: optional PCOS ref add; optionally apply build logic for endocrine assessment/referral fallback.*
