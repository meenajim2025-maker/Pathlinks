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

/** Find first management template whose keywords match title (lowercase) using whole-word boundary. */
function getManagementSteps(title, managementContent) {
  const t = (title || '').toLowerCase();
  const templates = managementContent.templates || [];
  for (const tmpl of templates) {
    const keywords = tmpl.keywords || [];
    if (keywords.some(kw => {
      const escaped = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      return regex.test(t);
    })) return tmpl.steps;
  }
  return null;
}

/** System-specific best practice management. No generic 'look at guidelines' placeholders. */
function getSystemFallbackSteps(systemId, title) {
  const t = (title || '').toLowerCase();

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
          guidance: 'MANAGEMENT PLAN:\n1. Crisis: Provide emergency contact numbers (NHS 111, Samaritans 116 123, or local crisis team).\n2. Self-help: Recommend digital CBT resources or self-help books.\n3. Social: Encourage engagement with family/friends and maintaining routine.\n4. Review: Arrange follow-up (usually 1-2 weeks) to monitor risk and symptom progression.\n5. Safety-net: Advise patient to contact GP or A&E if suicidal ideation increases.'
        }]
      }];
    }

    if (systemId === 'women-health') {
      return [{
        id: 'women-mgmt',
        question: 'Women\'s Health Advice (Best Practice)',
        type: 'dropdown',
        options: [{
          label: 'General Guidance & Red Flags',
          guidance: 'MANAGEMENT PLAN:\n1. History: Confirm LMP and pregnancy status if relevant.\n2. Red Flags: Urgent referral if post-menopausal bleeding, persistent intermenstrual bleeding, or unexplained pelvic mass.\n3. Symptom Diary: Encourage tracking of menstrual cycle and symptoms for next review.\n4. Review: Review in 12 weeks to assess treatment efficacy (e.g. for HMB or HRT).'
        }]
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

    if (systemId === 'paediatrics') {
      return [{
        id: 'paeds-mgmt',
        question: 'Paediatric Safety-Netting (Best Practice)',
        type: 'dropdown',
        options: [{
          label: 'Traffic Light Safety-Netting',
          guidance: 'MANAGEMENT PLAN:\n1. Hydration: Ensure adequate fluid intake (check wet nappies/urine output).\n2. Vitals: Monitor temperature and work of breathing.\n3. Red Flags: Advise immediate review (A&E) for non-blanching rash, seizures, bulging fontanelle, or severe lethargy.\n4. Triage: Use NICE NG143 Traffic Light system for assessment.'
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

    if (systemId === 'renal-urology') {
      return [{
        id: 'renal-mgmt',
        question: 'Renal & Urology (Best Practice)',
        type: 'dropdown',
        options: [{
          label: 'Kidney, LUTS & Red Flags',
          guidance: 'MANAGEMENT PLAN:\n1. CKD: Monitor eGFR, ACR, BP; avoid nephrotoxics. SGLT2i if T2DM and eGFR ≥20. Refer if eGFR <30 or rapid decline. NICE NG203.\n2. LUTS: Trial alpha-blocker (e.g. tamsulosin); rule out retention. Refer if retention, recurrent UTI, or haematuria.\n3. Red flags: 2WW visible haematuria; non-visible with eGFR <60. Emergency if anuria, acute retention. NICE NG97, NG12.'
        }]
      }];
    }

    if (systemId === 'ent') {
      return [{
        id: 'ent-mgmt',
        question: 'ENT (Best Practice)',
        type: 'dropdown',
        options: [{
          label: 'Ear, Nose, Throat & Safety-net',
          guidance: 'MANAGEMENT PLAN:\n1. Throat: FeverPAIN/Centor for sore throat; penicillin V or clarithromycin if 2–3+. NICE NG84.\n2. Ear: AOM safety-netting; topical for otitis externa. NICE NG91.\n3. Nose: Topical steroid for rhinitis; consider allergy referral if severe.\n4. Red flags: 2WW hoarseness >3 weeks; unilateral deafness; suspected cancer. NICE NG12.'
        }]
      }];
    }

    if (systemId === 'neurology') {
      return [{
        id: 'neuro-mgmt',
        question: 'Neurology (Best Practice)',
        type: 'dropdown',
        options: [{
          label: 'Headache, Seizure & Red Flags',
          guidance: 'MANAGEMENT PLAN:\n1. Headache: Exclude red flags; migraine – triptan + NSAID. Prophylaxis if ≥8 days/month. NICE NG150.\n2. Seizure: First seizure – refer; established epilepsy – review meds and driving. NICE NG217.\n3. TIA/Stroke: Aspirin 300 mg then 75 mg; refer all TIA. NICE NG128.\n4. Red flags: 2WW first seizure, suspected MS; emergency – stroke, meningism. NICE NG12.'
        }]
      }];
    }

    if (systemId === 'haematology') {
      return [{
        id: 'haem-mgmt',
        question: 'Haematology (Best Practice)',
        type: 'dropdown',
        options: [{
          label: 'Anaemia, Clotting & Referral',
          guidance: 'MANAGEMENT PLAN:\n1. Anaemia: Iron studies; treat deficiency with ferrous sulfate. B12 – hydroxocobalamin if deficient. NICE NG24.\n2. Anticoagulation: DOAC for VTE/AF per NICE NG196, NG158. Review HAS-BLED.\n3. Red flags: 2WW unexplained anaemia with red flags; thrombocytopenia. NICE NG24.'
        }]
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

  // Final Catch-all: system-specific consultant-grade plans; consistent 3-part structure (Assessment | Management | Referral)
  const systemGuidance = {
    cardiovascular: {
      id: 'guidance-cardiovascular',
      question: 'Cardiovascular (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• History: chest pain character, palpitations, syncope, breathlessness, oedema. Medication and risk factors.\n• Examination: BP, pulse (rate/rhythm), JVP, heart sounds, peripheral perfusion. NEWS2 if unwell.\n• Investigations: ECG, lipids, HbA1c; BNP if breathless; troponin if ACS suspected.\n• Red flags: Acute chest pain >15 min, syncope with exertion, acute SOB – 999. NICE NG72, NG106, NG185, NG196.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• CVD risk: QRISK3; statin if ≥10%. AF: CHA2DS2-VASc, HAS-BLED; DOAC first-line. Hypertension: ACE-i/ARB/CCB per NG136.\n• Chest pain: GTN prn; beta-blocker or CCB; aspirin, statin. Heart failure: four pillars (ACEi/ARB, beta-blocker, MRA, SGLT2i); diuretic for congestion.\n• Safety-net: When to call 999; follow-up and titration. NICE NG72, NG106, NG196.' },
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
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• Thyroid: TFTs, TPO ab if abnormal. Goitre/nodule: USS + FNA per NG145. Calcium: corrected Ca, PTH, vitamin D.\n• Diabetes: HbA1c, renal function, lipids; foot check. Adrenal: electrolytes, short synacthen if suspected insufficiency.\n• Red flags: Thyroid storm, severe hypo/hyperglycaemia, adrenal crisis – emergency. NICE NG28, NG145.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Thyroid: Levothyroxine if hypothyroid; recheck TSH 6–8 weeks. Hyperthyroid refer. Subclinical: TPO ab; treat if symptomatic. NICE NG145.\n• Diabetes: HbA1c target 48–53; metformin; SGLT2i if CVD/HF/CKD. NICE NG28.\n• Adrenal: Sick-day rules; never stop steroids abruptly; emergency hydrocortisone. NICE CKS.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• 2WW: Pituitary/adrenal crisis, severe thyroid eye disease.\n• Urgent: Adrenal crisis, thyroid storm, severe DKA/HHS.\n• Routine: Hyperthyroid, goitre/nodule with concern, type 1 diabetes, pituitary/adrenal confirmed. NICE NG145, NG28.' }
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
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• CKD: eGFR, ACR, BP, electrolytes. Cause if unknown. AKI: volume status, drugs, obstruction.\n• LUTS: voiding diary, retention, haematuria. UTI: MSU before antibiotic if possible.\n• Red flags: Visible haematuria – 2WW. Acute retention, anuria – emergency. NICE NG12, NG97, NG203.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• CKD: BP target <140/90 (or <130/80 if proteinuric). SGLT2i if T2DM and eGFR ≥20. Avoid nephrotoxics. Refer if eGFR <30 or rapid decline. NICE NG203.\n• LUTS: Alpha-blocker (e.g. tamsulosin); rule out retention. UTI: nitrofurantoin/trimethoprim 3 days (women). NICE NG97, NG109.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• 2WW: Visible haematuria; non-visible with eGFR <60. NICE NG12, NG97.\n• Emergency: Acute retention, anuria.\n• Routine: BPH not controlled, stone, recurrent UTI, eGFR <30. NICE NG97.' }
      ]
    },
    'women-health': {
      id: 'guidance-women-health',
      question: "Women's Health (Consultant Standard)",
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• History: LMP, contraception, pregnancy possibility. Bleeding pattern, pain, discharge. Breast: lump, nipple change, family history.\n• Examination: abdominal/pelvic if indicated; breast if lump. Pregnancy test if relevant.\n• Red flags: Postmenopausal bleeding – 2WW. Breast lump with concern – 2WW. Acute pelvic pain, haemodynamically unstable – urgent. NICE NG12, NG88.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• HMB: Levonorgestrel IUS first-line; tranexamic acid, NSAID. HRT: oestrogen + progestogen if uterus; review annually. NICE NG23, NG88.\n• Vaginal infection: Candida – clotrimazole/fluconazole. BV – metronidazole. PID – ofloxacin + metronidazole; refer if severe. NICE NG3.\n• Breast pain: reassurance; simple analgesia. Mastitis: flucloxacillin; empty breast. NICE CKS.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• 2WW: Postmenopausal bleeding, suspected cancer, breast lump with concern. NICE NG12.\n• Urgent: Ectopic, torsion, severe PID.\n• Routine: HMB not controlled, endometriosis, contraception complex, recurrent thrush. NICE NG88.' }
      ]
    },
    infectious: {
      id: 'guidance-infectious',
      question: 'Infectious Disease (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• History: travel, contacts, animals, bites, immunosuppression, recent antibiotics. Severity and focus of infection.\n• Examination: focus (skin, chest, abdomen); sepsis screening (NEWS2, qSOFA).\n• Red flags: Sepsis, meningitis, non-blanching rash – emergency. HIV/TB risk – test and refer. NICE NG51, NG33.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Use local resistance data. Cellulitis: flucloxacillin. CAP: amoxicillin 500 mg tds 5 days. UTI: nitrofurantoin/trimethoprim. Sore throat: penicillin V if FeverPAIN 2–3+. NICE NG138, NG84, NG109.\n• Viral: no antibiotic for cold, sinusitis <10 days, acute bronchitis. Influenza: oseltamivir if at-risk and <48 h. C. difficile: stop precipitant antibiotic; treat per guidance. NICE NG120.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• Emergency: Sepsis, meningitis, severe infection. NICE NG51.\n• 2WW: HIV positive, TB suspected.\n• Routine: Recurrent infection, HIV management, travel medicine, complex infection. NICE NG33.' }
      ]
    },
    neurology: {
      id: 'guidance-neurology',
      question: 'Neurology (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• Headache: red flags (thunderclap, progressive, fever, focal neurology). Migraine vs tension pattern. Seizure: first or breakthrough; driving. TIA: ABCD2; stroke mimic.\n• Examination: consciousness, focal signs, fundi, neck stiffness if headache.\n• Red flags: Thunderclap headache, first seizure, suspected stroke/TIA, meningism – urgent/emergency. NICE NG150, NG217, NG128.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Migraine: triptan + NSAID; prophylaxis if ≥8 days/month. Tension: paracetamol/NSAID. NICE NG150.\n• First seizure: refer. Epilepsy: drug review; driving advice (DVLA). TIA: aspirin 300 mg then 75 mg; refer all. NICE NG217, NG128.\n• Bell’s palsy: steroid within 72 h; eye care. NICE CKS.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• 2WW: First seizure, suspected MS, Parkinson’s, brain tumour. NICE NG12.\n• Emergency: Stroke, TIA (same-day assessment), meningitis.\n• Routine: Chronic headache not controlled, epilepsy optimisation, neuropathy. NICE NG217, NG71.' }
      ]
    },
    haematology: {
      id: 'guidance-haematology',
      question: 'Haematology (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• Anaemia: FBC, film, iron studies, B12/folate, haemolysis screen if indicated. Cause: bleed, malabsorption, chronic disease.\n• Anticoagulation: indication, renal function, bleeding risk (HAS-BLED/ORBIT). Thrombosis: Wells, D-dimer.\n• Red flags: Unexplained anaemia with weight loss/bleeding – 2WW. Severe thrombocytopenia, bleeding on anticoagulant – urgent. NICE NG24.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Iron deficiency: ferrous sulfate; treat cause; recheck Hb. B12: hydroxocobalamin if deficient. NICE NG24.\n• Anticoagulation: DOAC for VTE/AF per NICE NG196, NG158. Warfarin if DOAC unsuitable. Consider HAS-BLED; address modifiable risk. NICE NG196.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• 2WW: Unexplained anaemia with red flags, thrombocytopenia, suspected malignancy. NICE NG24.\n• Urgent: Major bleed on anticoagulant, severe cytopenia.\n• Routine: Haemoglobinopathy, clotting disorder, anticoagulation advice, persistent unexplained anaemia. NICE NG24.' }
      ]
    },
    ent: {
      id: 'guidance-ent',
      question: 'ENT (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• Throat: FeverPAIN/Centor; duration, dysphagia, stridor. Ear: pain, discharge, hearing, vertigo. Nose: rhinorrhoea, obstruction, smell. Voice: hoarseness duration.\n• Examination: throat, ears, neck nodes. Cranial nerves if facial/voice concern.\n• Red flags: Stridor, difficulty swallowing – urgent. Hoarseness >3 weeks – 2WW. Unilateral deafness, unilateral tinnitus – refer. NICE NG12, NG84.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Sore throat: penicillin V if FeverPAIN 2–3+; 5–10 days. No antibiotic if 0–1. NICE NG84. Ear: AOM safety-net; topical for otitis externa. Wax: olive oil or sodium bicarbonate; refer if impacted. NICE NG91.\n• Rhinitis: intranasal steroid. Vertigo: Epley if BPPV. NICE CKS.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• 2WW: Hoarseness >3 weeks, suspected head and neck cancer. NICE NG12.\n• Urgent: Stridor, quinsy, mastoiditis, sudden sensorineural hearing loss.\n• Routine: Hearing loss, tinnitus, chronic sinusitis, glue ear, recurrent tonsillitis. NICE NG12.' }
      ]
    },
    'procedures-general': {
      id: 'guidance-procedures',
      question: 'Procedures & General (Consultant Standard)',
      options: [
        { label: '1. Assessment & safety', guidance: 'ASSESSMENT:\n• Safeguarding: concerns for child or vulnerable adult; document; follow local policy. NICE NG76.\n• Capacity: assess per MCA; best interests if lacking capacity; DoLS/LPS if deprivation of liberty. NICE NG108.\n• Consent: capacity, information given, voluntary. Fit note: duration, phased return, restrictions. NICE NG12.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Safeguarding: refer to social care/police as per policy; do not leave at risk. Capacity: support decision-making; involve family/IMCA if appropriate.\n• Procedures: aseptic technique; consent; document. Bloods/cannulation: follow local policy. Catheter: indication; trial without catheter if appropriate. NICE NG108.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• Safeguarding: social care, police, named GP. Capacity: Court of Protection if complex or dispute.\n• Clinical: refer as per indication (e.g. smear to colposcopy if abnormal). NICE NG108.' }
      ]
    },
    other: {
      id: 'guidance-other',
      question: 'Clinical Guidance (Consultant Standard)',
      options: [
        { label: '1. Assessment & red flags', guidance: 'ASSESSMENT:\n• Focused history and examination for the presenting system. Exclude NICE-defined red flags for that area.\n• Relevant investigations: FBC, U&E, LFT, etc. as indicated. Document findings and differential.\n• Safety-net: when to reattend or seek urgent care. NICE CKS.' },
        { label: '2. Management', guidance: 'MANAGEMENT:\n• Evidence-based treatment per NICE/BNF. Lifestyle and patient education. Shared decision-making.\n• Address polypharmacy and deprescribing if relevant. Consider social prescribing and community support.\n• Follow-up to assess response; review interval appropriate to condition. NICE CKS.' },
        { label: '3. Referral', guidance: 'REFERRAL:\n• 2WW if cancer suspected. Urgent if rapidly progressive or high risk. Routine for elective conditions.\n• Ensure appropriate primary care work-up before referral to avoid rejection. Document referral reason and safety-net. NICE NG12.' }
      ]
    }
  };

  const guid = systemGuidance[systemId] || systemGuidance.other;
  return [{
    id: guid.id,
    question: guid.question,
    type: 'dropdown',
    options: guid.options.map(o => ({ label: o.label, guidance: o.guidance }))
  }];
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
  const evidence = evidenceFromTranscript(topic.transcript);
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
  return buildTool({
    title,
    niceRefs,
    evidence: `Management per ${niceRefs.slice(0, 2).join(' and ')}.`,
    steps
  });
}

function buildToolFromBulkTitle(systemId, title, niceMap, managementContent) {
  const niceRefs = findNiceRefs(title, niceMap);
  const templateSteps = getManagementSteps(title, managementContent);
  const steps = templateSteps || getSystemFallbackSteps(systemId, title);
  return buildTool({
    title,
    niceRefs,
    evidence: `Management per ${niceRefs.slice(0, 2).join(' and ') || 'NICE CKS'}.`,
    steps
  });
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

  // Learning library: 3 tools per topic (assessment, management, referral and follow-up)
  const subtitles = ['Assessment and diagnosis', 'Management', 'Referral and follow-up'];
  (kb.sections || []).forEach(section => {
    const sys = systemsById.get(section.id) || { id: section.id, name: section.name, tools: [] };
    if (!systemsById.has(section.id)) systemsById.set(section.id, sys);
    (section.topics || []).forEach(topic => {
      subtitles.forEach(sub => {
        sys.tools.push(buildToolFromTopic(section, topic, niceMap, managementContent, sub));
      });
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
  let totalTools = 0;
  systems.forEach(s => { totalTools += s.tools.length; });

  const out = {
    source: 'Learning library + NICE CKS/NG; management steps from guidelines',
    generated: new Date().toISOString(),
    totalTools,
    systems: systems.map(s => ({ id: s.id, name: s.name, tools: s.tools }))
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Wrote ${totalTools} decision tools to ${OUT_PATH}`);
}

main();
