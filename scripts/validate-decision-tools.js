#!/usr/bin/env node
/**
 * Validate decision_tools_protocol.json: every tool has steps, niceRefs, and at least one dropdown step with options.
 * Run: node scripts/validate-decision-tools.js
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PROTOCOL_PATH = path.join(PROJECT_ROOT, 'data', 'decision_tools_protocol.json');

function main() {
  const data = JSON.parse(fs.readFileSync(PROTOCOL_PATH, 'utf8'));
  const systems = data.systems || [];
  let errors = 0;
  systems.forEach(sys => {
    (sys.tools || []).forEach((tool, idx) => {
      const label = `${sys.name} / ${tool.title || 'untitled'}`;
      if (!Array.isArray(tool.steps) || tool.steps.length === 0) {
        console.error(`[ERROR] ${label}: missing or empty steps`);
        errors++;
      }
      if (!Array.isArray(tool.niceRefs)) {
        console.error(`[ERROR] ${label}: niceRefs must be an array`);
        errors++;
      }
      const hasDropdown = (tool.steps || []).some(s => s.type === 'dropdown' && Array.isArray(s.options) && s.options.length > 0);
      if (!hasDropdown) {
        console.error(`[ERROR] ${label}: no dropdown step with options`);
        errors++;
      }
    });
  });
  if (errors === 0) console.log('Validation passed: all tools have steps, niceRefs, and at least one dropdown with options.');
  else console.error(`Validation failed: ${errors} error(s).`);
  process.exit(errors > 0 ? 1 : 0);
}

main();
