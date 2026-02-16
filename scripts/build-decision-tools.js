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

/** Find first management template whose keywords match title (lowercase). */
function getManagementSteps(title, managementContent) {
  const t = (title || '').toLowerCase();
  const templates = managementContent.templates || [];
  for (const tmpl of templates) {
    const keywords = tmpl.keywords || [];
    if (keywords.some(kw => t.includes(kw.toLowerCase()))) return tmpl.steps;
  }
  return null;
}

/** System-specific real management (drugs and referral). No generic 'look at guidelines'. */
function getSystemFallbackSteps(systemId) {
  const fallbacks = {
    cardiovascular: [
      { id: 'action', question: 'Clinical action', type: 'dropdown', options: [
        { value: 'investigate', label: 'Investigation', guidance: 'ECG, FBC, U&E, TFT, BNP/NT-proBNP if breathless. Echo if murmur or suspected HF. 24h tape if palpitations intermittent. NICE NG106, NG196.' },
        { value: 'drug', label: 'Drug treatment', guidance: 'Hypertension: ACE-i (e.g. ramipril 2.5 mg OD) or ARB; add CCB (amlodipine 5 mg) if needed. Statin: atorvastatin 20 mg if QRISK3 ≥10%. AF: anticoagulate (DOAC); rate control with bisoprolol or diltiazem. NICE NG136, NG196, NG238.' },
        { value: 'refer', label: 'Referral', guidance: '2WW: chest pain with red flags, suspected heart failure. Emergency: acute coronary syndrome, haemodynamically unstable AF. Routine cardiology: first AF for rhythm options, valve disease, refractory hypertension. NICE NG95, NG106, NG196.' }
      ]}
    ],
    dermatology: [
      { id: 'action', question: 'Management', type: 'dropdown', options: [
        { value: 'topical', label: 'Topical', guidance: 'Infection: fusidic acid 2% or mupirocin for impetigo. Fungal: terbinafine or clotrimazole. Eczema: emollient + topical steroid (hydrocortisone 1% mild, betamethasone 0.025% moderate). NICE NG80, CKS.' },
        { value: 'oral', label: 'Oral / systemic', guidance: 'Cellulitis: flucloxacillin 500 mg qds 7 days. Acne: doxycycline 100 mg OD 12 weeks. Severe eczema/psoriasis: refer for systemic or phototherapy. NICE NG141, NG198.' },
        { value: 'refer', label: 'Referral', guidance: '2WW: suspected melanoma, SCC, changing mole. Routine: BCC, severe acne (isotretinoin), hidradenitis, psoriasis not controlled. NICE NG12, NG14.' }
      ]}
    ],
    'mental-health': [
      { id: 'action', question: 'Management', type: 'dropdown', options: [
        { value: 'mild', label: 'Mild', guidance: 'Psychological: CBT, self-help. Depression: do not offer antidepressant first-line. Anxiety: CBT or SSRI if declining. NICE NG222, NG226.' },
        { value: 'moderate', label: 'Moderate', guidance: 'Depression: sertraline 50 mg OD (review 2 weeks; increase to 100 mg if needed). Anxiety: sertraline or CBT. Continue 6 months after remission. NICE NG222, NG226.' },
        { value: 'severe', label: 'Severe / crisis', guidance: 'Risk assess. Consider crisis team, referral to CMHT. Severe depression: combination antidepressant + psychological therapy. Suicidal: urgent mental health assessment. NICE NG222.' }
      ]}
    ],
    gastroenterology: [
      { id: 'action', question: 'Management', type: 'dropdown', options: [
        { value: 'drug', label: 'Drug treatment', guidance: 'GORD: omeprazole 20 mg OD 4–8 weeks. Constipation: macrogol or senna. Diarrhoea: loperamide prn; avoid antibiotic unless invasive. IBS: mebeverine, low FODMAP. NICE NG1, NG61, NG99.' },
        { value: 'investigate', label: 'Investigation', guidance: 'FIT if ≥50 with change in bowel habit or iron deficiency. Coeliac: TTG + IgA. Dysphagia: 2WW endoscopy. LFT, amylase if abdominal pain. NICE NG12, NG20.' },
        { value: 'refer', label: 'Referral', guidance: '2WW: dysphagia, rectal bleeding + red flags, FIT positive. Routine: IBD, refractory IBS, NAFLD with concern. Admit: acute abdomen, severe pancreatitis. NICE NG12.' }
      ]}
    ],
    endocrinology: [
      { id: 'action', question: 'Management', type: 'dropdown', options: [
        { value: 'diabetes', label: 'Diabetes', guidance: 'Metformin 500 mg bd, titrate to 1 g bd. Add SGLT2i (e.g. dapagliflozin 10 mg) if CVD/HF/CKD. Add DPP-4i or GLP-1 if needed. HbA1c target 48 mmol/mol. NICE NG28.' },
        { value: 'thyroid', label: 'Thyroid', guidance: 'Hypothyroid: levothyroxine 25–50 mcg OD; recheck TSH 6–8 weeks. Hyperthyroid: refer endocrinology. Subclinical: TPO ab; consider levothyroxine if symptomatic. NICE NG145.' },
        { value: 'other', label: 'Other', guidance: 'Obesity: orlistat 120 mg tds or refer tier 3 if BMI ≥40. Osteoporosis: alendronate or denosumab; calcium/vitamin D. NICE NG189, NG146.' }
      ]}
    ],
    musculoskeletal: [
      { id: 'action', question: 'Management', type: 'dropdown', options: [
        { value: 'acute', label: 'Acute pain', guidance: 'Back/knee: paracetamol + NSAID (ibuprofen 400 mg tds + PPI). Gout: naproxen 500 mg bd + PPI or colchicine 500 mcg bd. Rest, ice, avoid aggravating. NICE NG59, NG219.' },
        { value: 'chronic', label: 'Chronic / OA', guidance: 'Exercise, weight loss. Topical NSAID for knee. Oral NSAID short-term + PPI. Consider referral for joint replacement if severe. NICE NG226.' },
        { value: 'refer', label: 'Referral', guidance: '2WW: suspected RA (persistent synovitis), septic arthritis. Routine: polymyalgia (prednisolone trial), carpal tunnel, rotator cuff. Emergency: cauda equina. NICE NG59, NG100.' }
      ]}
    ],
    respiratory: [
      { id: 'action', question: 'Management', type: 'dropdown', options: [
        { value: 'copd', label: 'COPD', guidance: 'Stable: SABA prn; add LAMA (e.g. tiotropium); then LABA+LAMA. Exacerbation: prednisolone 30 mg 7–14 days; doxycycline or amoxicillin 5 days if purulent. NICE NG115.' },
        { value: 'asthma', label: 'Asthma', guidance: 'Step 1: SABA prn. Step 2: add low-dose ICS (e.g. beclometasone 200 mcg bd). Step 3: add LABA. MART if appropriate. NICE NG80.' },
        { value: 'refer', label: 'Referral', guidance: '2WW: haemoptysis, suspected lung cancer. Emergency: severe asthma, PE. Routine: uncontrolled asthma/COPD, sleep apnoea. NICE NG12, NG80, NG115.' }
      ]}
    ],
    paediatrics: [
      { id: 'action', question: 'Management', type: 'dropdown', options: [
        { value: 'infection', label: 'Infection', guidance: 'AOM: safety-net; amoxicillin if <2 years bilateral or systemically unwell. UTI: send MSU; trimethoprim or cefalexin. Croup: single dose dexamethasone. NICE NG91, NG109, NG93.' },
        { value: 'other', label: 'Other', guidance: 'Fever: paracetamol/ibuprofen; traffic light. Constipation: macrogol. Eczema: emollient + topical steroid. Asthma: as per NG80. NICE NG143, NG99.' },
        { value: 'refer', label: 'Referral', guidance: 'Emergency: meningococcal rash, sepsis, severe croup. 2WW: developmental delay, safeguarding concern. Routine: recurrent UTI, poor growth. NICE NG51, NG11.' }
      ]}
    ],
    'renal-urology': [
      { id: 'action', question: 'Management', type: 'dropdown', options: [
        { value: 'uti', label: 'UTI', guidance: 'Women: nitrofurantoin 100 mg MR bd 3 days or trimethoprim 200 mg bd 3 days. Pyelonephritis: cefalexin or co-amoxiclav 7–10 days. Men: send MSU; treat as per culture. NICE NG109.' },
        { value: 'ckd', label: 'CKD', guidance: 'Monitor eGFR, BP (target <130/80 if diabetic), K+. Avoid NSAID, nephrotoxics. Refer if eGFR <30 or rapid decline. SGLT2i if T2DM and eGFR ≥20. NICE NG203.' },
        { value: 'refer', label: 'Referral', guidance: '2WW: visible haematuria, non-visible with eGFR <60. Routine: BPH not controlled, recurrent UTI, renal colic. Emergency: acute retention, anuria. NICE NG12, NG97.' }
      ]}
    ],
    'women-health': [
      { id: 'action', question: 'Management', type: 'dropdown', options: [
        { value: 'hormone', label: 'HRT / menopause', guidance: 'Oestrogen + progestogen if uterus. Patch/gel preferred for VTE. Review annually. Topical oestrogen for urogenital. NICE NG23.' },
        { value: 'infection', label: 'Vaginal infection', guidance: 'Candida: clotrimazole pessary or fluconazole 150 mg stat. BV: metronidazole 400 mg bd 7 days or 2 g stat. PID: ofloxacin + metronidazole; refer if severe. NICE NG3.' },
        { value: 'refer', label: 'Referral', guidance: '2WW: postmenopausal bleeding, suspected cancer. Routine: HMB not controlled, endometriosis, contraception. NICE NG12, NG88.' }
      ]}
    ],
    infectious: [
      { id: 'action', question: 'Management', type: 'dropdown', options: [
        { value: 'antibiotic', label: 'Antibiotic choice', guidance: 'Cellulitis: flucloxacillin 500 mg qds. Chest: amoxicillin 500 mg tds (CAP). UTI: nitrofurantoin or trimethoprim. Always use local resistance. NICE NG138, NG109, NG141.' },
        { value: 'viral', label: 'Viral / no antibiotic', guidance: 'Sore throat: FeverPAIN 0–1 no ab. Sinusitis: <10 days no ab. Cough: no ab unless pneumonia. Influenza: oseltamivir if at-risk and within 48 h. NICE NG84, NG79, NG120.' },
        { value: 'refer', label: 'Referral', guidance: 'HIV test: offer if risk. TB: refer if suspected. Meningitis: emergency. Sepsis: emergency. NICE NG51, NG33.' }
      ]}
    ],
    neurology: [
      { id: 'action', question: 'Management', type: 'dropdown', options: [
        { value: 'headache', label: 'Headache', guidance: 'Migraine: triptan + NSAID. Prophylaxis: propranolol or topiramate if ≥8 days/month. Tension: paracetamol/NSAID. NICE NG150.' },
        { value: 'tia', label: 'TIA / stroke', guidance: 'Aspirin 300 mg then 75 mg OD. Refer all TIA for imaging/carotid. Secondary prevention: clopidogrel 75 mg, BP and lipid targets. NICE NG128.' },
        { value: 'refer', label: 'Referral', guidance: '2WW: first seizure, suspected MS, Parkinson\'s. Emergency: stroke, meningococcal. Routine: chronic headache not controlled, neuropathy. NICE NG217, NG71.' }
      ]}
    ],
    haematology: [
      { id: 'action', question: 'Management', type: 'dropdown', options: [
        { value: 'anaemia', label: 'Anaemia', guidance: 'Iron deficiency: ferrous sulfate 200 mg OD–bd; recheck Hb 2–4 weeks. B12: hydroxocobalamin 1 mg IM 3×/week 2 weeks then 3-monthly. NICE NG24, NG241.' },
        { value: 'anticoagulation', label: 'Anticoagulation', guidance: 'DVT/PE: apixaban or rivaroxaban 3 months minimum. AF: DOAC per CHA2DS2-VASc. Warfarin if DOAC unsuitable. NICE NG158, NG196.' },
        { value: 'refer', label: 'Referral', guidance: '2WW: unexplained anaemia with red flags, thrombocytopenia. Routine: haemoglobinopathy, clotting disorder. NICE NG24.' }
      ]}
    ],
    ent: [
      { id: 'action', question: 'Management', type: 'dropdown', options: [
        { value: 'throat', label: 'Sore throat', guidance: 'FeverPAIN 2–3: phenoxymethylpenicillin 500 mg qds 5–10 days. Score 0–1: no antibiotic. Paracetamol/ibuprofen. NICE NG84.' },
        { value: 'ear', label: 'Ear', guidance: 'AOM: safety-net; amoxicillin if systemically unwell or <2 years bilateral. Otitis externa: topical acetic acid or gentamicin/hydrocortisone. NICE NG91.' },
        { value: 'refer', label: 'Referral', guidance: 'Routine: hearing loss, tinnitus, vertigo (after BPPV excluded). 2WW: hoarseness >3 weeks, suspected cancer. NICE NG12.' }
      ]}
    ],
    'procedures-general': [
      { id: 'action', question: 'Action', type: 'dropdown', options: [
        { value: 'safety', label: 'Safety-netting', guidance: 'Document red flags and when to re-attend. Consent for procedures. DNAR discussion if appropriate. Capacity assessment if needed. NICE NG108.' },
        { value: 'palliative', label: 'Palliative', guidance: 'Pain: paracetamol, then opioid (morphine). Breathlessness: fan, low-dose opioid. Anticipatory meds. NICE NG142.' },
        { value: 'refer', label: 'Referral', guidance: 'Safeguarding: follow local policy. Capacity: refer if complex. Fitness to drive: advise and notify DVLA if required. NICE NG108.' }
      ]}
    ],
    other: [
      { id: 'action', question: 'Management', type: 'dropdown', options: [
        { value: 'lifestyle', label: 'Lifestyle', guidance: 'Smoking: NRT or varenicline 12 weeks. Alcohol: brief advice; refer if dependent. Weight: diet, exercise; orlistat if BMI ≥28. NICE NG92, NG115, NG189.' },
        { value: 'chronic', label: 'Chronic conditions', guidance: 'Pain: paracetamol, NSAID; consider amitriptyline or gabapentin for neuropathic. Polypharmacy: review; deprescribe if appropriate. NICE NG193, NG5.' },
        { value: 'refer', label: 'Referral', guidance: 'Falls: assess; OT, physio, home hazards. Frailty: comprehensive geriatric assessment. NICE NG161.' }
      ]}
    ]
  };
  return fallbacks[systemId] || fallbacks.other;
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
  const steps = templateSteps || getSystemFallbackSteps(section.id);
  return buildTool({ title, niceRefs, evidence, steps, episode: topic.episode });
}

function buildToolFromExtra(extra, niceMap, managementContent) {
  const title = (extra.title || '').trim();
  const systemId = extra.systemId || 'other';
  const niceRefs = extra.niceRefs && extra.niceRefs.length ? extra.niceRefs : findNiceRefs(title, niceMap);
  const templateSteps = getManagementSteps(title, managementContent);
  const steps = templateSteps || getSystemFallbackSteps(systemId);
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
  const steps = templateSteps || getSystemFallbackSteps(systemId);
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

  const systems = Array.from(systemsById.values()).filter(s => s.tools.length > 0);
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
