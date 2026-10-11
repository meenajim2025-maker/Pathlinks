---
name: pathlinks-context
description: Project map for PathLinks (GP Triage) — components, where truth lives, how to check what is live. Imported by CLAUDE.md. A map, not canon.
---

# PathLinks project map — verified 2026-10-11 against aa2ffa0

## 0 Who does what
Paul (owner, GP partner) rules; top model decides; mid model manages; cheap crews (local Gemma/Qwen via api1.pathready.uk) lift. [SKILL foreman §1]

## 1 What the product is
A NICE-aligned decision-support aid for UK clinicians: blood-test actioning, ~1,574 decision tools by system, drug-interaction checker, four calculators, an education sandbox, a voice triage prototype. Not a medical device. [docs/STATE.md "What PathLinks is"]. Target: the reference teaching tool for clinicians worldwide using UK data and teaching methods [RULING 5].

## 2 Components and what each is FOR (Paul's names)
- **Dashboard / blood-test actioning** — `app/data/blood_tests_protocol.json`, 17 categories, 97 tests; 91 EMIS codes empty [STATE.md table].
- **Decision Tools** — `app/data/decision_tools_protocol.json`, 19 systems, 1,574 tools, each = title + niceRefs + steps[] of dropdown options with `guidance` text [measured 2026-10-11]. Built by `scripts/build-decision-tools.js` from `data/knowledge_base.json`, `scripts/management-content.json` (templates matched by FIRST keyword on title), `scripts/extra-*.json`, `scripts/nice-guideline-map.json` [HANDOVER.md "Decision Tools build"].
- **Calculators** — QRISK3, NEWS2, Wells, CURB-65 in `app/main.js` [README].
- **Drug interactions** — `app/data/drug_interactions.json`, 82 pairs [STATE.md].
- **Education Sandbox** — `app/sandbox-main.js` + `app/data/sandbox_scenarios.json`, 5 scenarios, each: vignette, correctPathways, correctActions, educationalRationale [measured].
- **GP Voice Triage** — `app/voice-triage.js` → `/api/voice-triage/{transcribe,assess,speak}.js`; LLM prompt gives 4 dispositions (999 / same day / 24–48h / self-care) [api/voice-triage/assess.js TRIAGE_SYSTEM]. Models in `config/ai-gateways.json` (pathready + siby gateways) [config].
- **Learning topics** — `app/data/knowledge_base.json`, 16 topic groups from podcast transcripts; licensing unresolved [STATE.md open item 3].

## 3 One unit of work end to end
Edit `scripts/management-content.json` or a source JSON → `npm run build` → writes `data/*.json` then copies to `app/data/` → bump `?v=` cache query in `app/main.js` → `npm test` → Vercel deploy → Paul opens the tool live. [HANDOVER.md "After changing management-content"]

## 4 The record
`docs/STATE.md` (canonical status), `docs/*_SECTION_AUDIT.md` (historical), `docs/OWNER_RULINGS.md`, `docs/WORKING_RULES.md`, `context/CURRENT_TARGET.md`, `docs/HANDOVER.md` §0.

## 5 Where truth lives
| Question | File |
|---|---|
| What is live? | Paul's browser at pathlinks-clinical.vercel.app; `git log -1 -- vercel.json` |
| Why does tool X show plan Y? | `scripts/management-content.json` keyword order, then `scripts/build-decision-tools.js` |
| Which tools are templated? | census script (to be `scripts/census-specificity.js`) — not any document |
| What did Paul decide? | `docs/OWNER_RULINGS.md` |

## 6 How to answer "is it built / live"
Never from a document. `git log -S "<string>" -- app/`, the Vercel deployment list, and a curl of the live data file with its `?v=` query.

## 7 Owner's rules in one screen
RULING 1 GP Triage not NHS Triage · RULING 2 concrete drugs and referrals, no generic plans · RULING 3 audit whole sections · RULING 4 anonymise transcripts · RULING 6 commits only when asked · RULING 7 decision-support wording, no PID, secrets in .env.

## 8 Mistakes already paid for
- Root `index.html` duplicated `app/index.html` and drifted; sandbox "broken" for weeks because the wrong copy was served [HANDOVER.md "What was wrong"]. Removed 2026-06-14 [STATE.md].
- Broad single-word template keywords ("child", "renal", "examination") mapped unrelated conditions to the wrong plan [HANDOVER.md "Decision Tools accuracy"].
- Transcript text shipped in `evidence` fields; removed 2026-06-14 for IP [README].
- HANDOVER.md kept describing retired files after STATE.md replaced it — two status documents drift [observed 2026-10-11].

## 9 Rulings index
See docs/OWNER_RULINGS.md (RULING 1–7, open Q1–Q3).

## 10 What to do first
Read context/CURRENT_TARGET.md; run `node scripts/census-specificity.js` once it exists; otherwise the one-liner in docs/HANDOVER.md.

## 11 Staleness
VERIFIED: . aa2ffa0
ARCH: . docs/STATE.md
ARCH: . CLAUDE.md
ARCH: . docs/WORKING_RULES.md
ARCH: . docs/OWNER_RULINGS.md
ARCH: . scripts/build-decision-tools.js
ARCH: . vercel.json
