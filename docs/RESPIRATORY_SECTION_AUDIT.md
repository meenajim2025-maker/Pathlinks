# Respiratory & Sleep section – consistency audit

**Date:** 2025-02-21  
**Scope:** Decision tools in **Respiratory & Sleep**; templates that match respiratory titles in `scripts/management-content.json` and system fallback in `scripts/build-decision-tools.js`.

---

## 1. Respiratory templates

| Template (keywords) | Question / step title | Structure | NICE/BTS refs |
|--------------------|------------------------|-----------|----------------|
| COPD, emphysema, chronic bronchitis | 1. Escalation Hierarchy | 1 step, 3 options (LAMA+LABA, Triple, Refractory) | NG115 ✓ (Refractory: added) |
| Asthma, wheeze | 1. Maintenance (BTS/SIGN); 2. Acute Attack | 2 steps | BTS/SIGN ✓ (Step 2/3 options: added) |
| Spirometry, lung function | Spirometry | 1 step, 1 option | NG115, NG80, BTS ✓ |
| Pleural tap, thoracocentesis | Pleural tap | 1 step, 1 option | CKS ✓ |
| Pleural effusion, haemoptysis, cough, pneumothorax, nodule, lung cancer, sarcoidosis, etc. | Respiratory | 1 step, 2 options (Pleural effusion / Haemoptysis) | CKS, NG12, NG120 ✓ |
| Pneumonia, CAP | 1. Severity (CURB-65) | 1 step, 2 options | NG138 (added to options) |
| Bronchiectasis, chronic productive cough | 1. Management & Airway Clearance | 1 step, 2 options | BTS/CKS (added) |
| OSA, sleep apnoea, snoring | 1. Assessment & Referral | 1 step, 1 option | NG202 (added) |
| ILD, pulmonary fibrosis, lung disease | 1. Specialist Workup | 1 step, 1 option | NG105 ✓ |

---

## 2. Wording consistency

- **Heading:** All use `MANAGEMENT PLAN:` (some "Consultant Plan"). Aligned with cardio/diabetes standard.
- **Body:** Numbered steps throughout. ✓
- **End refs:** Several options lacked an explicit NICE/BTS ref at end of guidance text; these were added (see below).
- **System fallback:** For titles containing "management" or "treatment", respiratory uses `resp-mgmt` (Respiratory Care Plan BTS/SIGN) – single option; no NICE ref at end in build script (could add "NICE NG80, NG115." for consistency).

---

## 3. Recommended standard (respiratory topic templates)

- Same as other sections: `MANAGEMENT PLAN:`, numbered steps, always end with at least one ref (`NICE NG115.`, `BTS/SIGN.`, etc.).
- Emergencies: Asthma severe/life-threatening already state "999"; COPD referral for transplant. ✓

---

## 4. System fallback (respiratory)

- **Title-based:** "Assessment" → bp-assessment; "Management" / "treatment" (and `systemId === 'respiratory'` or title contains "lung"/"breath") → resp-mgmt (Symptom Control & ACBT); "Referral" → bp-referral.
- **Catch-all** (`guidance-respiratory`): 3-part (Assessment & red flags | Management | Referral) with asthma, COPD, cough, 2WW haemoptysis, NG12, NG80, NG115. Used when no template matches and title is not assessment/management/referral.

KB-derived respiratory tools (e.g. "Are we doing enough chest X-rays – Management") get resp-mgmt; topic-matched tools (COPD, asthma, pneumonia, etc.) get the specific templates above.

---

## 5. Edits applied in this session

- **COPD:** "Refractory / Advanced COPD" option – added "NICE NG115." at end.
- **Asthma:** Step 2 (Low-dose ICS) and Step 3 (Add LABA) – added "BTS/SIGN." at end. Severe and Life-Threatening acute options – added "BTS/SIGN." at end.
- **Pneumonia:** Low Risk option – added "NICE NG138." at end; Moderate/High Risk – added "NICE NG138." at end.
- **Bronchiectasis:** Stable and Exacerbation options – added "BTS Guideline, NICE CKS." at end.
- **OSA:** Suspected OSA option – added "NICE NG202." at end.

---

## 6. Tools on generic fallback

Respiratory KB topics with "Assessment and diagnosis" or "Referral and follow-up" get generic bp-assessment / bp-referral. To give them the full respiratory 3-part block when no topic template matches, the build script could use `guidance-respiratory` for respiratory system in those cases (same approach as cardiovascular/endocrine). Not implemented in this audit.

---

*Audit complete; consistency fixes applied and protocol rebuilt.*
