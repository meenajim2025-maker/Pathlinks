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

    // Default generic management
    return [{
      id: 'bp-management',
      question: 'Management (Best Practice)',
      type: 'dropdown',
      options: [
        {
          label: 'Initial Management Plan',
          guidance: 'MANAGEMENT PLAN:\n1. Advice: Advise on activity levels, hydration, and non-pharmacological measures.\n2. Information: Provide written patient info and use shared-decision making.\n3. Safety-netting: Provide clear triggers for re-consultation (rapid worsening, new red flags).\n4. Review: Arrange review based on clinical stability (e.g. 48h for acute, 2-4 weeks for chronic).'
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
          label: 'Referral & Safety-netting',
          guidance: 'MANAGEMENT PLAN:\n1. Referral: Refer 2WW if malignancy suspected. Urgent referral if clinical compromise. Routine if primary care management fails.\n2. Waiting List: Ensure patient knows how to report deterioration while waiting.\n3. Review: Review and optimize primary care management in the interim.'
        }
      ]
    }];
  }

  // Fallback for generic patterns
  return [
    {
      id: 'guidance',
      question: 'Clinical Guidance (Best Practice)',
      type: 'dropdown',
      options: [
        {
          value: 'standard',
          label: 'Management Overview',
          guidance: 'MANAGEMENT PLAN:\n1. Assessment: Full clinical assessment to exclude red flags.\n2. Action: Refer to local clinical formulary for specific pharmacotherapy.\n3. Safety-net: Provide robust safety-netting advice.\n4. Follow-up: Arrange review based on clinical findings.'
        }
      ]
    }
  ];
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
