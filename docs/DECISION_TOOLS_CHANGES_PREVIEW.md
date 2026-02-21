# Decision tools – changes preview

What you see in the app for these topics (Conn's, Cushing's, and the endocrine fallback).

---

## 1. Conn's syndrome

**Pathway:** Conn's syndrome (Primary hyperaldosteronism)

| Option | Guidance shown in app |
|--------|------------------------|
| **Screening & referral** | MANAGEMENT PLAN: 1. Suspect in resistant hypertension, hypokalaemia (or normokalaemic). Screen: plasma aldosterone and renin; aldosterone:renin ratio (ARR) raised. Do not adjust antihypertensives that affect renin (e.g. stop spironolactone/eplerenone 4–6 weeks; use alpha-blocker/CCB if needed). 2. Refer endocrinology for confirmatory testing (saline suppression or fludrocortisone suppression) and adrenal imaging. NICE CKS, Local formulary. |
| **Medical management (post-diagnosis)** | MANAGEMENT PLAN: 1. Mineralocorticoid receptor antagonist: spironolactone or eplerenone per local formulary. Titrate to BP and K+; monitor U&E regularly. 2. Add other antihypertensives as needed. Avoid potassium supplements unless K+ low despite MRA. 3. Surgical option (adrenalectomy) for unilateral adenoma – discuss with endocrinology. NICE CKS, Local formulary. |

---

## 2. Cushing's – iatrogenic

**Pathway:** Cushing's (iatrogenic & endogenous)

| Option | Guidance shown in app |
|--------|------------------------|
| **Iatrogenic (steroid-induced)** | MANAGEMENT PLAN: 1. Reduce steroid to lowest effective dose; consider topical/inhaled alternatives where possible. Taper slowly to avoid adrenal insufficiency – do not stop abruptly. 2. Monitor: BP, glucose, bone health (DEXA if long-term), weight. Treat hypertension and hyperglycaemia per NICE. Consider bisphosphonate if high fracture risk. 3. Sick-day rules if on any systemic steroid: double dose when unwell; emergency hydrocortisone if unable to take oral. NICE CKS, Local formulary. |
| **Endogenous / when to suspect** | MANAGEMENT PLAN: 1. Suspect: central obesity, facial plethora, thin skin, bruising, proximal weakness, hypertension, diabetes. Screen: 24 h urinary free cortisol or late-night salivary cortisol; dexamethasone suppression test. Refer endocrinology for confirmation and imaging (pituitary/adrenal). 2. Do not stop exogenous steroids to investigate until under specialist guidance. NICE CKS, Local formulary. |

---

## 3. Endocrinology fallback (when no topic-specific template matches)

**Pathway:** Endocrinology (Consultant Standard)

| Option | Guidance shown in app |
|--------|------------------------|
| **1. Assessment & red flags** | ASSESSMENT: • Tailor to the condition: history, examination, and investigations relevant to the endocrine presentation (e.g. thyroid: TFTs, TPO; diabetes: HbA1c, foot check; adrenal: electrolytes, short synacthen; calcium/bone: corrected Ca, PTH, vitamin D). • Red flags: Thyroid storm, severe hypo/hyperglycaemia, adrenal crisis, severe hypercalcaemia – emergency. NICE CKS, NG28, NG145. |
| **2. Management** | MANAGEMENT: • Follow NICE CKS and Local formulary for the specific condition. Do not apply thyroid or diabetes advice to non-thyroid/non-diabetes topics (e.g. Cushing's, Conn's, steroid, pituitary have their own pathways). • General principles: sick-day rules for anyone on glucocorticoids; do not stop steroids abruptly; treat hypo-/hyperglycaemia and electrolyte disturbance as indicated. NICE CKS. |
| **3. Referral** | REFERRAL: • 2WW: Pituitary/adrenal crisis, severe thyroid eye disease, suspected phaeochromocytoma crisis. • Urgent: Adrenal crisis, thyroid storm, severe DKA/HHS, severe hypercalcaemia. • Routine: Hyperthyroid, goitre/nodule with concern, type 1 diabetes, pituitary/adrenal/calcium disorders. Use topic-specific pathway where available. NICE NG12, NG145, NG28. |

---

## 4. Other new endocrine templates (same idea in app)

- **Steroid – sick day rules** → Sick-day rules (double dose, emergency hydrocortisone, steroid card).
- **Steroid – withdrawal** → Tapering, HPA recovery, short synacthen if needed.
- **Steroid – long-term monitoring** → Bone protection, BP/glucose, steroid card, ophthalmology.
- **Phaeochromocytoma – suspect** → Screening, metadrenalines, referral.
- **Acromegaly – suspect** → IGF-1, referral.
- **Prolactinoma / hyperprolactinaemia** → Cabergoline, referral.
- **Hypopituitarism** → Replacement of axes, sick-day rules.
- **SIADH / hyponatraemia** → Fluid restriction, correct slowly.
- **Diabetes insipidus** → Water deprivation, desmopressin.
- **Hypercalcaemia** → Mild vs severe/emergency.
- **Hypocalcaemia** → Assessment, acute vs chronic.

---

## 5. Where to see it live

- **Local (from Cursor):** Server is running; open **http://localhost:3000** in your browser → Decision tools → Endocrinology → pick **Conn's syndrome** or **Cushing's – iatrogenic**.
- **Vercel:** **https://pathlinks-clinical.vercel.app** → same steps.

Source: `scripts/management-content.json` (templates), `scripts/build-decision-tools.js` (endocrinology fallback). Built output: `app/data/decision_tools_protocol.json`.
