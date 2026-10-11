# PathLinks — Canonical Project State

**Single source of truth for project status.** Older dated handovers live in `docs/archive/`.
Last updated: **11 October 2026**.

## What PathLinks is

A clinical decision-support **aid for UK healthcare professionals**: blood-test actioning,
944 NICE-aligned decision tools (114 with fully specific, per-tool curated plans covering every former placeholder; see `docs/CENSUS.md`), a BNF-referenced drug-interaction checker, four
calculators (QRISK3, NEWS2, Wells, CURB-65), an education sandbox, and an LLM-backed voice
triage prototype. **Not a registered medical device.**

Live: https://pathlinks-clinical.vercel.app

## Deployment (authoritative)

- Vercel serves from the **repo root**, but `vercel.json` **rewrites all non-`/api` routes into `/app`**.
  The canonical app is therefore **`app/index.html` + `app/main.js` + `app/sandbox-main.js` + `app/voice-triage.js`**.
- Root-level `index.html`, `script.js`, `sandbox.js`, `index-root-backup.html` were **removed on 2026-06-14**
  (they were dead duplicates). Do **not** recreate them.
- API key `PATHREADY_API_KEY` is set in Vercel Production only; read server-side in `/api/*`. Never shipped to the client.

## Clinical data (`app/data/` — the only copy; `data/` removed 2026-10-11)

| File | Notes |
|------|-------|
| `blood_tests_protocol.json` | 97 tests, 17 categories. `emisCode` scaffolded — **91 are empty TODOs** awaiting real EMIS read codes. |
| `decision_tools_protocol.json` | 944 tools (2026-10-11). Each has `planSource`: `curated` (per-tool, from `scripts/tool-overrides.json`), `template` (keyword template), `merged-generic` (shared plan, labelled as needing content), `fallback`. **Transcript-derived `evidence` removed 2026-06-14.** Built by `scripts/build-decision-tools.js`. |
| `merged_tools.json` | 662 retired tools → their representative. Reversible record of the 2026-10-11 merge. |
| `drug_interactions.json` | 82 curated, severity-graded pairs. Non-exhaustive — always check BNF. |
| `knowledge_base.json` | Summarised learning transcripts. `[Name]` tokens cleaned. **Licensing of source material still to be confirmed before any public/commercial redistribution.** |
| `_provenance.json` | Review/owner manifest for all data files. Update reviewer + dates each cycle. |

All data files carry a `provenance` block (maintainer, `lastReviewed`, `reviewDue`, `reviewedBy`).
**`reviewedBy` is currently a TODO — a named clinician must sign off.**

## Build & validate

```bash
npm run build     # regenerate decision tools (node scripts/build-decision-tools.js)
npm test          # validate data + census gate (generic content may only fall; curated may only rise)
npm run census    # print docs/CENSUS.md; add --update-ceiling after a deliberate improvement
```

`npm test` must pass (0 errors) before deploy. EMIS-code TODOs surface as warnings.

## Open items (priority order)

0. **Clinical sign-off** of 114 curated tools (`reviewedBy: TODO`) — the single biggest open item; then the 141 tools still on shared keyword templates (`sharedWith5plus` in CENSUS) can be curated the same way, section by section.

1. **Clinical sign-off** — replace `reviewedBy: "TODO"` with a named reviewer across data files.
2. **EMIS read codes** — populate the 91 empty `emisCode` fields, then finish the export XML
   (`emis_templates/PathLinks_Complete_Protocol.xml` is the real one; `PathLinks_V23.xml` is a stub).
3. **knowledge_base licensing** — confirm rights for the learning transcripts or replace with original summaries.
4. **Expand drug interactions** beyond the current 82 high-value pairs.

## History

Dated session handovers and per-section forensic audits are preserved in `docs/archive/` and the
specialty `*_SECTION_AUDIT.md` files. They are historical context, not current status — this file wins.
