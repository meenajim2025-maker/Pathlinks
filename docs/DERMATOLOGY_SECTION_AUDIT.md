# Dermatology section – consistency audit

**Date:** 2025-02-21  
**Scope:** Decision tools in **Dermatology**; templates in `scripts/management-content.json` and system fallback in `scripts/build-decision-tools.js`.

---

## 1. Dermatology templates (summary)

| Template (keywords) | Question | NICE/CKS refs |
|---------------------|----------|----------------|
| Varicose veins | Conservative & referral | CG168 ✓ |
| Abscess, boil, skin abscess | Skin abscess / boil | NG141, CKS ✓ |
| Erysipelas, cellulitis | Erysipelas / cellulitis | NG141 ✓ |
| Lichen planus/sclerosus/simplex | Lichen condition | CKS ✓ |
| Urticaria | Urticaria | CKS ✓ |
| Fungal groin | Fungal groin | CKS ✓ |
| Herpes simplex | Herpes simplex | CKS ✓ |
| Alopecia | Alopecia | CKS ✓ |
| Pruritus | Pruritus | CKS ✓ |
| Psoriasis | Location and Severity | CG153 ✓ |
| Paronychia | Acute vs Chronic | CKS ✓ |
| Ingrowing toenail | Management stages | CKS ✓ |
| Rosacea | Type and Severity | CKS ✓ |
| Epistaxis | Acute vs Recurrent | CKS ✓ (ENT overlap) |
| Impetigo | Extent and Severity | CKS ✓ |
| Scalp (psoriasis, sebderm, tinea) | Scalp Condition | CG153, CKS ✓ |
| Seborrhoeic dermatitis, cradle cap | Location | CKS ✓ |
| Actinic keratosis | Severity / Number | CKS ✓ |
| Tinea, fungal skin | Type of Infection | CKS ✓ |
| Erythema multiforme, SJS, TEN, etc. | Various | CKS ✓ |
| Pyoderma, dermatitis herpetiformis, etc. | Referral | CKS ✓ |
| Pemphigoid, pemphigus | Bullous disease | CKS ✓ |
| Eczema, atopic dermatitis, psoriasis flares | Specialist Management | TA guidelines ✓; Pyoderma/Vasculitis – added CKS |
| Punch biopsy, skin biopsy, cryotherapy | Skin procedure | CKS ✓ |
| Acne | Acne severity | NG198 ✓ |
| Melanoma, BCC, SCC | Suspected melanoma | NG14, NG12 ✓ |
| Scabies | Scabies treatment | CKS ✓ |
| Dermatology, skin condition (generic) | General Skin Management | CKS ✓ |

---

## 2. Wording consistency

- **Heading:** All use `MANAGEMENT PLAN:` (some "Consultant Grade"). ✓
- **Body:** Numbered steps. ✓
- **End refs:** One option (Pyoderma/Vasculitis) lacked ref – **fixed:** added "NICE CKS." at end.

---

## 3. System fallback

- **Management fallback** (`systemId === 'dermatology'`): "Dermatology Management (Best Practice)" – General Skin Care & Emollients; no NICE ref at end in build script (optional add).
- **Catch-all** (`guidance-dermatology`): 3-part Assessment | Management | Referral. ✓

---

*Audit complete; one wording fix applied.*
