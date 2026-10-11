# PathLinks major improvement — plan (slices)

Measured baseline 2026-10-11 (head aa2ffa0), from `app/data/decision_tools_protocol.json`:
- 1,574 tools, 4,326 option texts, only 819 unique.
- 970 tools (62%) have a plan shared verbatim with ≥5 other tools; 304 (19%) with ≥20.
- 976 tools (62%) cite nothing more specific than "NICE CKS / Local formulary".
- 1,362 tools (87%) are a single dropdown step. 504 (32%) mention a dose or frequency.
- Sandbox: 5 scenarios. Knowledge base: 16 topic groups, licensing unresolved. `reviewedBy`: TODO.

Each slice: one goal, one branch, allowed paths in the contract, pre-filter `npm test`, DONE = Paul's live evidence.

## Slice 0 — truth reset (no clinical changes)
Retire HANDOVER.md to docs/archive; STATE.md the only status doc. Delete the `data/` duplicate; build writes straight to `app/data/`. Add Foreman files + hooks. Paul confirms the live URL loads and the sandbox opens.

## Slice 1 — the measurement gate
`scripts/census-specificity.js`: for every tool, how many other tools share each plan text verbatim, and whether a specific guideline ref exists. Wired into `npm test` as an assertion with today's numbers as the ceiling (it can only go down). This is the "instrument before fix" [RULE 12] and the census [RULE 13].

## Slice 2 — fix the cause, by section (needs RULING on Q1)
The cause is the first-keyword template writer. Replace per section with per-tool content keyed by tool id. Drafting by cheap local crews (Gemma 4 26B / Qwen) against the NICE CKS topic named in `nice-guideline-map.json`, output capped and treated as a CLAIM; Paul (or named reviewer) signs each section; `reviewedBy` filled per section. Order: Musculoskeletal (59 generic), Haematology (46), Infectious (38), ENT (32), Neurology (29), Women's (28), Mental health (25), Respiratory (23), Endocrine (17).

## Slice 3 — the teaching layer
Every tool gains: "why" (guideline section + date), a one-line red-flag list, and 1–3 case vignettes with a graded answer, generated into `sandbox_scenarios.json` by tool id (5 → hundreds). Add spaced-repetition review and an AKT/SCA-style case mode. Voice OSCE: reuse the existing STT → LLM → TTS pipeline so the learner talks to a simulated patient and the LLM grades against the tool's plan (bidirectional voice is already built; only the prompt and grading change).

## Slice 4 — reference for clinicians worldwide
UK-lens glossary (NICE, CKS, BNF, 2WW, QOF, 111) with hover definitions; every tool citable (version, review date, reviewer); international units where they differ; a printable/stable URL per tool. Knowledge base: resolved per RULING on Q2 before any public announcement.

## Slice 5 — governance that bites
Review-due dates surfaced in the UI; `npm test` fails on an overdue section; the EMIS-code TODOs either populated or the export removed from the UI.
