#!/usr/bin/env node
/**
 * Forensic audit: list every endocrinology tool title and whether it has a
 * topic-specific template (Y) or uses the generic fallback (N).
 * Run: node scripts/audit-endocrinology-tools.js
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const MANAGEMENT_PATH = path.join(__dirname, 'management-content.json');
const KB_PATH = path.join(PROJECT_ROOT, 'data', 'knowledge_base.json');
const EXTRA_NICE_PATH = path.join(__dirname, 'extra-nice-tools.json');
const BULK_PATH = path.join(__dirname, 'extra-tools-bulk.json');
const BULK_1000_PATH = path.join(__dirname, 'extra-tools-bulk-1000.json');

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

function main() {
  const managementContent = JSON.parse(fs.readFileSync(MANAGEMENT_PATH, 'utf8'));
  const titles = new Set();

  // KB: endocrinology section – base title + subtitle → 3 tools each
  const kb = JSON.parse(fs.readFileSync(KB_PATH, 'utf8'));
  const section = (kb.sections || []).find(s => s.id === 'endocrinology');
  const subtitles = ['Assessment and diagnosis', 'Management', 'Referral and follow-up'];
  if (section && section.topics) {
    section.topics.forEach(topic => {
      const base = (topic.title || '').replace(/_/g, ' ').trim();
      subtitles.forEach(sub => titles.add(sub ? `${base} – ${sub}` : base));
    });
  }

  // Extra NICE
  const extraNice = JSON.parse(fs.readFileSync(EXTRA_NICE_PATH, 'utf8'));
  (extraNice.tools || []).filter(t => t.systemId === 'endocrinology').forEach(t => titles.add(t.title));

  // Bulk bySystem
  const bulk = JSON.parse(fs.readFileSync(BULK_PATH, 'utf8'));
  (bulk.bySystem && bulk.bySystem.endocrinology || []).forEach(t => titles.add(t));

  // Bulk 1000
  let bulk1000 = [];
  try {
    bulk1000 = JSON.parse(fs.readFileSync(BULK_1000_PATH, 'utf8')).tools || [];
  } catch (e) {}
  bulk1000.filter(t => t.systemId === 'endocrinology').forEach(t => titles.add(t.title));

  const sorted = Array.from(titles).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  const onFallback = [];
  const withTemplate = [];

  sorted.forEach(title => {
    const steps = getManagementSteps(title, managementContent);
    if (steps) withTemplate.push(title);
    else onFallback.push(title);
  });

  console.log('--- ENDOCRINOLOGY & DIABETES FORENSIC AUDIT ---\n');
  console.log('Total unique tool titles (by source):', sorted.length);
  console.log('With topic-specific template:', withTemplate.length);
  console.log('On generic fallback (need template):', onFallback.length);
  console.log('\n--- ON FALLBACK (no template) ---\n');
  onFallback.forEach(t => console.log(t));
  console.log('\n--- WITH TEMPLATE ---\n');
  withTemplate.forEach(t => console.log(t));
}

main();
