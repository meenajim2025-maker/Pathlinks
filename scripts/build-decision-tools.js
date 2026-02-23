#!/usr/bin/env node
/**
 * Build data/decision_tools_protocol.json from:
 * - data/knowledge_base.json (learning library → 3 tools per topic: assessment, management, referral)
 * - scripts/nice-guideline-map.json
 * - scripts/management-content.json (topic-specific NICE-based management steps)
 * - scripts/extra-nice-tools.json
 * - scripts/extra-tools-bulk.json (bySystem)
 * Output: ~900 tools with real management steps (no "look at guidelines").
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const KB_PATH = path.join(PROJECT_ROOT, 'data', 'knowledge_base.json');
const NICE_MAP_PATH = path.join(__dirname, 'nice-guideline-map.json');
const MANAGEMENT_PATH = path.join(__dirname, 'management-content.json');
const EXTRA_TOOLS_PATH = path.join(__dirname, 'extra-nice-tools.json');
const BULK_PATH = path.join(__dirname, 'extra-tools-bulk.json');
const BULK_1000_PATH = path.join(__dirname, 'extra-tools-bulk-1000.json');
const OUT_PATH = path.join(PROJECT_ROOT, 'data', 'decision_tools_protocol.json');

function slug(s) {
  return (s || '')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'tool';
}

function findNiceRefs(title, map) {
  const t = (title || '').toLowerCase();
  const refs = new Set(map.defaultRefs || []);
  for (const [keyword, arr] of Object.entries(map.keywords || {})) {
    if (t.includes(keyword) && Array.isArray(arr)) arr.forEach(r => refs.add(r));
  }
  return Array.from(refs);
}

function evidenceFromTranscript(transcript) {
  if (!transcript || typeof transcript !== 'string') return null;
  const t = transcript.replace(/\s+/g, ' ').trim();
  if (t.length < 40) return null;
  return t.length <= 280 ? t : t.slice(0, 280) + '…';
}

/** Find first management template whose keywords match title (lowercase) using whole-word boundary. If matchAll, all keywords must match. */
function getManagementSteps(title, managementContent) {
  const t = (title || '').toLowerCase();
  const templates = managementContent.templates || [];
  for (const tmpl of templates) {
    const keywords = tmpl.keywords || [];
    const match = (kw) => {
      const escaped = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(t);
    };
    const matched = tmpl.matchAll ? keywords.every(match) : keywords.some(match);
    if (matched) return tmpl.steps;
  }
  return null;
}

/** Optional evidence string from the same template that matched getManagementSteps (for condition-specific evidence). */
function getManagementEvidence(title, managementContent) {
  const t = (title || '').toLowerCase();
  const templates = managementContent.templates || [];
  for (const tmpl of templates) {
    const keywords = tmpl.keywords || [];
    const match = (kw) => {
      const escaped = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(t);
    };
    const matched = tmpl.matchAll ? keywords.every(match) : keywords.some(match);
    if (matched) return (tmpl.evidence && String(tmpl.evidence).trim()) || null;
  }
  return null;
}

/** System-specific 3-part guidance (Assessment | Management | Referral). Used when no topic template matches, including for assessment/management/referral titles. */
const SYSTEM_GUIDANCE = (function () {
  const g = {
    cardiovascular: {
      id: 'guidance-cardiovascular',
      question: 'Cardiovascular (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• History: chest pain character, palpitations, syncope, breathlessness, oedema. Medication and risk factors.\n• Examination: BP, pulse (rate/rhythm), JVP, heart sounds, peripheral perfusion. NEWS2 if unwell.\n• Investigations: ECG, lipids, HbA1c; BNP if breathless; troponin if ACS suspected.\n• Red flags: Acute chest pain >15 min, syncope with exertion, acute SOB – 999. NICE NG72, NG106, NG185, NG196.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• CVD risk: QRISK3; statin if ≥10%. AF: CHA2DS2-VASc, ORBIT/HAS-BLED; DOAC first-line (apixaban, rivaroxaban, edoxaban, dabigatran). Hypertension: ACE-i/ARB/CCB per NG136.\n• Rate control: Beta-blocker or CCB (diltiazem); digoxin if sedentary. Chest pain: GTN prn; beta-blocker or CCB; aspirin, statin. Heart failure: four pillars (ACEi/ARB, beta-blocker, MRA, SGLT2i); diuretic for congestion.\n• Safety-net: When to call 999; follow-up and titration. NICE NG72, NG106, NG196.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• 2WW: Suspected cancer, severe valve disease. RACPC for stable angina (CTCA).\n• Urgent: ACS, haemodynamically unstable AF, acute HF, aortic dissection.\n• Routine: AF for rhythm control, refractory hypertension, PAD, arrhythmia workup. NICE NG12.' }
      ]
    },
    cardiology: {
      id: 'guidance-cardiology',
      question: 'Cardiology (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• History: chest pain character, palpitations, syncope, breathlessness, oedema. Medication and risk factors.\n• Examination: BP, pulse (rate/rhythm), JVP, heart sounds. NEWS2 if unwell.\n• Investigations: ECG, lipids, BNP if breathless; echo if murmur or HF suspected.\n• Red flags: Acute chest pain, syncope with exertion, acute SOB – 999. NICE NG72, NG106, NG185.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• QRISK3; statin. AF: anticoagulate per CHA2DS2-VASc; rate control (beta-blocker/CCB). Heart failure: four pillars; diuretic for congestion.\n• Angina: GTN, beta-blocker/CCB, aspirin, statin. Valve disease: treat HF and AF; endocarditis prophylaxis only per NG64.\n• Safety-net and follow-up. NICE NG106, NG196.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• 2WW: Severe valve disease, suspected cancer. RACPC for angina.\n• Urgent: ACS, unstable AF, acute HF.\n• Routine: AF for ablation/rhythm, refractory HF, pacing. NICE NG12.' }
      ]
    },
    dermatology: {
      id: 'guidance-dermatology',
      question: 'Dermatology (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• Distribution, duration, triggers, treatments tried. Skin type and sun exposure. Systemic symptoms.\n• Examine: morphology, site, extent; lymph nodes if concern. Dermoscopy if trained for pigmented lesions.\n• Red flags: Changing mole (asymmetry, border, colour, diameter); rapidly growing lesion; immunosuppression. Non-blanching rash in child – emergency. NICE NG12, NG14.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Emollients first-line for dry/eczema. Topical steroid: potency and duration by site (face/flexures mild; body potent; max 4 weeks). Antifungal for tinea. Infection: flucloxacillin or fusidic acid (limited use).\n• Acne: topical then oral doxycycline. Avoid long-term oral steroid without dermatology. NICE NG80, CG153, CKS.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• 2WW: Suspected melanoma, SCC, changing mole. NICE NG12, NG14.\n• Urgent: Erythroderma, generalised pustular flare, SJS/TEN.\n• Routine: Diagnostic uncertainty, failure of topical therapy, biologics, complex rashes. NICE CG153.' }
      ]
    },
    'mental-health': {
      id: 'guidance-mental-health',
      question: 'Mental Health (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• Risk: Suicide, self-harm, harm to others; access to means; recent change. PHQ-9, GAD-7 where appropriate.\n• Diagnosis: Depression, anxiety, psychosis, bipolar, eating disorder – duration, severity, functional impact.\n• Red flags: Acute risk to life; psychosis; severe self-neglect; safeguarding. Crisis numbers: 111, Samaritans 116 123. NICE NG222, NG226.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Depression: SSRI first-line (sertraline 50 mg); review at 2 weeks; CBT/IAPT for mild–moderate. Continue 6 months after remission. NICE NG222.\n• Anxiety: CBT first-line; SSRI if preferred or moderate–severe. Benzodiazepines short-term only. NICE NG226.\n• Do not leave at risk without safety plan and follow-up. NICE NG222.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• Urgent: Acute risk, psychosis, catatonia – crisis team or A&E.\n• IAPT: Mild–moderate depression/anxiety. CMHT: Severe, treatment-resistant, psychosis, bipolar, eating disorder, personality disorder (DBT). NICE NG12, NG222.' }
      ]
    },
    gastroenterology: {
      id: 'guidance-gastroenterology',
      question: 'Gastroenterology (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• History: dysphagia, weight loss, bleeding, change in bowel habit, pain, reflux, jaundice. Drug history (NSAIDs, PPI).\n• Examination: abdomen, mass, organomegaly; rectal if indicated. FBC, U&E, LFT, coeliac serology, FIT if ≥50 with change in bowel habit or IDA.\n• Red flags: Dysphagia, unexplained anaemia, rectal bleeding + concern, weight loss – 2WW. Acute abdomen – emergency. NICE NG12, NG20.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Dyspepsia: PPI 4–8 weeks; H. pylori test and treat if positive. IBS: dietary advice, mebeverine; low FODMAP if needed. Constipation: macrogol; stimulant if resistant. Diarrhoea: exclude C difficile if recent antibiotic; loperamide prn. NICE NG61, NG12.\n• Liver: LFT pattern; viral serology, ferritin if indicated. Avoid alcohol and hepatotoxics. NICE CKS.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• 2WW: Dysphagia, unexplained anaemia, rectal bleeding + red flags, FIT+. NICE NG12.\n• Emergency: Acute abdomen, GI bleed, pancreatitis, severe colitis.\n• Routine: IBD, refractory IBS, liver disease, Barrett’s surveillance. NICE NG12.' }
      ]
    },
    endocrinology: {
      id: 'guidance-endocrinology',
      question: 'Endocrinology (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• Tailor to the condition: history, examination, and investigations relevant to the endocrine presentation (e.g. thyroid: TFTs, TPO; diabetes: HbA1c, foot check; adrenal: electrolytes, short synacthen; calcium/bone: corrected Ca, PTH, vitamin D).\n• Red flags: Thyroid storm, severe hypo/hyperglycaemia, adrenal crisis, severe hypercalcaemia – emergency. NICE CKS, NG28, NG145.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Follow NICE CKS and Local formulary for the specific condition. Do not apply thyroid or diabetes advice to non-thyroid/non-diabetes topics (e.g. Cushing’s, Conn’s, steroid, pituitary have their own pathways).\n• General principles: sick-day rules for anyone on glucocorticoids; do not stop steroids abruptly; treat hypo-/hyperglycaemia and electrolyte disturbance as indicated. NICE CKS.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• 2WW: Pituitary/adrenal crisis, severe thyroid eye disease, suspected phaeochromocytoma crisis.\n• Urgent: Adrenal crisis, thyroid storm, severe DKA/HHS, severe hypercalcaemia.\n• Routine: Hyperthyroid, goitre/nodule with concern, type 1 diabetes, pituitary/adrenal/calcium disorders. Use topic-specific pathway where available. NICE NG12, NG145, NG28.' }
      ]
    },
    musculoskeletal: {
      id: 'guidance-musculoskeletal',
      question: 'Musculoskeletal (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• History: onset, trauma, mechanical vs inflammatory pattern, morning stiffness, systemic symptoms. Functional impact.\n• Examination: look, feel, move; joint line tenderness; neurological if spine/radiculopathy.\n• Red flags: Cauda equina (saddle numbness, retention, bilateral leg weakness) – emergency. Septic arthritis, suspected cord compression – urgent. Inflammatory arthritis (persistent synovitis) – 2WW. NICE NG59, NG100.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Acute pain: Paracetamol + NSAID (with PPI); avoid long-term NSAID. Back pain: advise activity; physio. Gout: naproxen or colchicine; allopurinol if recurrent. NICE NG59, NG219.\n• OA: Exercise, weight loss; topical NSAID for knee; oral NSAID short-term. Consider joint replacement referral if severe. NICE NG226.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• 2WW: Suspected RA (persistent synovitis), septic arthritis. NICE NG100.\n• Urgent: Cauda equina, septic arthritis, compartment syndrome.\n• Routine: Persistent pain after conservative treatment, carpal tunnel, frozen shoulder, joint replacement. NICE NG59, NG100.' }
      ]
    },
    respiratory: {
      id: 'guidance-respiratory',
      question: 'Respiratory (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• History: breathlessness, cough, wheeze, sputum, smoking, occupation. Exacerbation frequency, inhaler technique.\n• Examination: chest, SpO2, respiratory rate, wheeze/crackles. NEWS2 if unwell.\n• Red flags: Haemoptysis – 2WW. Severe asthma (silent chest, unable to complete sentences) – emergency. PE, pneumothorax – emergency. NICE NG12, NG80, NG115.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Asthma: ICS + SABA; step up per BTS/SIGN; check technique; MART if appropriate. NICE NG80.\n• COPD: LAMA/LABA; add ICS if exacerbations or eosinophils. Rescue pack (prednisolone + antibiotic). Smoking cessation essential. NICE NG115.\n• Cough: no antibiotic for acute bronchitis; consider ACE-i review. NICE NG120.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• 2WW: Haemoptysis, suspected lung cancer. NICE NG12.\n• Urgent: Severe asthma, PE, pneumothorax, life-threatening exacerbation.\n• Routine: Uncontrolled asthma/COPD, sleep apnoea, ILD, bronchiectasis. NICE NG115.' }
      ]
    },
    paediatrics: {
      id: 'guidance-paediatrics',
      question: 'Paediatrics (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• Traffic light (NG143) for fever/ill child: green/amber/red. Hydration, activity, urine output. Birth and developmental history if relevant.\n• Red flags: Non-blanching rash, meningism, bulging fontanelle, severe breathing difficulty, shock – emergency. Sepsis, dehydration – urgent. NICE NG51, NG143.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Fever: paracetamol/ibuprofen; safety-net. AOM: safety-net; amoxicillin if <2y bilateral or systemically unwell. UTI: MSU; trimethoprim/cephalexin. Croup: dexamethasone. NICE NG91, NG93, NG109, NG143.\n• Growth: plot centiles; refer if faltering. Development: refer if delay. NICE NG11, NG75.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• Emergency: Non-blanching rash, meningism, sepsis, severe croup, severe dehydration. NICE NG51.\n• 2WW: Safeguarding concern, developmental delay, suspected malignancy.\n• Routine: Recurrent UTI, faltering growth, behavioural/developmental. NICE NG11.' }
      ]
    },
    'renal-urology': {
      id: 'guidance-renal-urology',
      question: 'Renal & Urology (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• CKD: eGFR, ACR (repeat to confirm); BP; U&E; cause if unknown. AKI: volume status, drugs (NSAIDs, ACEi, nephrotoxics), obstruction. LUTS: voiding diary, retention (PVR), haematuria. UTI: MSU before antibiotic if possible (except simple cystitis in women).\n• Red flags: Visible haematuria – 2WW any age. Acute retention, anuria – emergency. Pyelonephritis with sepsis – admit. NICE NG12, NG97, NG109, NG203.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• CKD: BP <140/90 (or <130/80 if ACR >70 or diabetic). ACEi/ARB; SGLT2i if T2DM and eGFR ≥20. Avoid nephrotoxics. Anaemia: check Hb/ferritin if eGFR <60. Refer if eGFR <30 or rapid decline. NICE NG203.\n• UTI: Nitrofurantoin or trimethoprim 3 days (women), 7 days (men). Avoid nitrofurantoin if eGFR <45. NICE NG109.\n• LUTS: Alpha-blocker (tamsulosin); rule out retention. 5-alpha reductase inhibitor if enlarged prostate. NICE NG97.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• 2WW: Visible haematuria (any age); non-visible haematuria if ≥45 or risk factors. Suspected prostate cancer (nodule, raised PSA). NICE NG12, NG97.\n• Emergency: Acute retention, anuria, obstructed infected kidney.\n• Routine: CKD eGFR <30, BPH not controlled, stone, recurrent UTI, renal colic follow-up. NICE NG97, NG203.' }
      ]
    },
    'women-health': {
      id: 'guidance-women-health',
      question: "Women's & Reproductive Health (Consultant Standard)",
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• History: LMP, contraception, pregnancy possibility. Bleeding pattern (HMB, IMB, PCB, PMB), pain, discharge. Breast: lump, nipple change, family history.\n• Examination: abdominal/pelvic if indicated; breast if lump; speculum if bleeding/discharge. Pregnancy test if relevant.\n• Red flags: Postmenopausal bleeding – 2WW. Breast lump with concern – 2WW. Acute pelvic pain, haemodynamically unstable, suspected ectopic – urgent. NICE NG12, NG88, NG126.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• HMB: Levonorgestrel IUS first-line; tranexamic acid, mefenamic acid; COCP or progestogen. NICE NG88.\n• HRT: transdermal preferred if VTE risk; micronised progesterone or Mirena for endometrial protection; review annually. NICE NG23.\n• Vaginal infection: Candida – clotrimazole/fluconazole. BV – metronidazole. Trichomonas – metronidazole; contacts. PID – ofloxacin + metronidazole 14 days. NICE NG3, CKS.\n• Contraception: UKMEC; COCP/POP/implant/IUS/IUD; emergency levonorgestrel/ulipristal/Cu-IUD. NICE NG3.\n• Breast: mastitis – flucloxacillin, empty breast. Breast pain – exclude lump; reassurance. NICE CKS.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• 2WW: Postmenopausal bleeding (any vaginal bleeding after menopause); breast lump with concern; suspected ovarian/endometrial/cervical cancer. NICE NG12.\n• Urgent: Ectopic pregnancy, torsion, severe PID, tubo-ovarian abscess, haemodynamically unstable.\n• Routine: HMB not controlled, endometriosis, recurrent thrush, contraception complex, recurrent miscarriage. NICE NG88, NG126.' }
      ]
    },
    infectious: {
      id: 'guidance-infectious',
      question: 'Infectious Disease & Screening (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• History: travel, contacts, animals, bites, immunosuppression, recent antibiotics. Severity and focus of infection. Screening: age-appropriate programmes (cancer, CVD, diabetic eye).\n• Examination: focus (skin, chest, abdomen); sepsis screening (NEWS2, qSOFA).\n• Red flags: Sepsis, meningitis, non-blanching rash – emergency. HIV/TB risk – test and refer. NICE NG51, NG33, NG12.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Sepsis: immediate antibiotic per NG51; fluid; emergency referral. CAP: CURB-65; amoxicillin 5 days (low risk). Cellulitis: flucloxacillin; mark margin; admit if severe. Use local resistance data; 5-day courses. NICE NG138, NG141.\n• HIV: test; PrEP/PEP per NG122. TB: refer TB service. C. difficile: stop precipitant antibiotic; vancomycin or fidaxomicin. NICE NG199, NG33.\n• Viral: no antibiotic for cold, sinusitis <10 days, acute bronchitis. Influenza: oseltamivir if at-risk and <48 h. NICE NG84, NG120.' },
        { label: '3. Referral & screening', guidance: 'REFERRAL:\n• Emergency: Sepsis, meningitis, severe infection, necrotising fasciitis. NICE NG51.\n• 2WW: HIV positive, TB suspected. Routine: Recurrent infection, HIV management, travel medicine. NICE NG33.\n• Screening: Bowel (FIT 56–74), breast (50–71), cervical (25–64). CVD: NHS Health Check 40–74; QRISK3. Diabetic retinopathy: annual. AAA: men 65. NICE NG12, CG181.' }
      ]
    },
    neurology: {
      id: 'guidance-neurology',
      question: 'Neurology & Headache (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• Headache: character (thunderclap, progressive, unilateral cluster); migraine vs tension vs medication-overuse (≥10 days analgesia/month). Red flags: thunderclap, new ≥50y, progressive, focal neurology, papilloedema, fever + neck stiffness.\n• Seizure: first or breakthrough; driving. TIA: ABCD2; stroke mimic. Examination: consciousness, focal signs, fundi, neck stiffness.\n• Red flags: Thunderclap – 999. First seizure, stroke/TIA, meningism – urgent. New/progressive headache, suspected brain tumour – 2WW. NICE NG150, NG217, NG128, NG12.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Migraine: triptan + NSAID at onset; prophylaxis if ≥2/month (propranolol, amitriptyline, topiramate). Tension: paracetamol/NSAID; avoid medication-overuse. Cluster: O2 or sumatriptan SC; verapamil prophylaxis. MOH: withdraw overused analgesic; bridge + prophylaxis. NICE NG150.\n• First seizure: refer. Epilepsy: drug review; DVLA. TIA: aspirin 300 mg then 75 mg; refer same-day. Bell’s palsy: steroid within 72 h; eye care. NICE NG217, NG128, CKS.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• 2WW: New/progressive headache ≥50y or with focal signs; suspected brain tumour. First seizure, suspected MS, Parkinson’s. NICE NG12.\n• Emergency: Stroke, TIA (same-day), thunderclap, meningitis.\n• Routine: Chronic headache not controlled, epilepsy optimisation, neuropathy, cluster refractory. NICE NG217, NG71, NG150.' }
      ]
    },
    'pain-management': {
      id: 'guidance-pain-management',
      question: 'Pain Management (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• History: site, onset, character, red flags (weight loss, night pain, neurological deficit, fever). Biopsychosocial impact. Current and past analgesia; opioid duration/dose.\n• Red flags: Cauda equina, cord compression, fracture, infection, malignancy – urgent. NICE NG59, NG193.\n• Screen: depression, anxiety, function. Consider pain severity and goals. NICE NG193.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Acute: paracetamol + NSAID (short-term; PPI if GI risk). Opioid only if severe; lowest dose, short duration; avoid codeine where possible. NICE NG193.\n• Chronic non-cancer: non-pharmacological first (exercise, physio, psychological). Paracetamol; consider NSAID short-term. Neuropathic: gabapentin/pregabalin or amitriptyline. Opioid: only if benefit outweighs harm; regular review; avoid long-term where possible. NICE NG193, NG142.' },
        { label: '3. Opioid stewardship & referral', guidance: 'REFERRAL:\n• Opioid stewardship: set goals; taper if no benefit or harm; offer support. Do not start long-term opioid for chronic non-cancer pain without shared decision-making. NICE NG193.\n• Refer: pain service if complex or refractory; palliative for cancer pain; spinal/cauda equina – emergency. NICE NG59, NG142.' }
      ]
    },
    haematology: {
      id: 'guidance-haematology',
      question: 'Haematology & Anaemia (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• Anaemia: FBC, film, MCV (microcytic/macrocytic/normocytic). Iron studies (ferritin, transferrin saturation); B12, folate. Cause: bleed, malabsorption, diet, chronic disease, haemolysis. Haemolysis: LDH, bilirubin, haptoglobin, Coombs if indicated.\n• Anticoagulation: indication, renal function, bleeding risk (ORBIT/HAS-BLED). Thrombosis: Wells score, D-dimer.\n• Red flags: Unexplained anaemia with weight loss/bleeding – 2WW. Severe thrombocytopenia, bleeding on anticoagulant – urgent. Neutropenia with fever – urgent. NICE NG24, NG12, NG196.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Iron deficiency: oral ferrous sulfate first; IV if intolerant, malabsorption, or urgent. Treat cause; recheck Hb 2–4 weeks; continue 3 months after normal. NICE NG24.\n• B12: hydroxocobalamin IM (check folate first; do not give folate alone if B12 low). Folate: folic acid 5 mg; treat cause. ACD: treat underlying; IV iron only if CKD or inflammatory barrier. NICE NG241, NG24.\n• Anticoagulation: DOAC first-line for VTE/AF; warfarin if DOAC unsuitable. Reversal per drug. NICE NG196, NG158.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• 2WW: Unexplained anaemia with red flags, thrombocytopenia, lymphadenopathy, suspected lymphoma/leukaemia/myeloma. NICE NG12, NG24.\n• Urgent: Major bleed on anticoagulant, severe thrombocytopenia with bleeding, neutropenic sepsis.\n• Routine: Haemoglobinopathy, thrombophilia, anticoagulation advice, persistent unexplained anaemia, MGUS. NICE NG24.' }
      ]
    },
    ent: {
      id: 'guidance-ent',
      question: 'ENT & Allergy (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• Throat: FeverPAIN/Centor score; duration; dysphagia, stridor, drooling. Ear: pain, discharge, hearing loss, vertigo. Nose: rhinorrhoea, obstruction, epistaxis, smell. Voice: hoarseness duration. Allergy: triggers, seasonal vs perennial.\n• Examination: throat (tonsils, peritonsillar swelling); ears (canal, drum); nose (septum, polyps). Neck nodes if concern.\n• Red flags: Stridor, difficulty swallowing – urgent. Hoarseness >3 weeks – 2WW. Unilateral deafness, unilateral tinnitus, sudden sensorineural hearing loss – urgent ENT. NICE NG12, NG84, NG98.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Sore throat: FeverPAIN 0–1 – no antibiotic; 2–3+ – penicillin V 5–10 days (or clarithromycin). Quinsy: admit. Glandular fever: avoid amoxicillin. NICE NG84.\n• Ear: AOM – safety-net; antibiotic if systemically unwell or high risk. Otitis externa: topical acetic acid or antibiotic/hydrocortisone. Wax: olive oil or sodium bicarbonate; refer if impacted. NICE NG91.\n• Sinusitis: <10 days – no antibiotic; persistent/severe – penicillin or co-amoxiclav. NICE NG79.\n• Rhinitis: intranasal steroid first-line; add antihistamine. Nasal polyps: topical steroid. NICE CKS.\n• Epistaxis: pinch soft part 10–15 min; cautery if visible point. Vertigo: Epley if BPPV. NICE CKS.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• 2WW: Hoarseness >3 weeks, suspected head and neck cancer, unilateral oral lesion. NICE NG12.\n• Urgent: Stridor, quinsy, mastoiditis, sudden sensorineural hearing loss, posterior epistaxis with packing, malignant otitis externa.\n• Routine: Hearing loss, tinnitus, chronic sinusitis, glue ear, recurrent tonsillitis (per criteria), allergic rhinitis not controlled. NICE NG12, NG84, NG98.' }
      ]
    },
    ophthalmology: {
      id: 'guidance-ophthalmology',
      question: 'Ophthalmology & Eye (RCOphth Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT (RCOphth): Document four findings – visual acuity, pain (yes/no), photophobia, unilateral vs bilateral. Localised redness (pattern → diagnosis) vs generalised (history → diagnosis). Red flags requiring same-day specialist: corneal opacity/keratitis (white spot, contact lens wear, pain, photophobia); scleritis (deep boring pain, systemic disease); acute anterior uveitis/iritis (ciliary flush, small/irregular pupil); acute angle-closure glaucoma (pain, hard globe, nausea, semi-dilated pupil, age often 60+); chemical/trauma; painful red eye after surgery. Do not use topical steroid until cause known. RCOphth Emergency Eye Care; NICE CKS Red eye.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Conjunctivitis: Viral/allergic – cool compresses, lubricants; bacterial – chloramphenicol 0.5% 2-hourly 2 days then qds (fusidic acid if pregnant). Episcleritis: usually self-limiting; lubricants; refer if scleritis suspected. Subconjunctival haemorrhage: reassure; check BP if recurrent. Dry eye/blepharitis: lid hygiene, warm compresses, preservative-free tears. Stye/chalazion: warm compresses; chloramphenicol if infected. Chronic open-angle glaucoma: ophthalmology-led; prostaglandin first-line (NICE NG81). RCOphth; NICE CKS Red eye, NG81.' },
        { label: '3. Referral', guidance: 'REFERRAL (RCOphth): Same-day/emergency: corneal ulcer/keratitis (stop contact lenses); acute uveitis; acute angle-closure (acetazolamide if remote per policy); chemical injury (irrigate first); sudden painless vision loss (RAO/CRVO – stroke pathway if RAO); retinal detachment (floats/flashes); endophthalmitis (post-surgery). Urgent 24–48 h: scleritis, optic neuritis, GCA with visual symptoms. 2WW: referable diabetic retinopathy; new floaters with no detachment. Routine: chronic glaucoma, dry eye, blepharitis, chalazion. RCOphth Emergency Eye Care; NICE NG12, NG28, NG81.' }
      ]
    },
    'procedures-general': {
      id: 'guidance-procedures',
      question: 'Procedures & General Practice (Consultant Standard)',
      options: [
        { label: '1. Assessment & safety', guidance: 'ASSESSMENT:\n• Consent: capacity (MCA – understand, retain, weigh, communicate); decision-specific. Voluntary; information given. Child: Gillick competence; parental consent where appropriate. Document.\n• Safeguarding: child or adult at risk; document factually; follow local policy; discuss with named/designated professional. NICE NG76, NG108.\n• Fit note: clinical assessment; duration; phased return; "may be fit" with modifications. NICE NG108, gov.uk.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Procedures: aseptic technique; consent; correct kit (venepuncture bottles, cannula gauge); document site/date. Venepuncture: tourniquet time; label at bedside. Cannulation: secure; remove when not needed. Wound: clean; closure vs dressings; tetanus; suture removal by site. Minor surgery: consent; sterile technique; histology if excision. NICE CKS.\n• Palliative: anticipatory drugs; ReSPECT/DNAR; symptom control (pain, nausea, agitation, secretions). Verification of death: confirm absent pulse, breathing, response; MCCD if expected and within 28 days (14 Scotland). NICE NG142, NG108.' },
        { label: '3. Referral & governance', guidance: 'REFERRAL:\n• Safeguarding: social care, police, MARAC per policy; do not leave at risk. Capacity: Court of Protection if complex/dispute; IMCA if unbefriended. DoLS/LPS if deprivation of liberty.\n• Coroner: unexpected death, unknown cause, industrial disease, or per local protocol. Document; support family. NICE NG108.' }
      ]
    },
    other: {
      id: 'guidance-other',
      question: 'Other Clinical Topics (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• Cross-cutting: frailty (CFS, CGA if indicated), capacity (MCA – understand, retain, weigh, communicate), polypharmacy and indication for each drug. Safeguarding: adult/child at risk; document factually.\n• Red flags: weight loss, refeeding risk, neglect, abuse – escalate. Exclude organ-specific red flags (e.g. 2WW cancer) where relevant. NICE NG108, NG215, NG76, CKS.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Deprescribing: shared decision-making; one drug at a time; taper (e.g. benzodiazepine, PPI, statin in frailty). Multimorbidity: prioritise by patient goals; avoid treatment burden. Care home: structured review; antipsychotics only after non-drug approaches (NICE NG97). LPA: verify via OPG; health LPA when donor lacks capacity. Travel: vaccines, malaria, DVT; fitness to fly. Occupational/medicolegal: factual report; do not advise on legal outcome. NICE NG215, NG108, NG67, CKS.' },
        { label: '3. Referral & governance', guidance: 'REFERRAL:\n• Safeguarding: social care, MARAC per policy. Capacity: Court of Protection if complex/dispute; IMCA if unbefriended. DoLS/LPS to supervisory body if deprivation of liberty.\n• 2WW if cancer or red flags from assessment. Routine: frailty/CGA, deprescribing support, travel clinic, occupational health. Document and safety-net. NICE NG108, NG12.' }
      ]
    },
    triage: {
      id: 'guidance-triage',
      question: 'GP Triage – disposition (work through in order; stop at first Yes)',
      options: [
        { label: 'Emergency (999)', guidance: 'DISPOSITION: Emergency ambulance. Life-threatening or time-critical. Danger signs (WHO IITT, NICE): Airway/breathing (severe breathlessness, stridor, choking); Circulation (collapse, shock, severe bleeding, chest pain possible MI); Consciousness (unresponsive, GCS <15, seizure, stroke FAST, severe head injury); Anaphylaxis; Overdose/poisoning; Non-blanching rash (child); Severe self-harm/suicide risk. Sepsis: high-risk criteria (NG253/254/255). When in doubt, escalate. Do not delay. Refs: NICE NG51/NG253–255, CG176, NG143, NG10; NHS 111; WHO IITT; RCGP.' },
        { label: 'Same day / Urgent', guidance: 'DISPOSITION: Same-day GP, UTC or A&E by clinical need. Cannot wait 24–48 h: worsening symptoms, high fever, severe pain, dehydration, mental health crisis (risk assessment needed), head injury with NICE CG176 urgent imaging criteria, first seizure (if not 999), diabetic hypo/unwell, heavy bleeding, suspected fracture/dislocation, eye red/painful (RCOphth urgent), pregnancy bleeding. Direct booking per local policy. Refs: NICE CG176, NG143; NHS 111; RACGP after-hours urgency; RCGP remote care.' },
        { label: '24–48 h / Routine', guidance: 'DISPOSITION: GP or nurse appointment within 24–48 h. Stable but needs assessment: persistent symptoms with no red flags, follow-up after recent illness, medication review, chronic condition flare. Safety-net: when to reattend (amber/red flags); call 999 if worse. Refs: NICE CKS; NHS 111; ESTEEM trial (telephone triage); RCGP.' },
        { label: 'Self-care + safety-net', guidance: 'DISPOSITION: Self-care. Mild symptoms, no red flags; advice on symptom management and when to reattend (amber/red flags). Provide written or verbal safety-net; follow up with GP if no improvement in defined period. Shared decision-making; if uncertain, offer same-day or 24–48 h slot. Refs: NICE CKS; NHS 111 self-care; RCGP remote care.' }
      ],
      steps: [
        { id: 'triage-999', question: '1. Emergency (999)? Life-threatening or time-critical?', type: 'dropdown', options: [
          { label: 'Yes', guidance: 'DISPOSITION: Emergency ambulance. Danger signs: airway/breathing (severe breathlessness, stridor, choking); circulation (collapse, shock, severe bleeding, chest pain possible MI); consciousness (unresponsive, GCS <15, seizure, stroke FAST, severe head injury); anaphylaxis; overdose; non-blanching rash (child); severe self-harm/suicide. Sepsis high-risk (NG253–255). When in doubt, escalate. NICE NG51/NG253–255, CG176, NG143, NG10; NHS 111; WHO IITT; RCGP.' },
          { label: 'No', guidance: 'No – proceed to next question below.' }
        ]},
        { id: 'triage-same-day', question: '2. Same day / Urgent? Cannot wait 24–48 h?', type: 'dropdown', options: [
          { label: 'Yes', guidance: 'DISPOSITION: Same-day GP, UTC or A&E by clinical need. Worsening symptoms, high fever, severe pain, dehydration, mental health crisis, head injury urgent criteria (CG176), first seizure, diabetic hypo/unwell, heavy bleeding, fracture/dislocation, eye red/painful (RCOphth), pregnancy bleeding. NHS 111; RACGP after-hours; RCGP remote care.' },
          { label: 'No', guidance: 'No – proceed to next question below.' }
        ]},
        { id: 'triage-routine', question: '3. 24–48 h / Routine? Stable but needs assessment?', type: 'dropdown', options: [
          { label: 'Yes', guidance: 'DISPOSITION: GP or nurse within 24–48 h. Persistent symptoms, no red flags; follow-up after illness. Safety-net: reattend or 999 if worse. NICE CKS; NHS 111; ESTEEM trial; RCGP.' },
          { label: 'No', guidance: 'No – proceed to next question below.' }
        ]},
        { id: 'triage-self-care', question: '4. Self-care + safety-net appropriate?', type: 'dropdown', options: [
          { label: 'Yes', guidance: 'DISPOSITION: Self-care. Symptom advice; when to reattend (amber/red flags). Written or verbal safety-net; GP follow-up if no improvement. If uncertain, offer appointment. NICE CKS; NHS 111; RCGP remote care.' },
          { label: 'No', guidance: 'Reassess using questions above or arrange same-day/urgent review.' }
        ]}
      ]
    }
  };
  return g;
})();

function stepsFromGuidance(guid) {
  return [{
    id: guid.id,
    question: guid.question,
    type: 'dropdown',
    options: guid.options.map(o => ({ label: o.label, guidance: o.guidance }))
  }];
}

/** System-specific best practice management. No generic 'look at guidelines' placeholders. */
function getSystemFallbackSteps(systemId, title) {
  const t = (title || '').toLowerCase();

  // When title is assessment/management/referral and no template matched: use system 3-part guidance for all sections
  if (t.includes('assessment') || t.includes('diagnosis') || t.includes('management') || t.includes('treatment') || t.includes('referral') || t.includes('follow-up')) {
    return stepsFromGuidance(SYSTEM_GUIDANCE[systemId] || SYSTEM_GUIDANCE.other);
  }

  // 1. ASSESSMENT & DIAGNOSIS FALLBACKS
  if (t.includes('assessment') || t.includes('diagnosis')) {
    return [{
      id: 'bp-assessment',
      question: 'Assessment (Best Practice)',
      type: 'dropdown',
      options: [
        {
          label: 'Standard Assessment',
          guidance: 'MANAGEMENT PLAN:\n1. History: Assess onset, severity, and triggers. Specifically exclude organic red flags (weight loss, night pain, fever, night sweats).\n2. Review: Family history and current medications.\n3. Differential: Consider most likely vs most serious diagnosis. Use validated scores (e.g. Centor, Wells, qSOFA) if applicable.'
        },
        {
          label: 'Examination & Vitals',
          guidance: 'MANAGEMENT PLAN:\n1. Physical Exam: Perform focused physical exam (e.g. MSK, Neuro, Respiratory).\n2. Vitals: Check NEWS2 if systemically unwell.\n3. Documentation: Document findings and clinical rationale clearly.'
        }
      ]
    }];
  }

  // 2. MANAGEMENT & TREATMENT FALLBACKS
  if (t.includes('management') || t.includes('treatment')) {
    if (systemId === 'dermatology') {
      return [{
        id: 'derm-mgmt',
        question: 'Dermatology Management (Best Practice)',
        type: 'dropdown',
        options: [{
          label: 'General Skin Care & Emollients',
          guidance: 'MANAGEMENT PLAN:\n1. Skincare: Use soap substitutes (emollients) for washing. Avoid harsh soaps and detergents.\n2. Emollients: Apply liberal amounts of emollient cream/ointment frequently to maintain skin barrier.\n3. Triggers: Identify and avoid potential irritants or allergens.\n4. Scalp: If scalp involved, use medicinal shampoo (tar or ketoconazole).\n5. Safety-net: Return if signs of infection (weeping, crusting, fever) or no improvement in 2 weeks.'
        }]
      }];
    }

    if (systemId === 'cardiovascular') {
      return [{
        id: 'cvd-mgmt',
        question: 'Cardiovascular Management (Best Practice)',
        type: 'dropdown',
        options: [{
          label: 'CVD Risk & Lifestyle',
          guidance: 'MANAGEMENT PLAN:\n1. Lifestyle: Advise on low-salt/low-saturated fat diet (Mediterranean-style).\n2. Smoking: Refer to smoking cessation services if applicable.\n3. Exercise: Aim for 150 mins moderate activity/week.\n4. Weight: Target BMI 18.5-24.9.\n5. Audit: Periodically review blood pressure and lipid profile (QRISK3).'
        }]
      }];
    }

    if (systemId === 'mental-health') {
      return [{
        id: 'mh-mgmt',
        question: 'Mental Health Support (Best Practice)',
        type: 'dropdown',
        options: [{
          label: 'Immediate Support & Signposting',
          guidance: 'MANAGEMENT PLAN:\n1. Crisis: Provide emergency contact numbers (111, Samaritans 116 123, or local crisis team).\n2. Self-help: Recommend digital CBT resources or self-help books.\n3. Social: Encourage engagement with family/friends and maintaining routine.\n4. Review: Arrange follow-up (usually 1-2 weeks) to monitor risk and symptom progression.\n5. Safety-net: Advise patient to contact GP or A&E if suicidal ideation increases.'
        }]
      }];
    }

    if (systemId === 'women-health') {
      return [{
        id: 'women-mgmt',
        question: 'Women\'s & Reproductive Health (Best Practice)',
        type: 'dropdown',
        options: [
          { label: 'Contraception & HMB', guidance: 'MANAGEMENT PLAN:\n1. HMB: Levonorgestrel IUS first-line; tranexamic acid; mefenamic acid; COCP or progestogen. Pelvic US if fibroids. NICE NG88.\n2. Contraception: UKMEC; COCP/POP/implant/IUS/IUD; emergency levonorgestrel/ulipristal/Cu-IUD. NICE NG3, CKS.' },
          { label: 'Bleeding (IMB/PCB/PMB) & 2WW', guidance: 'MANAGEMENT PLAN:\n1. IMB/PCB: speculum; swabs. PMB: 2WW gynaecology (any bleeding after menopause). 2WW: ovarian/endometrial/cervical/breast concern. NICE NG12, NG88.' },
          { label: 'Infection & pelvic pain', guidance: 'MANAGEMENT PLAN:\n1. Candida: clotrimazole/fluconazole. BV: metronidazole. Trichomonas: metronidazole; treat contacts. PID: ofloxacin + metronidazole 14 days; contact tracing. Pelvic pain: exclude PID; consider endometriosis. NICE NG3, CKS.' },
          { label: 'Pregnancy & breast', guidance: 'MANAGEMENT PLAN:\n1. Miscarriage: expectant/medical/surgical; anti-D if Rh-negative. Mastitis: flucloxacillin; empty breast. Breast lump: 2WW. NICE NG126, NG12, CKS.' }
        ]
      }];
    }

    if (systemId === 'pain-management') {
      return [{
        id: 'pain-mgmt',
        question: 'Pain Management (Best Practice)',
        type: 'dropdown',
        options: [
          { label: 'Acute pain', guidance: 'MANAGEMENT PLAN:\n1. Paracetamol + NSAID (short-term; PPI if GI risk). Opioid only if severe; lowest dose, shortest duration; avoid codeine where possible. Red flags: fracture, infection, cauda equina – urgent. NICE NG193.' },
          { label: 'Chronic pain (non-cancer)', guidance: 'MANAGEMENT PLAN:\n1. Non-pharmacological first: exercise, physio, psychological (CBT/ACT). Paracetamol; NSAID short-term. Neuropathic: gabapentin/pregabalin or amitriptyline. Opioid only if benefit outweighs harm; regular review; taper if no benefit. NICE NG193.' },
          { label: 'Opioid stewardship / palliative', guidance: 'MANAGEMENT PLAN:\n1. Opioid stewardship: set goals; taper with support if no benefit. Palliative: stepwise analgesia (WHO ladder); anticipate breakthrough; anti-emetic/laxative. NICE NG193, NG142.' }
        ]
      }];
    }

    if (systemId === 'infectious') {
      return [{
        id: 'infectious-mgmt',
        question: 'Infectious Disease & Screening (Best Practice)',
        type: 'dropdown',
        options: [
          { label: 'Sepsis / CAP / antimicrobial', guidance: 'MANAGEMENT PLAN:\n1. Sepsis: NEWS2/qSOFA; antibiotic + fluid per NG51; emergency referral. CAP: CURB-65; amoxicillin 5 days if low risk. Cellulitis: flucloxacillin; mark margin. Use local resistance data; 5-day courses. NICE NG51, NG138, NG141.' },
          { label: 'HIV / TB / viral', guidance: 'MANAGEMENT PLAN:\n1. HIV: test; refer if positive. PrEP/PEP per NG122. TB: refer TB service. COVID antiviral per eligibility. Shingles: aciclovir <72 h; 2WW if ophthalmic. NICE NG33, NG122, CKS.' },
          { label: 'Bites / travel / needlestick', guidance: 'MANAGEMENT PLAN:\n1. Bite: clean; antibiotic if high risk; rabies/tetanus. Needlestick: risk assess; HBV vaccine/immunoglobulin; HIV PEP within 72 h. Travel: vaccines; malaria prophylaxis. NICE NG33, CKS.' },
          { label: 'Screening', guidance: 'MANAGEMENT PLAN:\n1. Cancer: bowel (FIT 56–74), breast (50–71), cervical (25–64). CVD: NHS Health Check 40–74; QRISK3. Diabetic retinopathy: annual. AAA: men 65. NICE NG12, CG181.' }
        ]
      }];
    }

    if (systemId === 'gastroenterology') {
      return [{
        id: 'gastro-mgmt',
        question: 'Gastroenterology Advice (Best Practice)',
        type: 'dropdown',
        options: [{
          label: 'Symptom Control & Red Flags',
          guidance: 'MANAGEMENT PLAN:\n1. Diet: Advise food diary to identify triggers; trial low-FODMAP if IBS suspected.\n2. Meds: Trial OTC treatments (antacids, loperamide, or laxatives) as appropriate.\n3. Red Flags: Urgently review if unintended weight loss, nocturnal symptoms, or family history of GI cancer.\n4. Review: Assess response to initial management in 4 weeks.'
        }]
      }];
    }

    if (systemId === 'renal-urology') {
      return [{
        id: 'renal-mgmt',
        question: 'Renal & Urology (Best Practice)',
        type: 'dropdown',
        options: [
          { label: 'CKD & AKI', guidance: 'MANAGEMENT PLAN:\n1. CKD: Stage eGFR/ACR; BP <140/90 (<130/80 if proteinuric). SGLT2i if T2DM and eGFR ≥20. Refer if eGFR <30 or rapid decline. NICE NG203.\n2. AKI: Treat cause; stop nephrotoxics; correct volume/electrolytes. Refer if stage 3 or no improvement. NICE NG148.' },
          { label: 'UTI & haematuria', guidance: 'MANAGEMENT PLAN:\n1. UTI: MSU if possible. Women: nitrofurantoin/trimethoprim 3 days. Men: 7 days. Avoid nitrofurantoin if eGFR <45. NICE NG109.\n2. Visible haematuria: 2WW urology any age. Non-visible: exclude UTI; 2WW if ≥45 or risk. NICE NG12.' },
          { label: 'LUTS / BPH / retention', guidance: 'MANAGEMENT PLAN:\n1. Alpha-blocker (tamsulosin) for voiding LUTS. Rule out retention and haematuria (2WW if visible). 5-ARI if enlarged prostate. NICE NG97.\n2. Acute retention: catheterise; urgent urology. Overactive bladder: anticholinergic or mirabegron. ED: PDE5i. NICE NG12, CKS.' }
        ]
      }];
    }

    if (systemId === 'paediatrics') {
      return [{
        id: 'paeds-mgmt',
        question: 'Paediatric Safety-Netting (Best Practice)',
        type: 'dropdown',
        options: [{
          label: 'Traffic Light Safety-Netting',
          guidance: 'MANAGEMENT PLAN:\n1. Hydration: Ensure adequate fluid intake (check wet nappies/urine output).\n2. Vitals: Monitor temperature and work of breathing.\n3. Red Flags: Advise immediate review (A&E) for non-blanching rash, seizures, bulging fontanelle, or severe lethargy.\n4. Use NICE NG143 Traffic Light system for assessment.'
        }]
      }];
    }

    if (systemId === 'cardiology' || t.includes('heart') || t.includes('cardio')) {
      return [{
        id: 'cardio-mgmt',
        question: 'Cardiology Management (RCP/BCS)',
        type: 'dropdown',
        options: [{
          label: 'Immediate Actions & Risk Strategy',
          guidance: 'MANAGEMENT PLAN:\n1. Diagnostics: Baseline ECG, BP, and Lipid profile mandatory.\n2. Risk Assessment: Calculate QRISK3; if AF present, calculate CHA2DS2-VASc and HAS-BLED.\n3. Lifestyle: Prioritize smoking cessation, cardioprotective diet (Mediterranean), and 150 min activity/week.\n4. Meds: Titrate RAAS blockade and Beta-blockers to HR/BP targets as per NICE/ESC.\n5. Safety-net: Urgent review (999) if cardiac chest pain (>15 mins), syncope, or acute desaturation.'
        }]
      }];
    }

    if (systemId === 'respiratory' || t.includes('lung') || t.includes('breath')) {
      return [{
        id: 'resp-mgmt',
        question: 'Respiratory Care Plan (BTS/SIGN)',
        type: 'dropdown',
        options: [{
          label: 'Symptom Control & ACBT',
          guidance: 'MANAGEMENT PLAN:\n1. Technique: Review inhaler technique (In-Check dial) and ensure spacers are used for MDIs.\n2. Non-Pharm: Advise ACBT (Active Cycle of Breathing Technique) and pulmonary rehabilitation if MRC score ≥3.\n3. Action Plan: Provide written asthma/COPD action plan including rescue pack triggers (e.g. Prednisolone 30mg for 5 days).\n4. Safety-net: Urgently review if increased work of breathing, silent chest, or inability to complete sentences.'
        }]
      }];
    }

    if (systemId === 'endocrinology') {
      return [{
        id: 'endo-mgmt',
        question: 'Endocrinology (Best Practice)',
        type: 'dropdown',
        options: [{
          label: 'Hormone & Metabolic Review',
          guidance: 'MANAGEMENT PLAN:\n1. Thyroid: If abnormal TFTs, repeat with TPO ab; treat or refer per NICE NG145. Avoid routine T3.\n2. Diabetes: HbA1c target 48–53 mmol/mol; metformin first-line; add SGLT2i if CVD/HF/CKD. NICE NG28.\n3. Adrenal: Do not stop steroids abruptly; sick-day rules. Refer if Addison’s suspected.\n4. Safety-net: Red flags – thyroid storm, severe hypoglycaemia, DKA. NICE CKS.'
        }]
      }];
    }

    if (systemId === 'ent') {
      return [{
        id: 'ent-mgmt',
        question: 'ENT & Allergy (Best Practice)',
        type: 'dropdown',
        options: [
          { label: 'Throat (sore throat / quinsy / 2WW)', guidance: 'MANAGEMENT PLAN:\n1. Sore throat: FeverPAIN 0–1 – no antibiotic; 2–3+ – penicillin V 5–10 days. Quinsy: admit. Glandular fever: avoid amoxicillin. 2WW: hoarseness >3 weeks. NICE NG84, NG12.' },
          { label: 'Ear (AOM / otitis externa / hearing)', guidance: 'MANAGEMENT PLAN:\n1. AOM: safety-net; antibiotic if systemically unwell. Otitis externa: topical acetic acid or antibiotic/hydrocortisone; malignant (diabetic/immunosuppressed) – urgent. Wax: olive oil; refer if impacted. Sudden unilateral hearing loss – urgent ENT. NICE NG91, NG98.' },
          { label: 'Nose & allergy (sinusitis / rhinitis / epistaxis)', guidance: 'MANAGEMENT PLAN:\n1. Sinusitis: no antibiotic <10 days; penicillin/co-amoxiclav if persistent. Rhinitis: intranasal steroid; add antihistamine. Epistaxis: pinch 10–15 min; cautery if visible. NICE NG79, CKS.' },
          { label: 'Vertigo / 2WW', guidance: 'MANAGEMENT PLAN:\n1. BPPV: Epley. Labyrinthitis: supportive; prochlorperazine short-term. Red flags: central vertigo, focal neurology – urgent. 2WW: hoarseness >3 weeks, suspected cancer. NICE NG12, CKS.' }
        ]
      }];
    }

    if (systemId === 'neurology') {
      return [{
        id: 'neuro-mgmt',
        question: 'Neurology & Headache (Best Practice)',
        type: 'dropdown',
        options: [
          { label: 'Headache', guidance: 'MANAGEMENT PLAN:\n1. Migraine: triptan + NSAID at onset; prophylaxis if ≥2/month (propranolol, amitriptyline, topiramate). Tension: paracetamol/NSAID. Cluster: O2 or sumatriptan SC; verapamil prophylaxis. MOH: withdraw overused drug; limit acute to <10 days/month. NICE NG150.\n2. Red flags: Thunderclap – 999; new ≥50y or progressive – 2WW. NICE NG12.' },
          { label: 'Seizure / TIA / stroke', guidance: 'MANAGEMENT PLAN:\n1. First seizure: refer. Epilepsy: review meds; driving (DVLA). TIA: aspirin 300 mg then 75 mg; refer same-day. Stroke: 999. NICE NG217, NG128.' },
          { label: 'Cranial nerve / neuropathy', guidance: 'MANAGEMENT PLAN:\n1. Bell\'s palsy: steroid within 72 h; eye care. Trigeminal neuralgia: carbamazepine; refer. Peripheral neuropathy: B12, glucose; refer if cause unclear. NICE NG150, CKS.' }
        ]
      }];
    }

    if (systemId === 'haematology') {
      return [{
        id: 'haem-mgmt',
        question: 'Haematology & Anaemia (Best Practice)',
        type: 'dropdown',
        options: [
          { label: 'Anaemia (iron / B12 / folate)', guidance: 'MANAGEMENT PLAN:\n1. Iron: ferrous sulfate oral first; IV if intolerant or urgent. Recheck Hb 2–4 weeks; continue 3 months after normal; treat cause. B12: hydroxocobalamin IM; check folate first. Folate: folic acid 5 mg. ACD: treat cause; IV iron only if CKD/inflammatory. 2WW if unexplained or red flags. NICE NG24, NG241.' },
          { label: 'Anticoagulation & thrombosis', guidance: 'MANAGEMENT PLAN:\n1. DOAC first-line for VTE/AF; warfarin if unsuitable. Bleeding risk: ORBIT/HAS-BLED. Reversal: idarucizumab (dabigatran); andexanet (apixaban/rivaroxaban); vitamin K + PCC (warfarin). DVT/PE: treat ≥3 months; extend if unprovoked. NICE NG196, NG158.' },
          { label: 'Cytopenia & 2WW', guidance: 'MANAGEMENT PLAN:\n1. Thrombocytopenia: exclude drugs; refer if unexplained or <50 or bleeding. 2WW: unexplained cytopenia, lymphadenopathy, suspected lymphoma/leukaemia. Urgent: severe bleed on anticoagulant, neutropenic sepsis. NICE NG24, NG12.' }
        ]
      }];
    }

    if (systemId === 'ophthalmology') {
      return [{
        id: 'ophthalmology-mgmt',
        question: 'Ophthalmology & Eye (RCOphth Best Practice)',
        type: 'dropdown',
        options: [
          { label: 'Red eye – same-day (RCOphth)', guidance: 'MANAGEMENT PLAN:\n1. Same-day ophthalmology: Corneal ulcer/keratitis (pain, photophobia, contact lens – stop lenses); acute uveitis/iritis (ciliary flush, small pupil); acute angle-closure glaucoma (pain, hard globe, nausea); scleritis (deep pain); chemical/trauma; painful red eye post-surgery. Document: VA, pain, photophobia, unilateral/bilateral. Do not give steroid until cause known. RCOphth Emergency Eye Care; NICE CKS Red eye.' },
          { label: 'Conjunctivitis / episcleritis / benign', guidance: 'MANAGEMENT PLAN:\n1. Bacterial: chloramphenicol 0.5% 2-hourly 2 days then qds (fusidic acid if pregnant). Viral/allergic: cool compresses, lubricants. Episcleritis: self-limiting; lubricants. Subconjunctival haemorrhage: reassure; check BP if recurrent. Safety-net for red flags. RCOphth; NICE CKS.' },
          { label: 'Dry eye / blepharitis / stye / chalazion', guidance: 'MANAGEMENT PLAN:\n1. Dry eye: preservative-free tears (hypromellose, carmellose); lid hygiene. Blepharitis: warm compresses, lid massage, hygiene. Stye: warm compresses; chloramphenicol if infected. Chalazion: warm compresses; refer if large/persistent. NICE CKS.' },
          { label: 'Acute vision loss / emergency', guidance: 'MANAGEMENT PLAN:\n1. Emergency/same-day: Sudden painless loss (RAO – stroke pathway; CRVO); retinal detachment (floats/flashes); acute angle-closure (acetazolamide if remote); endophthalmitis (post-surgery). Chemical: irrigate then refer. RCOphth Emergency Eye Care; NICE NG81.' },
          { label: 'Glaucoma / diabetic retinopathy', guidance: 'MANAGEMENT PLAN:\n1. Chronic open-angle: ophthalmology-led; prostaglandin first-line (NICE NG81). Acute angle-closure: emergency referral. Diabetic retinopathy: annual screening; refer if referable disease. NICE NG28, NG81; RCOphth.' }
        ]
      }];
    }

    if (systemId === 'procedures-general') {
      return [{
        id: 'procedures-mgmt',
        question: 'Procedures & General Practice (Best Practice)',
        type: 'dropdown',
        options: [
          { label: 'Consent / capacity / fit note', guidance: 'MANAGEMENT PLAN:\n1. Consent: assess capacity (MCA); decision-specific; document. Child: Gillick; parental consent where appropriate. Fit note: duration; phased return; "may be fit" with modifications. NICE NG108, gov.uk.' },
          { label: 'Safeguarding', guidance: 'MANAGEMENT PLAN:\n1. Document factually; do not investigate alone. Child: refer to children\'s social care; police if immediate risk. Adult: refer per local policy; MARAC if high risk. Discuss with named/designated professional. NICE NG76, NG108.' },
          { label: 'Procedures (venepuncture / wound / minor surgery)', guidance: 'MANAGEMENT PLAN:\n1. Aseptic technique; consent. Venepuncture: correct bottles; label at bedside. Wound: clean; closure/dressings; tetanus; suture removal by site. Minor surgery: consent; histology if excision. NICE CKS.' },
          { label: 'Palliative / ACP / verification of death', guidance: 'MANAGEMENT PLAN:\n1. ACP: ReSPECT/DNAR; preferences for CPR, place of death. Anticipatory drugs; symptom control. Verification: confirm death; MCCD if expected and within 28 days; coroner if unexpected. NICE NG142, NG108.' }
        ]
      }];
    }

    if (systemId === 'other') {
      return [{
        id: 'other-clinical-mgmt',
        question: 'Other Clinical Topics (Best Practice)',
        type: 'dropdown',
        options: [
          { label: 'Deprescribing / polypharmacy', guidance: 'MANAGEMENT PLAN:\n1. Medicines review: indication for each drug; stop if no benefit or harm. One drug at a time; taper (e.g. benzodiazepine 1/8 dose every 2–4 weeks; PPI trial stop; statin in frailty/life-limiting per NG215). Document shared decision-making. NICE NG215, CKS, deprescribing.org.' },
          { label: 'Frailty / multimorbidity / care home', guidance: 'MANAGEMENT PLAN:\n1. Frailty: CFS; CGA if indicated. Multimorbidity: prioritise by patient goals; reduce treatment burden. Care home: structured medication review; antipsychotics only after non-drug approaches; regular review. DNAR/ACP documented. NICE NG67, NG97, NG114, CKS.' },
          { label: 'Capacity / LPA / advance care', guidance: 'MANAGEMENT PLAN:\n1. Capacity: MCA – understand, retain, weigh, communicate; decision-specific; best interests if lacking. LPA: verify via OPG; health LPA only when donor lacks capacity. ACP/ReSPECT: preferences for CPR, place of care. DoLS/LPS if deprivation of liberty. NICE NG108, NG142.' },
          { label: 'Travel / occupational / medicolegal', guidance: 'MANAGEMENT PLAN:\n1. Travel: vaccines (NaTHNaC); malaria prophylaxis; DVT/fitness to fly. Occupational: factual report; recommend OH referral for work-related health. Medicolegal: factual report only; do not advise on legal outcome. NICE CKS, gov.uk travel.' },
          { label: 'General (NICE CKS + safety-net)', guidance: 'MANAGEMENT PLAN:\n1. Apply NICE CKS and local guidelines for the specific topic. Document findings and plan. Safety-net: when to reattend, red flags. Refer per indication (2WW if cancer/red flags). NICE CKS, NG12.' }
        ]
      }];
    }

    // Default generic management - Consultant Grade Fallback
    return [{
      id: 'consultant-fallback-mgmt',
      question: 'Management Strategy (Consultant Grade)',
      type: 'dropdown',
      options: [
        {
          label: 'Bio-Psycho-Social Approach',
          guidance: 'MANAGEMENT PLAN:\n1. Biological: Optimize physiological factors (nutrition, sleep, activity) and review pharmacological options via local clinical formulary.\n2. Psychological: Assess impact on mental wellbeing; utilize psycho-education and shared-decision making tools.\n3. Social: Address occupational, relational, and environmental drivers. Signpost to social prescribing if appropriate.\n4. Safety-net: Advise specific red flags (e.g. weight loss, night sweats, localized pain) and arrange follow-up based on clinical trajectory (standard 2-4 weeks).'
        }
      ]
    }];
  }

  // 3. REFERRAL & FOLLOW-UP FALLBACKS
  if (t.includes('referral') || t.includes('follow-up')) {
    return [{
      id: 'bp-referral',
      question: 'Referral & Follow-up (Best Practice)',
      type: 'dropdown',
      options: [
        {
          label: 'Referral & Clinical Triage',
          guidance: "MANAGEMENT PLAN:\n1. Triage: Refer via 2WW if malignancy suspected. Use 'Urgent' (within 2 weeks) for rapidly progressive non-malignant disease.\n2. Diagnostics: Ensure all mandatory primary care work-up (e.g. CT, Bloods, Scans) is completed before referral to prevent rejection.\n3. Safety-net: Ensure the patient understands the expected waiting time and knows who to contact if symptoms escalate."
        }
      ]
    }];
  }

  // Final catch-all: system 3-part guidance (Assessment | Management | Referral)
  // Triage: use multi-step yes/no disposition flow if available
  if (systemId === 'triage') {
    const triageGuidance = SYSTEM_GUIDANCE.triage;
    if (triageGuidance && triageGuidance.steps && triageGuidance.steps.length) return triageGuidance.steps;
  }
  return stepsFromGuidance(SYSTEM_GUIDANCE[systemId] || SYSTEM_GUIDANCE.other);
}

function buildTool(opts) {
  const { title, niceRefs, evidence, steps, episode } = opts;
  const id = slug(title).slice(0, 60);
  return {
    id,
    title,
    niceRefs: niceRefs || [],
    evidence: evidence || `Management per ${(niceRefs || []).slice(0, 2).join(' and ') || 'NICE CKS'}.`,
    steps: steps || [],
    episode
  };
}

function buildToolFromTopic(section, topic, niceMap, managementContent, subtitle) {
  const baseTitle = (topic.title || '').replace(/_/g, ' ').trim() || 'Clinical topic';
  const title = subtitle ? `${baseTitle} – ${subtitle}` : baseTitle;
  const niceRefs = findNiceRefs(baseTitle, niceMap);
  const evidence = evidenceFromTranscript(topic.transcript) || getManagementEvidence(baseTitle, managementContent);
  const templateSteps = getManagementSteps(baseTitle, managementContent);
  const steps = templateSteps || getSystemFallbackSteps(section.id, title);
  return buildTool({ title, niceRefs, evidence, steps, episode: topic.episode });
}

function buildToolFromExtra(extra, niceMap, managementContent) {
  const title = (extra.title || '').trim();
  const systemId = extra.systemId || 'other';
  const niceRefs = extra.niceRefs && extra.niceRefs.length ? extra.niceRefs : findNiceRefs(title, niceMap);
  const templateSteps = getManagementSteps(title, managementContent);
  const steps = templateSteps || getSystemFallbackSteps(systemId, title);
  const evidence = getManagementEvidence(title, managementContent) || `Management per ${niceRefs.slice(0, 2).join(' and ')}.`;
  return buildTool({ title, niceRefs, evidence, steps });
}

function buildToolFromBulkTitle(systemId, title, niceMap, managementContent) {
  const niceRefs = findNiceRefs(title, niceMap);
  const templateSteps = getManagementSteps(title, managementContent);
  const steps = templateSteps || getSystemFallbackSteps(systemId, title);
  const evidence = getManagementEvidence(title, managementContent) || `Management per ${niceRefs.slice(0, 2).join(' and ') || 'NICE CKS'}.`;
  return buildTool({ title, niceRefs, evidence, steps });
}

function main() {
  const kb = JSON.parse(fs.readFileSync(KB_PATH, 'utf8'));
  const niceMap = JSON.parse(fs.readFileSync(NICE_MAP_PATH, 'utf8'));
  const managementContent = JSON.parse(fs.readFileSync(MANAGEMENT_PATH, 'utf8'));
  const extraJson = JSON.parse(fs.readFileSync(EXTRA_TOOLS_PATH, 'utf8'));
  const extraTools = extraJson.tools || [];
  const bulkJson = JSON.parse(fs.readFileSync(BULK_PATH, 'utf8'));
  const bySystem = bulkJson.bySystem || {};

  const systemsById = new Map();
  (kb.sections || []).forEach(s => {
    systemsById.set(s.id, { id: s.id, name: s.name, tools: [] });
  });

  // Learning library: 1 tool per topic (Management only) to avoid same content under 3 headings (Assessment/Management/Referral)
  // Skip Croup so we only emit one Croup tool from extra-nice-tools
  const skipInKb = new Set(['Croup', 'Parvovirus B19']);
  (kb.sections || []).forEach(section => {
    const sys = systemsById.get(section.id) || { id: section.id, name: section.name, tools: [] };
    if (!systemsById.has(section.id)) systemsById.set(section.id, sys);
    (section.topics || []).forEach(topic => {
      if (skipInKb.has((topic.title || '').trim())) return;
      sys.tools.push(buildToolFromTopic(section, topic, niceMap, managementContent, 'Management'));
    });
  });

  // Extra NICE tools (single tool per entry)
  extraTools.forEach(extra => {
    const systemId = extra.systemId || 'other';
    let sys = systemsById.get(systemId);
    if (!sys) {
      sys = { id: systemId, name: systemId.replace(/-/g, ' '), tools: [] };
      systemsById.set(systemId, sys);
    }
    sys.tools.push(buildToolFromExtra(extra, niceMap, managementContent));
  });

  // Bulk by system
  for (const [systemId, titles] of Object.entries(bySystem)) {
    let sys = systemsById.get(systemId);
    if (!sys) {
      sys = { id: systemId, name: systemId.replace(/-/g, ' '), tools: [] };
      systemsById.set(systemId, sys);
    }
    const name = kb.sections && kb.sections.find(s => s.id === systemId);
    if (name) sys.name = name.name;
    (titles || []).forEach(title => {
      sys.tools.push(buildToolFromBulkTitle(systemId, title, niceMap, managementContent));
    });
  }

  // Additional ~1000 conditions (same pattern: template or system fallback)
  let bulk1000 = [];
  try {
    const bulk1000Json = JSON.parse(fs.readFileSync(BULK_1000_PATH, 'utf8'));
    bulk1000 = bulk1000Json.tools || [];
  } catch (e) { /* optional file */ }
  bulk1000.forEach(item => {
    const systemId = item.systemId || 'other';
    let sys = systemsById.get(systemId);
    if (!sys) {
      sys = { id: systemId, name: systemId.replace(/-/g, ' '), tools: [] };
      systemsById.set(systemId, sys);
    }
    const name = kb.sections && kb.sections.find(s => s.id === systemId);
    if (name) sys.name = name.name;
    sys.tools.push(buildToolFromBulkTitle(systemId, item.title, niceMap, managementContent));
  });

  const systems = Array.from(systemsById.values()).filter(s => s.tools.length > 0);
  // Sort tools alphabetically by title within each system for predictable, findable order
  systems.forEach(s => {
    (s.tools || []).sort((a, b) => (a.title || '').localeCompare(b.title || '', 'en', { sensitivity: 'base' }));
  });
  // Deduplicate: same system + same title => keep first only (avoids multiple "Croup", "Bronchiolitis", etc.)
  systems.forEach(s => {
    const seen = new Set();
    s.tools = (s.tools || []).filter(t => {
      const key = (t.title || '').trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
  let totalTools = 0;
  systems.forEach(s => { totalTools += s.tools.length; });

  const builtAt = new Date().toISOString();
  const protocolVersion = 2;
  const out = {
    source: 'Learning library + NICE CKS/NG; management steps from guidelines',
    protocolVersion,
    builtAt,
    generated: builtAt,
    totalTools,
    systems: systems.map(s => ({ id: s.id, name: s.name, tools: s.tools }))
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Wrote ${totalTools} decision tools to ${OUT_PATH}`);
  const croupCount = systems.reduce((n, s) => n + (s.tools || []).filter(t => /croup/i.test(t.title || '')).length, 0);
  if (croupCount !== 1) console.warn(`WARN: Expected 1 Croup tool, got ${croupCount}`);

  // Tools index for API/external search: id, title, system, niceRefs
  const index = { protocolVersion, builtAt, totalTools, tools: [] };
  systems.forEach(s => {
    (s.tools || []).forEach(t => {
      index.tools.push({
        id: t.id,
        title: t.title,
        system: s.id,
        systemName: s.name,
        niceRefs: t.niceRefs || []
      });
    });
  });
  const indexPath = path.join(PROJECT_ROOT, 'data', 'tools-index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 0), 'utf8');
  console.log(`Wrote tools index to ${indexPath}`);
  const appDataPath = path.join(PROJECT_ROOT, 'app', 'data');
  try {
    fs.mkdirSync(appDataPath, { recursive: true });
    fs.copyFileSync(OUT_PATH, path.join(appDataPath, 'decision_tools_protocol.json'));
    fs.copyFileSync(indexPath, path.join(appDataPath, 'tools-index.json'));
    const sandboxPath = path.join(PROJECT_ROOT, 'data', 'sandbox_scenarios.json');
    if (fs.existsSync(sandboxPath)) {
      fs.copyFileSync(sandboxPath, path.join(appDataPath, 'sandbox_scenarios.json'));
    }
    console.log('Copied protocol and index to app/data/');
  } catch (e) {
    console.warn('Could not copy to app/data:', e.message);
  }
}

main();
