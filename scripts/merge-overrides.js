// Dev helper: merge a batch JSON into scripts/tool-overrides.json (node scripts/merge-overrides.js batch.json batchName)
const fs = require('fs'); const [,, file, name] = process.argv;
const ov = JSON.parse(fs.readFileSync(__dirname + '/tool-overrides.json')); const b = JSON.parse(fs.readFileSync(file));
for (const [k, v] of Object.entries(b)) { v.curatedBy = v.curatedBy || 'Claude draft (NICE CKS / BNF / named guideline)'; v.date = v.date || '2026-10-11'; v.reviewedBy = v.reviewedBy || 'TODO'; ov[k] = v; }
ov._batch = (ov._batch ? ov._batch + ', ' : '') + name;
fs.writeFileSync(__dirname + '/tool-overrides.json', JSON.stringify(ov, null, 2) + '\n');
console.log('merged', Object.keys(b).length, 'tools from', name);
