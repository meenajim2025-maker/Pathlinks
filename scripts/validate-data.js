#!/usr/bin/env node
/**
 * Clinical data validation / lint.
 * Run with: npm test
 * Fails (exit 1) on structural problems, leaked transcript text, [Name] tokens,
 * or missing provenance. Warns (no fail) on TODO EMIS codes.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIRS = [path.join(ROOT, 'app', 'data'), path.join(ROOT, 'data')].filter(fs.existsSync);

let errors = 0, warnings = 0;
const fail = (m) => { console.error('  ✗ ' + m); errors++; };
const warn = (m) => { console.warn('  ! ' + m); warnings++; };
const ok = (m) => console.log('  ✓ ' + m);

const FILLER = [
  'this episode', 'our listener', 'many thanks', 'welcome back', 'today we',
  "i'm the presenter", 'thanks for listening', 'in this podcast'
];

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { fail(`${path.basename(p)}: invalid JSON — ${e.message}`); return null; }
}

function checkNoNameToken(p, raw) {
  if (raw.includes('[Name]')) fail(`${path.basename(p)}: contains residual [Name] token(s)`);
}

function validateDir(dir) {
  console.log(`\nValidating ${path.relative(ROOT, dir)}/`);

  // decision_tools_protocol.json
  const dtPath = path.join(dir, 'decision_tools_protocol.json');
  if (fs.existsSync(dtPath)) {
    const raw = fs.readFileSync(dtPath, 'utf8');
    checkNoNameToken(dtPath, raw);
    const dt = readJson(dtPath);
    if (dt) {
      if (!dt.provenance) fail('decision_tools_protocol.json: missing provenance block');
      let evidenceCount = 0, fillerCount = 0, total = 0;
      (dt.systems || []).forEach(s => (s.tools || []).forEach(t => {
        total++;
        if ('evidence' in t) evidenceCount++;
        const blob = JSON.stringify(t).toLowerCase();
        if (FILLER.some(f => blob.includes(f))) fillerCount++;
      }));
      if (evidenceCount) fail(`decision_tools: ${evidenceCount} tools still carry a transcript 'evidence' field`);
      else ok(`decision_tools: no transcript evidence fields (${total} tools)`);
      if (fillerCount) fail(`decision_tools: ${fillerCount} tools contain podcast filler phrases`);
      else ok('decision_tools: no podcast filler detected');
      if (dt.totalTools && dt.totalTools !== total) warn(`decision_tools: totalTools=${dt.totalTools} but counted ${total}`);
    }
  }

  // blood_tests_protocol.json
  const btPath = path.join(dir, 'blood_tests_protocol.json');
  if (fs.existsSync(btPath)) {
    const bt = readJson(btPath);
    if (bt) {
      let tests = 0, noCode = 0, badStruct = 0;
      bt.forEach(cat => (cat.tests || []).forEach(t => {
        tests++;
        if (!('emisCode' in t)) badStruct++;
        else if (!t.emisCode) noCode++;
        if (!t.name || !t.guidance) badStruct++;
      }));
      if (badStruct) fail(`blood_tests: ${badStruct} tests missing name/guidance/emisCode key`);
      else ok(`blood_tests: ${tests} tests structurally valid`);
      if (noCode) warn(`blood_tests: ${noCode} tests have an empty emisCode (TODO — populate real EMIS read codes)`);
    }
  }

  // drug_interactions.json
  const diPath = path.join(dir, 'drug_interactions.json');
  if (fs.existsSync(diPath)) {
    const di = readJson(diPath);
    if (di) {
      const valid = new Set(['contraindicated', 'major', 'moderate', 'minor']);
      let bad = 0;
      (di.interactions || []).forEach(i => {
        if (!i.drugA || !i.drugB || !valid.has(i.severity) || !i.action) bad++;
      });
      if (bad) fail(`drug_interactions: ${bad} entries missing fields or invalid severity`);
      else ok(`drug_interactions: ${(di.interactions || []).length} entries valid`);
      if (!di.provenance) fail('drug_interactions.json: missing provenance block');
    }
  }

  // knowledge_base.json
  const kbPath = path.join(dir, 'knowledge_base.json');
  if (fs.existsSync(kbPath)) checkNoNameToken(kbPath, fs.readFileSync(kbPath, 'utf8'));

  // provenance manifest
  if (!fs.existsSync(path.join(dir, '_provenance.json'))) fail('_provenance.json manifest missing');
  else ok('_provenance.json manifest present');
}

console.log('PathLinks clinical data validation');
DIRS.forEach(validateDir);

console.log(`\n${errors ? '✗' : '✓'} ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
