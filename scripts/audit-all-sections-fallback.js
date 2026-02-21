#!/usr/bin/env node
/**
 * Forensic audit of ALL sections: list every tool that uses the system fallback
 * (no topic-specific template). Reads the built protocol; tools with
 * steps[0].id starting with "guidance-" are on fallback.
 * Run: node scripts/audit-all-sections-fallback.js
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PROTOCOL_PATH = path.join(PROJECT_ROOT, 'data', 'decision_tools_protocol.json');

function main() {
  const data = JSON.parse(fs.readFileSync(PROTOCOL_PATH, 'utf8'));
  const systems = data.systems || [];
  let totalTools = 0;
  let totalOnFallback = 0;
  const bySystem = [];

  systems.forEach(sys => {
    const tools = sys.tools || [];
    const onFallback = [];
    tools.forEach(tool => {
      totalTools++;
      const step0 = (tool.steps || [])[0];
      const isFallback = step0 && step0.id && String(step0.id).startsWith('guidance-');
      if (isFallback) {
        totalOnFallback++;
        onFallback.push(tool.title);
      }
    });
    bySystem.push({
      id: sys.id,
      name: sys.name,
      total: tools.length,
      onFallback: onFallback.length,
      titles: onFallback
    });
  });

  console.log('--- FORENSIC AUDIT: ALL SECTIONS (tools on system fallback) ---\n');
  console.log('Total tools:', totalTools);
  console.log('Total on fallback (need topic template):', totalOnFallback);
  console.log('');

  bySystem.forEach(({ id, name, total, onFallback, titles }) => {
    if (onFallback === 0) return;
    console.log('--- ' + name + ' (' + id + ') ---');
    console.log('On fallback: ' + onFallback + ' of ' + total);
    titles.forEach(t => console.log('  ' + t));
    console.log('');
  });

  // Summary of sections with any on fallback
  const withFallback = bySystem.filter(s => s.onFallback > 0);
  console.log('--- SECTIONS WITH FALLBACK (need templates) ---');
  withFallback.forEach(s => console.log(s.name + ': ' + s.onFallback + ' tools'));
}

main();
