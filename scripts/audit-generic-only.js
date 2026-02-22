#!/usr/bin/env node
/**
 * List tools that have only a single generic step (id starting with "guidance-").
 * These are on system fallback with no topic-specific pathway.
 * Run: node scripts/audit-generic-only.js
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PROTOCOL_PATH = path.join(PROJECT_ROOT, 'data', 'decision_tools_protocol.json');

function main() {
  const data = JSON.parse(fs.readFileSync(PROTOCOL_PATH, 'utf8'));
  const systems = data.systems || [];
  let total = 0;
  const genericOnly = [];

  systems.forEach(sys => {
    (sys.tools || []).forEach(tool => {
      total++;
      const steps = tool.steps || [];
      const singleStep = steps.length === 1 && steps[0];
      const isGenericOnly = singleStep && singleStep.id && String(singleStep.id).startsWith('guidance-');
      if (isGenericOnly) {
        genericOnly.push({ system: sys.name, id: sys.id, title: tool.title });
      }
    });
  });

  console.log('--- TOOLS WITH ONLY GENERIC STEP (single guidance-* step) ---\n');
  console.log('Total tools:', total);
  console.log('Generic-only (prioritise for templates):', genericOnly.length);
  console.log('');
  genericOnly.forEach(({ system, title }) => console.log('  [' + system + '] ' + title));
  console.log('');
  console.log('--- END ---');
}

main();
