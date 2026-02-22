# Cardiovascular section – consistency audit

**Date:** 2025-02-21  
**Scope:** Decision tools in Cardiovascular & Cardiac; templates that match cardio titles in `scripts/management-content.json` and system fallback in `scripts/build-decision-tools.js`.

---

## 1. Templates covering cardiovascular tools

| Template (keywords) | Question / step title | Structure | NICE refs |
|---------------------|------------------------|-----------|-----------|
| Chest pain, stable/acute | Chest pain type | 1 step, 2 options | NG72, NG185 ✓ |
| Pericarditis | Pericarditis | 1 step, 1 option | CKS ✓ |
| Syncope, vasovagal, fainting | Syncope | 1 step, 2 options | CG109 ✓ |
| Palpitations, SVT, tachycardia | Palpitations / rhythm | 1 step, 2 options | NG196 ✓ |
| BNP, NT-proBNP | BNP / heart failure | 1 step, 1 option | NG106 ✓ |
| ECG, BBB, ST elevation, etc. | ECG finding | 1 step, 2 options | NG185, NG203, CKS ✓ |
| Valve disease | Valve disease | 1 step, 2 options | NG64, NG208 ✓ |
| PAD, claudication | PAD / claudication | 1 step, 1 option | NG147 ✓ |
| Antiplatelet, DAPT | Antiplatelet | 1 step, 1 option | NG185 ✓ |
| Lipid, LDL, FH | Lipids / LDL | 1 step, 2 options | CG181, CG71 ✓ |
| Endocarditis, prophylaxis | Endocarditis prophylaxis | 1 step, 1 option | NG64 ✓ |
| Varicose veins | Varicose veins | 1 step, 1 option | CG168 ✓ |
| Ambulatory BP, ABPM | Ambulatory BP monitoring | 1 step, 1 option | NG136, CKS ✓ |
| Cardiac arrest survivor | Cardiac arrest – survivor | 1 step, 1 option | NG185 ✓ |
| Ventricular ectopics | Ventricular ectopics | 1 step, 1 option | CKS ✓ |
| Hypertension | 1. Diagnosis and Targets; 2. Step 1 Drug; 3. Step 2–4 | 3 steps | NG136 ✓ |
| Atrial fibrillation, AF | 1. Stroke Risk & Anticoagulation; 2. Rate vs Rhythm | 2 steps | NG196 ✓ |
| Angina, stable chest pain | 1. Medical Management | 1 step | NG72 ✓ |
| Heart failure, CHF, LVF | 1. Diagnosis/Type; 2. Four Pillars | 2 steps | NG106 ✓ |

KB-derived tools (e.g. "Abdominal aortic aneurysm – Assessment/Management/Referral") that don’t match a topic template get **generic** assessment/management/referral fallbacks (bp-assessment, cvd-mgmt, bp-referral) – not cardiovascular-specific. Consider adding an "abdominal aortic aneurysm" or "aortic aneurysm" template if those tools should be AAA-specific.

---

## 2. Wording inconsistencies

- **Heading:** Most use `MANAGEMENT PLAN:\n1. 2. 3.`; some use `MANAGEMENT PLAN (Consultant Grade):` or `MANAGEMENT PLAN (RCP/BCS):`. System fallback uses `ASSESSMENT:\n•` / `MANAGEMENT:\n•` / `REFERRAL:\n•`.
- **End refs:** Most end with `NICE NGxx` or `NICE NGxx, CKS`; a few have no ref. Recommend: always end with at least one ref (e.g. `NICE NG72.` or `NICE NG106, CICE CKS.`).
- **Bullets vs numbers:** Topic templates use numbered list (1. 2. 3.); system fallback uses bullets (•). For topic templates, keeping numbers is fine; ensure NICE ref is present.

---

## 3. Recommended standard (cardiovascular topic templates)

- **Heading:** Use `MANAGEMENT PLAN:` (optional suffix e.g. "Consultant Grade" or "NICE" is acceptable but not required).
- **Body:** Numbered steps (1. 2. 3.) for clarity.
- **End:** Always include at least one NICE/guideline ref: `NICE NGxx.` or `NICE NGxx, CKS.`
- **Red flags / emergency:** Where relevant, state "999" or "Urgent" explicitly.

---

## 4. Suggested edits (applied in this session)

- **Angina template:** Ensure single block; end with `NICE NG72.` (already present).
- **AF template:** End first option with `NICE NG196.` (already present).
- **Heart failure:** Add NICE ref to end of "Four Pillars" options where missing.
- **Hypertension:** Already has NG136 throughout.
- **Chest pain (early template):** Already has NG72, NG185.
- No structural change to step counts; only wording/ref consistency where missing.

---

## 5. Tools on generic fallback (cardiovascular)

KB topics such as "Abdominal aortic aneurysm" generate three tools (Assessment, Management, Referral). Their titles match the build script’s **title-based** fallbacks (words "assessment", "management", "referral") so they get generic assessment/management/referral steps, not the cardiovascular 3-part (Assessment & red flags | Management | Referral) block. To give them cardiovascular-specific content, either:

- Add an **AAA** (or aortic aneurysm) template that matches "abdominal aortic aneurysm" and provides AAA-specific steps, or  
- In the build script, ensure tools in the cardiovascular system that don’t match any topic template use `guidance-cardiovascular` (the 3-part cardio block) instead of the generic assessment/management/referral fallbacks.

Current behaviour: title contains "assessment" → bp-assessment; "management" → cvd-mgmt (cardiovascular management); "referral" → bp-referral. So "Abdominal aortic aneurysm – Management" already gets **cvd-mgmt** (Cardiovascular Management (Best Practice)) with "CVD Risk & Lifestyle". So KB cardiovascular topics do get the cardiovascular management fallback, not a generic other. Only the Assessment and Referral steps are generic (bp-assessment, bp-referral). Recommendation: in build script, for systemId cardiovascular/cardiology, use the 3-part guidance (Assessment & red flags | Management | Referral) when no template matches, instead of the title-based assessment/management/referral fallbacks. That way KB cardio topics get the full cardio block.

---

*Next: apply wording consistency edits to cardiovascular templates and optionally change build logic for cardio fallback as above.*
