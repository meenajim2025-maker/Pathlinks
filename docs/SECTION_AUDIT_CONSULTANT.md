# High-level consultant audit: Decision tools by section

**Purpose:** Audit each clinical section’s structure and management plans; align to a consistent consultant-grade pattern (Assessment | Management | Referral) and improve content per specialty.  
**Date:** 2025-02-16.

---

## Audit summary by section

| Section | Total tools | On catch-all | Topic-specific / other | Sample conditions on catch-all |
|---------|-------------|--------------|------------------------|--------------------------------|
| Cardiovascular & Cardiac | 113 | 3 | 110 | Ambulatory BP, Cardiac arrest survivor, Ventricular ectopics |
| Dermatology & Skin | 140 | 28 | 112 | Basal cell, Candidal intertrigo, Erythema multiforme, Folliculitis |
| Mental Health & Wellbeing | 135 | 28 | 107 | Anxiety medication, Benzodiazepine reduction, Binge eating, Clozapine |
| Gastroenterology & Liver | 133 | 53 | 80 | Achalasia, Acute diarrhoea, Anal fissure, Ascites, Barrett's, Biliary colic |
| Endocrinology & Diabetes | 126 | 41 | 85 | Acromegaly, Bisphosphonate holiday, Calcium, Cushing's, Conn's |
| Musculoskeletal & Joints | 148 | 59 | 89 | AC joint, Ankle sprain, Biceps tendinopathy, Cervical radiculopathy |
| Respiratory & Sleep | (in list) | 28 | — | ABPA, Cough chronic, Bronchitis, CTEPH |
| Paediatrics & Child Health | — | 47 | — | Allergy food, Chickenpox, Circumcision, Congenital heart murmur |
| Renal, Urology & LUTS | — | 39 | — | AKI, Epididymitis, Erectile dysfunction, Bladder cancer 2WW |
| Women's & Reproductive Health | — | 43 | — | Adenomyosis, Amenorrhoea, Breast lump, BV |
| Infectious Disease & Screening | — | 48 | — | Bite, C. difficile, COVID antiviral, HIV/TB |
| Neurology & Headache | — | 28 | — | Ataxia, Bell's palsy, Brain tumour 2WW, Guillain-Barré |
| Haematology & Anaemia | — | 47 | — | ALL, AML, Anticoagulation DOAC/warfarin, Bleeding |
| ENT & Allergy | — | 29 | — | Adenoid hypertrophy, Glue ear, Hoarse voice, Cholesteatoma |
| Procedures & General Practice | — | 33 | — | Advance care planning, Cervical smear, Consent, Catheter |
| Other clinical topics | — | 59 | — | Deprescribing, Capacity, Care home, Complementary therapy |

---

## Recommended structure (all sections)

Each section’s **catch-all** plan (when no topic-specific template matches) should follow a **consistent 3-option structure** at consultant standard:

1. **Assessment & red flags** – History, examination, key investigations, NICE red flags and when to escalate.
2. **Management** – First-line treatment, drugs/doses where appropriate, lifestyle, safety-netting.
3. **Referral** – 2WW, urgent, routine; ensure work-up before referral.

This gives every condition in that section the same high-level workflow and avoids a single undifferentiated block. Content is tailored per specialty (e.g. Gastro: FIT, coeliac, liver; Paeds: traffic light, growth; Haematology: anaemia, anticoagulation).

---

## Findings and changes applied

- **Structure:** All 16 section catch-alls updated to the 3-option pattern above; labels and guidance text are specialty-specific.
- **Content:** Wording tightened to NICE/BNF and local practice; 2WW/urgent/routine clarified per section.
- **Consistency:** Question title per section is now “[Specialty] (Consultant Standard)” with options “Assessment & red flags”, “Management”, “Referral” (or equivalent where a section needs a different third option, e.g. “Procedures & safety” for procedures-general).

---

## Implementation (completed)

- **Build script:** `scripts/build-decision-tools.js` – object `systemGuidance` updated so each `systemId` has **three options**: (1) Assessment & red flags, (2) Management, (3) Referral. Content is specialty-specific and NICE-aligned.
- **Rebuild:** Run `node scripts/build-decision-tools.js` then `cp data/decision_tools_protocol.json app/data/`. **Done** – 1920 tools built.
- **Result:** Every section’s catch-all plan now uses the same 3-option consultant structure; no section uses a 2-option or undifferentiated block.

---

*See `docs/MANAGEMENT_PLAN_AUDIT_SENIOR_CONSULTANT.md` for topic-level audit and template coverage.*
