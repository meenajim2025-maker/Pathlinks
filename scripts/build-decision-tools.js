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

  // Final Catch-all: system-specific consultant-grade plans (no single generic plan)
  const systemGuidance = {
    cardiovascular: {
      id: 'guidance-cardiovascular',
      question: 'Cardiovascular (Consultant Standard)',
      options: [
        { label: 'Assessment & risk', guidance: 'MANAGEMENT PLAN:\n1. ECG, BP, lipids; QRISK3. If AF: CHA2DS2-VASc, HAS-BLED; anticoagulate per NICE NG196.\n2. Chest pain: GTN, beta-blocker/CCB; refer RACPC for CTCA. Heart failure: BNP, echo; four pillars (ACEi/ARB, beta-blocker, MRA, SGLT2i).\n3. Red flags: 999 for acute chest pain, syncope, acute SOB. NICE NG72, NG106, NG185, NG196.' },
        { label: 'Referral', guidance: '2WW: suspected cancer, severe valve disease. Urgent: ACS, haemodynamically unstable. Routine: AF for rhythm control, refractory hypertension, PAD. NICE NG12.' }
      ]
    },
    cardiology: {
      id: 'guidance-cardiology',
      question: 'Cardiology (Consultant Standard)',
      options: [
        { label: 'Assessment & risk', guidance: 'MANAGEMENT PLAN:\n1. ECG, BP, lipids; QRISK3. If AF: CHA2DS2-VASc, HAS-BLED; anticoagulate per NICE NG196.\n2. Chest pain: GTN, beta-blocker/CCB; refer RACPC for CTCA. Heart failure: BNP, echo; four pillars (ACEi/ARB, beta-blocker, MRA, SGLT2i).\n3. Red flags: 999 for acute chest pain, syncope, acute SOB. NICE NG72, NG106, NG185, NG196.' },
        { label: 'Referral', guidance: '2WW: suspected cancer, severe valve disease. Urgent: ACS, haemodynamically unstable. Routine: AF for rhythm control, refractory hypertension, PAD. NICE NG12.' }
      ]
    },
    dermatology: {
      id: 'guidance-dermatology',
      question: 'Dermatology (Consultant Standard)',
      options: [
        { label: 'Topical & systemic', guidance: 'MANAGEMENT PLAN:\n1. Emollients first-line for dry/eczema; potent topical steroid for plaque (max 4 weeks); antifungal for tinea. Infection: flucloxacillin or fusidic acid.\n2. Oral: doxycycline for acne; consider prednisolone short course for severe acute. Avoid long-term steroid without dermatology.\n3. 2WW: changing mole, suspected melanoma/SCC. NICE NG12, NG80, CKS.' },
        { label: 'Referral', guidance: 'Routine: diagnostic uncertainty, failure of topical therapy, biologics. Urgent: erythroderma, pustular flare, SJS/TEN. NICE CG153.' }
      ]
    },
    'mental-health': {
      id: 'guidance-mental-health',
      question: 'Mental Health (Consultant Standard)',
      options: [
        { label: 'Risk & support', guidance: 'MANAGEMENT PLAN:\n1. Risk: Suicide/self-harm assessment; crisis numbers (111, Samaritans 116 123). Do not leave at risk without plan.\n2. Depression: SSRI first-line (sertraline 50 mg); review 2 weeks; CBT. Anxiety: CBT or SSRI. Continue 6 months after remission. NICE NG222, NG226.\n3. Refer: IAPT for mild–moderate; CMHT if severe, psychosis, or risk. NICE NG222.' },
        { label: 'Referral', guidance: 'Urgent: acute risk, psychosis. Routine: treatment-resistant, personality disorder (DBT), eating disorder. NICE NG12.' }
      ]
    },
    gastroenterology: {
      id: 'guidance-gastroenterology',
      question: 'Gastroenterology (Consultant Standard)',
      options: [
        { label: 'Investigation & treatment', guidance: 'MANAGEMENT PLAN:\n1. Dyspepsia: PPI 4–8 weeks; consider H. pylori test. IBS: dietary advice, mebeverine; low FODMAP if needed. Constipation: macrogol; stimulant if resistant. Diarrhoea: loperamide prn; exclude infection/C difficile if recent antibiotic.\n2. FIT if ≥50 with change in bowel habit or IDA. Coeliac: TTG + IgA. NICE NG12, NG20, NG61.\n3. 2WW: dysphagia, rectal bleeding + red flags, FIT+. NICE NG12.' },
        { label: 'Referral', guidance: 'Emergency: acute abdomen, GI bleed, pancreatitis. 2WW: dysphagia, unexplained anaemia. Routine: IBD, refractory IBS, liver disease. NICE NG12.' }
      ]
    },
    endocrinology: {
      id: 'guidance-endocrinology',
      question: 'Endocrinology (Consultant Standard)',
      options: [
        { label: 'Thyroid, diabetes, adrenal', guidance: 'MANAGEMENT PLAN:\n1. Thyroid: Levothyroxine if hypothyroid; recheck TSH 6–8 weeks. Hyperthyroid refer. Subclinical: TPO ab; treat if symptomatic. NICE NG145.\n2. Diabetes: HbA1c 48–53; metformin; SGLT2i if CVD/HF/CKD. NICE NG28.\n3. Adrenal: Sick-day rules for steroids; do not stop abruptly. Refer if Addison’s suspected. NICE CKS.' },
        { label: 'Referral', guidance: 'Thyroid: hyperthyroid, goitre/nodule with concern. Diabetes: type 1, pregnancy, foot complications. Pituitary/adrenal: confirmed or suspected. NICE NG145, NG28.' }
      ]
    },
    musculoskeletal: {
      id: 'guidance-musculoskeletal',
      question: 'Musculoskeletal (Consultant Standard)',
      options: [
        { label: 'Pain & function', guidance: 'MANAGEMENT PLAN:\n1. Acute: Paracetamol + NSAID (with PPI); avoid long-term NSAID. Back pain: advise activity; consider physio. Gout: naproxen or colchicine; allopurinol if recurrent. NICE NG59, NG219, NG226.\n2. OA: Exercise, weight loss; topical NSAID for knee; consider joint replacement referral if severe. Inflammatory arthritis: 2WW if suspected RA (synovitis). NICE NG100, NG226.\n3. Red flags: Cauda equina, septic arthritis – emergency. NICE NG59.' },
        { label: 'Referral', guidance: '2WW: suspected RA, septic arthritis. Routine: persistent pain after conservative treatment, carpal tunnel, frozen shoulder. NICE NG59, NG100.' }
      ]
    },
    respiratory: {
      id: 'guidance-respiratory',
      question: 'Respiratory (Consultant Standard)',
      options: [
        { label: 'Asthma & COPD', guidance: 'MANAGEMENT PLAN:\n1. Asthma: ICS + SABA; step up per BTS/SIGN. Check technique; MART if appropriate. NICE NG80.\n2. COPD: LAMA/LABA; add ICS if exacerbations or eosinophils. Rescue pack (pred + antibiotic). Smoking cessation essential. NICE NG115.\n3. 2WW: haemoptysis, suspected lung cancer. Emergency: severe asthma, PE. NICE NG12, NG80, NG115.' },
        { label: 'Referral', guidance: 'Urgent: severe exacerbation, haemoptysis. Routine: uncontrolled asthma/COPD, sleep apnoea, ILD. NICE NG115.' }
      ]
    },
    paediatrics: {
      id: 'guidance-paediatrics',
      question: 'Paediatrics (Consultant Standard)',
      options: [
        { label: 'Safety-netting & treatment', guidance: 'MANAGEMENT PLAN:\n1. Traffic light (NG143) for fever/ill child. Hydration, paracetamol/ibuprofen. AOM: safety-net; amoxicillin if <2y bilateral or unwell. UTI: MSU; trimethoprim/cephalexin. Croup: dexamethasone. NICE NG91, NG93, NG109, NG143.\n2. Growth: plot centiles; refer if faltering. Development: refer if delay. NICE NG11, NG75.\n3. Emergency: non-blanching rash, meningism, severe breathing difficulty. NICE NG51.' },
        { label: 'Referral', guidance: 'Emergency: sepsis, meningococcal rash, severe croup. 2WW: safeguarding, developmental concern. Routine: recurrent UTI, poor growth. NICE NG51, NG11.' }
      ]
    },
    'renal-urology': {
      id: 'guidance-renal-urology',
      question: 'Renal & Urology (Consultant Standard)',
      options: [
        { label: 'CKD & LUTS', guidance: 'MANAGEMENT PLAN:\n1. CKD: eGFR, ACR; BP target <140/90 (or <130/80 if proteinuric). SGLT2i if T2DM and eGFR ≥20. Avoid nephrotoxics. Refer if eGFR <30 or rapid decline. NICE NG203.\n2. LUTS: Alpha-blocker; rule out retention. Haematuria: 2WW if visible or non-visible with eGFR <60. NICE NG97, NG12.\n3. UTI: nitrofurantoin/trimethoprim 3 days (women). NICE NG109.' },
        { label: 'Referral', guidance: '2WW: visible haematuria; non-visible with eGFR <60. Emergency: acute retention, anuria. Routine: BPH not controlled, stone, recurrent UTI. NICE NG12, NG97.' }
      ]
    },
    'women-health': {
      id: 'guidance-women-health',
      question: "Women's Health (Consultant Standard)",
      options: [
        { label: 'Gynae & contraception', guidance: 'MANAGEMENT PLAN:\n1. HMB: Levonorgestrel IUS first-line; tranexamic acid, NSAID. HRT: oestrogen + progestogen if uterus; review annually. NICE NG23, NG88.\n2. Vaginal infection: Candida – clotrimazole/fluconazole. BV – metronidazole. PID – ofloxacin + metronidazole; refer if severe. NICE NG3.\n3. 2WW: postmenopausal bleeding, suspected cancer. NICE NG12.' },
        { label: 'Referral', guidance: '2WW: PMB, suspected cancer. Routine: HMB not controlled, endometriosis, contraception complex. NICE NG12, NG88.' }
      ]
    },
    infectious: {
      id: 'guidance-infectious',
      question: 'Infectious Disease (Consultant Standard)',
      options: [
        { label: 'Antibiotics & prevention', guidance: 'MANAGEMENT PLAN:\n1. Use local resistance data. Cellulitis: flucloxacillin. CAP: amoxicillin 500 mg tds 5 days. UTI: nitrofurantoin/trimethoprim. Sore throat: penicillin V if FeverPAIN 2–3+. NICE NG138, NG84, NG109.\n2. Viral: no antibiotic for cold, sinusitis <10 days, acute bronchitis. Influenza: oseltamivir if at-risk and <48 h. NICE NG120.\n3. HIV/TB: offer testing if risk; refer if suspected TB. NICE NG33.' },
        { label: 'Referral', guidance: 'Emergency: sepsis, meningitis. 2WW: HIV positive, TB. Routine: recurrent infection, HIV management. NICE NG51, NG33.' }
      ]
    },
    neurology: {
      id: 'guidance-neurology',
      question: 'Neurology (Consultant Standard)',
      options: [
        { label: 'Headache, seizure, stroke', guidance: 'MANAGEMENT PLAN:\n1. Headache: Exclude red flags. Migraine: triptan + NSAID; prophylaxis if ≥8 days/month. Tension: paracetamol/NSAID. NICE NG150.\n2. First seizure: refer. Epilepsy: drug review; driving advice. TIA: aspirin 300 mg then 75 mg; refer all. NICE NG217, NG128.\n3. 2WW: first seizure, suspected MS. Emergency: stroke, meningism. NICE NG12.' },
        { label: 'Referral', guidance: '2WW: first seizure, suspected MS, Parkinson’s. Emergency: stroke, meningitis. Routine: chronic headache not controlled, neuropathy. NICE NG217, NG71.' }
      ]
    },
    haematology: {
      id: 'guidance-haematology',
      question: 'Haematology (Consultant Standard)',
      options: [
        { label: 'Anaemia & anticoagulation', guidance: 'MANAGEMENT PLAN:\n1. Anaemia: Iron studies; ferrous sulfate if deficient. B12: hydroxocobalamin if deficient. Check for cause (bleed, malabsorption). NICE NG24.\n2. Anticoagulation: DOAC for VTE/AF per CHA2DS2-VASc. Consider HAS-BLED. NICE NG196, NG158.\n3. 2WW: unexplained anaemia with red flags, thrombocytopenia. NICE NG24.' },
        { label: 'Referral', guidance: '2WW: anaemia with red flags. Routine: haemoglobinopathy, clotting disorder, anticoagulation advice. NICE NG24.' }
      ]
    },
    ent: {
      id: 'guidance-ent',
      question: 'ENT (Consultant Standard)',
      options: [
        { label: 'Throat, ear, nose', guidance: 'MANAGEMENT PLAN:\n1. Sore throat: FeverPAIN/Centor; penicillin V if 2–3+. NICE NG84. Ear: AOM safety-net; topical for otitis externa. Wax: olive oil or sodium bicarbonate; refer if impacted. NICE NG91.\n2. Hearing loss/tinnitus: exclude wax; refer if unilateral or sudden. Vertigo: Epley if BPPV. NICE CKS.\n3. 2WW: hoarseness >3 weeks. NICE NG12.' },
        { label: 'Referral', guidance: '2WW: hoarseness >3 weeks, suspected cancer. Routine: hearing loss, tinnitus, chronic sinusitis. NICE NG12.' }
      ]
    },
    'procedures-general': {
      id: 'guidance-procedures',
      question: 'Procedures & General (Consultant Standard)',
      options: [
        { label: 'Safeguarding & capacity', guidance: 'MANAGEMENT PLAN:\n1. Safeguarding: Follow local policy; document concerns; refer if child/vulnerable adult at risk. NICE NG76.\n2. Capacity: Assess per MCA; best interests if lacking capacity. DoLS/LPS for deprivation of liberty. NICE NG108.\n3. Fit note: Duration; phased return if appropriate. Safety-net and review. NICE NG12.' },
        { label: 'Referral', guidance: 'Safeguarding to social care/police as indicated. Capacity: Court of Protection if complex. NICE NG108.' }
      ]
    },
    other: {
      id: 'guidance-other',
      question: 'Clinical Guidance (Consultant Standard)',
      options: [
        { label: 'Assessment & action', guidance: 'MANAGEMENT PLAN:\n1. Assessment: Focused history and examination; exclude NICE red flags for the relevant system.\n2. Management: Evidence-based treatment per NICE/BNF; lifestyle and patient education; shared decision-making.\n3. Safety-net: Clear advice on when to reattend or seek urgent care. Follow-up to assess response. NICE CKS.' },
        { label: 'Referral', guidance: '2WW if cancer suspected. Urgent if rapidly progressive or high risk. Ensure appropriate work-up before referral. NICE NG12.' }
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
