# Endocrinology & Diabetes – forensic audit

**Date:** 2025-02-21  
**Scope:** All tools in Endocrinology & Diabetes section (125 unique titles from KB, extra-nice-tools, extra-tools-bulk, extra-tools-bulk-1000).

---

## Summary

| Metric | Before audit | After audit |
|--------|--------------|-------------|
| Total unique tool titles | 125 | 125 |
| With topic-specific template | 87 | **125** |
| On generic fallback | **38** | **0** |

Every endocrinology tool now has a **topic-specific** management pathway. None show the generic “Tailor to the condition…” fallback.

---

## Tools that were on fallback (now have templates)

1. **Bisphosphonate – holiday** → bisphosphonate holiday template  
2. **British Society for Rheumatology guidance, DMARDs, steroid therapy and COVID-19** (×3) → steroid prescribing / steroid therapy template  
3. **Calcium – raised / Calcium – low** → calcium disorder template  
4. **Carcinoid syndrome** → carcinoid template  
5. **Congenital adrenal hyperplasia** → congenital adrenal hyperplasia (CAH) template  
6. **Graves' disease** → Graves' template  
7. **Hyperparathyroidism** → hyperparathyroidism template  
8. **Hyperthyroidism – referral / Hyperthyroidism: referral** → hyperthyroidism template  
9. **Hypoglycaemia – diabetic / Hypoglycaemia – non-diabetic** → hypoglycaemia template (diabetic vs non-diabetic)  
10. **Hypoparathyroidism** → hypoparathyroidism template  
11. **Insulinoma** → insulinoma template  
12. **Key considerations when prescribing steroids** (×3) → steroid prescribing template  
13. **Metabolic syndrome** → metabolic syndrome template  
14. **Multiple endocrine neoplasia** → MEN template  
15. **Osteomalacia** → bone/osteoporosis template (osteomalacia option)  
16. **Osteoporosis – bisphosphonate / DEXA / fracture / denosumab / teriparatide** → bone template  
17. **Osteoporosis: risk and DEXA** → bone template  
18. **Paget's disease** → bone template (Paget’s option)  
19. **Pituitary – adenoma** → pituitary adenoma template  
20. **Prolactin – raised** → prolactinoma template (added keyword)  
21. **Subclinical hyperthyroidism in primary care** (×3) → subclinical hyperthyroidism template  
22. **Testosterone deficiency** (×3) → testosterone deficiency template  
23. **Thyroiditis** → thyroiditis template  

---

## New templates added (this audit)

- **Calcium – raised / Calcium – low** (calcium disorder)  
- **Osteoporosis / osteomalacia / Paget's** (bone-mgt: fracture/DEXA, denosumab/teriparatide, osteomalacia/Paget’s)  
- **Bisphosphonate – holiday**  
- **Graves' disease**  
- **Thyroiditis**  
- **Subclinical hyperthyroidism** (placed before hyperthyroidism so it matches first)  
- **Hyperthyroidism** (referral)  
- **Hypoglycaemia** (diabetic / non-diabetic)  
- **Metabolic syndrome**  
- **Insulinoma**  
- **Carcinoid syndrome**  
- **Congenital adrenal hyperplasia**  
- **Multiple endocrine neoplasia**  
- **Hyperparathyroidism**  
- **Hypoparathyroidism**  
- **Pituitary – adenoma**  
- **Testosterone deficiency**  
- **Steroid prescribing / steroid therapy / key considerations** (covers BSR/DMARD/COVID and “Key considerations when prescribing steroids”)  

**Keyword change:** Prolactinoma template now includes **prolactin – raised**, **prolactin raised** so “Prolactin – raised” matches.

---

## How to re-run the audit

```bash
node scripts/audit-endocrinology-tools.js
```

This lists every endocrinology tool title and whether it has a template (Y) or is on fallback (N). After this audit, **0** should be on fallback.

---

## Source files

- **Templates:** `scripts/management-content.json`  
- **Build:** `scripts/build-decision-tools.js` (getManagementSteps = first keyword match, word boundary)  
- **Audit script:** `scripts/audit-endocrinology-tools.js`  
