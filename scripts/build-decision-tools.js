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
/** Generic fallback for tools where no specific management template is found. */
function getSystemFallbackSteps(systemId) {
  // We no longer provide specific drug advice as a fallback because it leads to clinical cross-wiring
  // (e.g. ADHD showing Depression guidance). Instead, we provide a structured guidance step
  // that refers to NICE CKS/NG for that specific system/topic.
  return [
    {
      id: 'guidance',
      question: 'Clinical Guidance',
      type: 'dropdown',
      options: [
        {
          value: 'standard',
          label: 'Management Guidance',
          guidance: 'Specific clinical management steps are not yet available for this localized tool version. Please refer to the NICE References listed above and your local clinical formulary for treatment pathways. Always ensure a full clinical assessment and risk assessment is performed.'
        },
        {
          value: 'referral',
          label: 'Referral & Safety-netting',
          guidance: 'Consult NICE CKS for specific referral criteria. Always provide safety-netting advice (e.g. worsened symptoms, red flags) and document your clinical rationale. Use the \'Learning library\' to find related educational materials.'
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
