# PathLinks Clinical Protocol: Blood Result Management
**Version:** 1.0 (Feb 2026)  
**Target Audience:** GP Trainees, Salaried GPs, ANPs  
**Objective:** Provide safe, evidence-based decision support for actioning common blood results in Primary Care.

---

## 1. Full Blood Count (FBC)
### 1.1 Haemoglobin (Hb)
- **Normal Range:** 130-180 g/L (M), 115-165 g/L (F).
- **Abnormal High (>180 M / >165 F):**
    - **Step 1:** Review smoking status.
    - **Step 2:** Exclude COPD, OSA, or living at altitude.
    - **Step 3:** If Hb >170 (M) or >150 (F) and persistent, check JAK2/EPO for Polycythaemia Vera.
- **Abnormal Low (Anaemia):**
    - **Step 1:** Check MCV.
    - **Step 2:** Microcytic (<80) -> Iron supply? Ferritin. 2WW if age/red flags.
    - **Step 3:** Macrocytic (>100) -> B12/Folate/Alcohol.
    - **Step 4:** Normocytic (80-100) -> Acute bleed/CKD/Anaemia of chronic disease.

---

## 2. Vitamins & Minerals
### 2.1 Ferritin
- **Iron Deficiency:** Ferritin <30 µg/L (even with normal Hb) in symptomatic patients.
- **Inflammation:** Ferritin is an acute phase reactant. If high, check Transferrin Saturation.
- **Red Flag:** Low ferritin in males or post-menopausal women WITHOUT clear cause MUST be referred for GI investigation (2WW).

### 2.2 Vitamin B12
- **Deficiency:** <180 ng/L.
- **Caution:** Always start B12 replacement 24-48 hours BEFORE Folate to avoid Subacute Combined Degeneration of the Cord.

---

## 3. PSA (Prostate Specific Antigen)
- **Age-Specific Thresholds:**
    - 40-49: >2.5
    - 50-59: >3.5
    - 60-69: >4.5
    - 70-79: >6.5
- **Exclude before referral:** UTI (treat and wait 1 month), recent ejaculation, vigorous exercise, DRE.

---

## 4. EMIS Web Mapping
### Proposed Protocol Logic
To integrate this into EMIS Web:
1.  **Protocol Trigger:** "On filing result".
2.  **Filter:** Laboratory result category.
3.  **Action:** If value is outside range, trigger a "User Prompt" displaying these steps.
4.  **Automatic Coding:** Offer to add common clinical codes (e.g., "Anaemia investigated", "Counselling for PSA test").

---

## Data Sources
- NICE Clinical Knowledge Summaries (CKS)
- British Society of Haematology Guidelines
- NHS Lab Tests Online UK
