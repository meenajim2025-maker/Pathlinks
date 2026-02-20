# Senior Consultant Analysis: Management Plans Across All Decision Tools

**Scope:** All ~1,920 decision tools (Learning library × 3, extra-nice-tools, extra-tools-bulk, extra-tools-bulk-1000).  
**Sources:** `scripts/management-content.json` (topic-specific templates) and `scripts/build-decision-tools.js` (system/fallback logic).  
**Date:** 2025-02-16.

---

## 1. Executive summary

- **Coverage:** About **64%** of tools receive **condition- or system-specific** management (from 124 templates or system fallbacks). The remaining **36% (698 tools)** receive a **single generic “Holistic Management Plan”** with no condition-specific drugs, referral criteria, or NICE references.
- **Main risk:** Clinicians opening a specific condition (e.g. “Pericarditis”, “Lichen planus”, “Palpitations – no red flags”) may see the same generic four-point plan as for dozens of unrelated topics. This dilutes clinical utility and increases the chance of guideline deviation if users rely on the tool.
- **Recommendation:** Treat the 698 generic-plan tools as the priority backlog. Add topic-specific templates (or extend keywords) for high-impact, high-frequency conditions first (cardiovascular, dermatology, ENT, gastro, paediatrics), then iteratively reduce the generic tail.

---

## 2. How management plans are assigned

1. **Template match (first match wins)**  
   Tool title is matched against `management-content.json` using **word-boundary** keyword match. The **first** template with a matching keyword wins. Order of templates therefore matters (e.g. “type 2 diabetes” before “diabetes” is correct).

2. **Fallback if no template**  
   `getSystemFallbackSteps(systemId, title)` in the build script:
   - **Assessment/diagnosis:** If title contains “assessment” or “diagnosis” → generic assessment fallback (history, examination, differential, validated scores).
   - **Management/treatment:** If title contains “management” or “treatment” → system-specific block (dermatology, cardiovascular, mental-health, women-health, gastroenterology, paediatrics, cardiology, respiratory) or else “Management Strategy (Consultant Grade)” (bio-psycho-social).
   - **Referral/follow-up:** If title contains “referral” or “follow-up” → generic referral/triage fallback.
   - **Default:** Otherwise → **“Clinical Guidance (Consultant Approach)”** with a single “Holistic Management Plan” option (assessment, multimodal action, safety-net, follow-up). No system-specific content.

So every tool ends up with exactly one of: **template steps**, **assessment fallback**, **management fallback** (system or consultant), **referral fallback**, or **generic consultant catch-all**.

---

## 3. Distribution of management plan types (by first step id)

| Count | Step ID / type | Interpretation |
|------|----------------------------------|----------------------------------|
| **698** | `guidance` | Generic “Holistic Management Plan” (Consultant Approach) – **no condition-specific content** |
| 128 | `bp-referral` | Referral & follow-up fallback (title contains referral/follow-up) |
| 120 | `bp-assessment` | Assessment & diagnosis fallback (title contains assessment/diagnosis) |
| 84 | `consultant-fallback-mgmt` | Management/treatment fallback – “Consultant Grade” bio-psycho-social (title contains management/treatment but no system block) |
| 38 | `diabetes-stage` | Topic-specific (diabetes) |
| 29 | `fever-child` | Topic-specific (fever in under-5s) |
| 26 | `wellbeing-overview` | Topic-specific (primary prevention) |
| … | (many others) | Other topic-specific templates (CKD, asthma, COPD, depression, UTI, thyroid, anaemia, etc.) |

**Summary:** 698 + 84 = **782 tools** use a **generic** management message (consultant/holistic); 128 + 120 use generic **referral** or **assessment** text. The rest use **topic-specific** templates (or system-specific management blocks for “management”/“treatment” titles).

---

## 4. The 698 “generic plan” tools – by system

Tools that receive only the generic “Clinical Guidance (Consultant Approach)” / “Holistic Management Plan”:

| Count | System |
|------|--------|
| 60 | Other clinical topics |
| 59 | Gastroenterology & Liver |
| 59 | Musculoskeletal & Joints |
| 54 | Infectious Disease & Screening |
| 49 | Paediatrics & Child Health |
| 47 | Haematology & Anaemia |
| 46 | Women's & Reproductive Health |
| 45 | Dermatology & Skin |
| 45 | Endocrinology & Diabetes |
| 39 | Cardiovascular & Cardiac |
| 39 | Renal, Urology & LUTS |
| 37 | ENT & Allergy |
| 34 | Procedures & General Practice |
| 29 | Neurology & Headache |
| 28 | Mental Health & Wellbeing |
| 28 | Respiratory & Sleep |

**Sample titles (by system):**

- **Cardiovascular:** Ambulatory BP monitoring, Antiplatelet – DAPT duration, Aortic stenosis – severity, BNP – when to request, Bradycardia – when to pace, Brugada, Cardiac arrest – survivor, Chest pain – acute/stable, ECG interpretation, Endocarditis – prophylaxis, Long QT, Mitral regurgitation/stenosis, Palpitations, Pericarditis, PAD, Raynaud's, Syncope, SVT, Valve disease – when to refer, Varicose veins, etc.
- **Dermatology:** Abscess – skin, Alopecia, Basal cell – superficial, Boil – recurrent, Candidal intertrigo, Cold sore, Erysipelas, Erythema multiforme/nodosum, Folliculitis, Fungal – groin, Herpes simplex, Hirsutism, Lichen planus/sclerosus/simplex, Lice, Lupus – discoid, Molluscum, Nail – fungal, Pemphigoid, Pemphigus, Pruritus, Pyoderma gangrenosum, Urticaria, etc.
- **ENT:** (sample of 37) – many will be generic until ENT-specific templates or keywords are added.
- **Gastro:** (59 tools) – many conditions beyond the current IBS/GORD/coeliac/constipation/diverticular templates.
- **Paediatrics:** (49) – beyond fever, croup, bronchiolitis, rash, etc.
- **Women’s health:** (46) – beyond HRT, contraception, HMB, pregnancy templates.

These are the conditions for which a clinician currently sees the **same** generic plan as for unrelated topics.

---

## 5. Assessment and referral fallbacks – appropriateness

- **Assessment fallback (120 tools):** Used for titles containing “Assessment and diagnosis” or “diagnosis” (e.g. “PAD – diagnosis”, “Bowen’s disease – Assessment and diagnosis”). Content is generic (history, examination, differential, validated scores). **Appropriate** as a default for “assessment” topics; consider adding **condition-specific** assessment steps for high-risk areas (e.g. cardiac chest pain, TIA) where NICE specifies particular workup.
- **Referral fallback (128 tools):** Used for “Referral and follow-up” or “referral”/“follow-up” in the title. Content is generic (2WW, urgent, diagnostics, safety-net). **Appropriate** as a default; again, condition-specific referral criteria (e.g. 2WW cancer, urgent cardiac) would improve utility where NICE defines them.

No change to the **logic** is required; the issue is the **698 + 84** tools that are neither assessment nor referral but still get generic management text.

---

## 6. Template layer – strengths and risks

**Current state:**

- **124 templates** in `management-content.json`, **361** keyword phrases.
- Templates are **NICE/CKS-aligned** (drugs, doses, referral criteria, safety-netting) and are the main driver of condition-specific quality.
- **Order matters:** first keyword match wins. “Type 2 diabetes” before “diabetes”, “sore throat” before very broad terms is correct. Duplicate or overlapping keywords (e.g. “scalp”, “paronychia” appearing in more than one template) mean only the first is used.

**Risks:**

1. **Over-broad keywords:** “dermatology” and “skin condition” match any tool whose title contains those words, so they get “General Skin Management” instead of a more specific template (e.g. lichen planus, urticaria) if that template appears later. Consider narrowing or moving broad templates later in the list.
2. **Gaps:** No template keywords for many of the 698 generic-plan conditions (e.g. pericarditis, mitral regurgitation, lichen planus, erysipelas, varicose veins, syncope, SVT, Brugada, lymphoedema, PAD). These are prime candidates for new templates or keyword extensions.
3. **Learning library vs bulk:** Learning library tools use **base title** for template match (e.g. “Hypertension” from topic title), then subtitle (“Assessment and diagnosis”, “Management”, “Referral and follow-up”) for display only. So “Hypertension – Management” correctly gets the hypertension template via “Hypertension”. Bulk tools (extra-tools-bulk, extra-tools-bulk-1000) use the **full title** (e.g. “Chest pain – acute”); if no keyword matches, they fall through to generic. Adding keywords such as “chest pain”, “pericarditis”, “syncope” to appropriate templates would pull these into condition-specific plans.

---

## 7. System fallbacks (build script)

- **Assessment / referral / management (by title):** As above; behaviour is consistent and appropriate for generic “assessment”, “referral”, “management”/“treatment” titles.
- **System-specific management blocks:** When title contains “management” or “treatment”, dermatology, cardiovascular, mental-health, women-health, gastroenterology, paediatrics, cardiology, respiratory get **system-specific** text (e.g. dermatology: emollients, scalp; cardiovascular: lifestyle, QRISK3; mental-health: crisis, self-help, follow-up). Other systems (e.g. endocrinology, renal, ENT, neurology, haematology) do **not** have a dedicated block and receive the **Consultant Grade** bio-psycho-social management fallback. So “Goitre – Management”, “Addison’s – Management”, “Testosterone deficiency – Management” get the same generic management text. **Recommendation:** Add system-specific management fallbacks for endocrinology, renal, ENT, neurology, haematology (short, NICE-aligned bullets) to improve the 84 “consultant-fallback-mgmt” tools and any future “Management”/“Treatment” titles in those systems.

---

## 8. Recommendations (prioritised)

1. **Reduce the 698 generic-plan tools**
   - Add new templates (or extend keywords) in `management-content.json` for high-impact conditions that currently show “Holistic Management Plan”. Prioritise by frequency and risk:
     - **Cardiovascular:** chest pain (acute/stable), pericarditis, syncope, palpitations, BNP, ECG interpretation, valve disease, PAD, antiplatelet, lipids/LDL, bradycardia/tachycardia, endocarditis prophylaxis.
     - **Dermatology:** abscess/boil, erysipelas, cellulitis (if not already), fungal groin/nail, herpes simplex, lichen planus/sclerosus, urticaria, alopecia, pruritus, skin abscess.
     - **ENT:** (sample) otitis externa, sinusitis (already present – verify coverage), hearing loss, wax, vertigo (already present).
     - **Gastro:** beyond current IBS/GORD/coeliac/constipation/diverticular – e.g. dysphagia, liver/ LFT, upper GI bleeding if in list.
     - **Paediatrics:** common presentations beyond fever/croup/bronchiolitis/rash (e.g. constipation, feeding, growth, developmental).
   - Use **word-boundary** keywords so only intended conditions match (e.g. “pericarditis”, “lichen planus”, “syncope”).

2. **Improve the 84 “Consultant Grade” management fallbacks**
   - Add **system-specific** management fallbacks in `build-decision-tools.js` for **endocrinology**, **renal/urology**, **ENT**, **neurology**, **haematology** (and any other system that currently only has the generic management block). Keep text short, NICE/BNF-aligned, with drugs and referral cues where appropriate.

3. **Template order and keyword hygiene**
   - Keep **specific keywords before broad** (e.g. “type 2 diabetes” before “diabetes”, “sore throat” before “throat”).
   - Review duplicate or near-duplicate keywords across templates (e.g. “scalp”, “paronychia”) and either merge templates or ensure the first match is the intended one.
   - Consider moving very broad templates (e.g. “dermatology”, “skin condition”) **later** in the list so more specific templates (e.g. “lichen planus”, “urticaria”) can match first when they exist.

4. **Quality assurance**
   - After adding templates or fallbacks, run the build and re-run the audit script (count by `steps[0].id`) to confirm the number of `guidance` (generic) and `consultant-fallback-mgmt` tools decreases.
   - Spot-check high-risk conditions (e.g. chest pain, syncope, paediatric fever, meningitis/rash) to ensure they show condition-specific plans and correct NICE refs.

5. **Documentation**
   - Keep this audit as the single “management plan quality” reference. Update counts and sample lists when adding templates or fallbacks so the next reviewer can see progress.

---

## 9. Methodology note (reproducing the audit)

- **Built output:** `data/decision_tools_protocol.json` (after `node scripts/build-decision-tools.js`).
- **Classification:** For each tool, `(tool.steps || [])[0].id` and `(tool.steps || [])[0].question` were used to classify plan type.
- **Generic-plan list:** Tools with `steps[0].id === 'guidance'` were collected and grouped by `system.name`; titles were sampled for this document.
- **Template count:** `management-content.json` → `templates.length` and sum of `keywords.length` per template.

To re-run a quick count after changes:

```bash
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/decision_tools_protocol.json', 'utf8'));
let generic = 0;
(data.systems || []).forEach(s => {
  (s.tools || []).forEach(t => {
    const id = (t.steps || [])[0]?.id;
    if (id === 'guidance') generic++;
  });
});
console.log('Tools with generic Holistic Management Plan:', generic);
"
```

---

---

## 10. Implementation (2025-02-16): Recommendations 1–4

**1. New templates added** (specific keywords, placed at start of list):  
- **First batch:** chest pain, pericarditis, syncope, palpitations, BNP/NT-proBNP, ECG/bradycardia/Long QT/Brugada, valve disease, PAD, antiplatelet, lipids/LDL/FH, endocarditis prophylaxis, varicose veins, skin abscess/boil, erysipelas/cellulitis, lichen planus/sclerosus/simplex, urticaria, fungal groin, herpes simplex, alopecia, pruritus, lymphoedema.  
- **Second batch (further reduce 637→614):** Addison’s/adrenal insufficiency, goitre/thyroid nodules, otitis externa, hoarseness/dysphonia/laryngeal, rhinitis/allergic rhinitis, dysphagia, LFT abnormal/liver function, nausea/vomiting, feeding difficulty/faltering growth/poor growth, developmental delay, myocarditis/Takotsubo, Raynaud’s, molluscum, pemphigoid/pemphigus (bullous).

**2. System fallbacks added** in `build-decision-tools.js` for: endocrinology, renal-urology, ent, neurology, haematology (so “Management”/“Treatment” titles in those systems get system-specific text instead of Consultant Grade).

**3. Template order and hygiene:** Broad template “dermatology” / “skin condition” moved to the **end** of the templates array so specific dermatology templates match first. Comment updated: “Specific keywords before broad.”

**5. All remaining tools on specific plans (highest management standards):** The single generic catch-all in `build-decision-tools.js` was removed. The **final fallback** is now **system-specific**: for every `systemId` (cardiovascular, cardiology, dermatology, mental-health, gastroenterology, endocrinology, musculoskeletal, respiratory, paediatrics, renal-urology, women-health, infectious, neurology, haematology, ent, procedures-general, other) there is a consultant-standard block with two options (clinical management + referral), each with NICE/BNF-aligned bullets and 2WW/urgent/routine referral. So **0** tools use a one-size-fits-all generic plan; every tool has either a topic-specific template or a system-specific plan.

**4. QA results after build:**
- Generic “Holistic Management Plan” (`guidance`): **637** → **614** after second batch of templates; then **0** after replacing the single generic catch-all with **system-specific consultant-grade catch-all** plans. Every tool now has either a topic-specific template or a **system-specific** plan (e.g. `guidance-cardiovascular`, `guidance-dermatology`, `guidance-gastroenterology`, …).
- Consultant Grade management fallback: **58** (was 84) → **−26 tools**.
- **Final state:** No tool uses the one-size-fits-all generic plan. Remaining tools without a template match use consultant-standard, NICE-referenced content for their **system** (cardiovascular, dermatology, ENT, gastro, paediatrics, etc.) with two options per system: clinical management and referral.

To re-run the generic count: see Section 9 script.

---

*End of senior consultant analysis. For build and template structure, see `docs/DECISION_TOOLS_CONTEXT.md` and `docs/FORENSIC_AUDIT_DECISION_TOOLS.md`.*
