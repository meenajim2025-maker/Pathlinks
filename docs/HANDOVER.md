# Handover §0 — regenerated 2026-10-11 (status is regenerated, never copied)

## Live
NOT verified. Nothing from this session is deployed. Live site last deployed from aa2ffa0 (2026-08-31) as far as GitHub shows. Paul to deploy and open three tools: "Iron deficiency anaemia", "Anticoagulation – choosing, dosing, monitoring and reversal", "Polymyalgia rheumatica", and confirm search for a retired title ("Warfarin – INR target", "Hypothyroidism – pregnancy") lands on the right tool.

## Repo (this patch, uncommitted — RULING 6)
- Build now writes only to app/data/; data/ deleted. scripts/tool-overrides.json = per-tool curated layer: 114 tools across all systems (batches msk-1, haem-1, inf-1, ent-1, neuro-1, wh-1, mh-1, resp-1, endo-1, cardio-1, derm-2, proc-1, other-1, gastro-1, msk-2, paeds-1, renal-1, triage-1). Every 'Shared plan' placeholder is gone (mergedGeneric 0).
- app/main.js: search matches aliases; protocol cache-bust bumped to ?v=11.
- Headline numbers corrected in README.md and docs/STATE.md. HANDOVER.md retired to docs/archive/.
- Foreman method files added: CLAUDE.md, docs/WORKING_RULES.md, docs/OWNER_RULINGS.md (RULING 1–8), .claude/skills/pathlinks-context/SKILL.md, context/CURRENT_TARGET.md. Hooks and tools/skill_staleness.py still to be copied from the method folder in Claude Code.

## Audit of batches 3–18 (2026-10-11, chat session)
The 74 entries after haem-1 were already on disk when this session resumed (written 14:26 by another process). Audited structurally in full: every entry ≥3 options, median option 1,071 chars, named sources, zero duplicated text, zero filler phrases, zero false sign-offs (all reviewedBy TODO). Read in full: ECG, adrenal insufficiency, pregnancy, type 2 diabetes (BP target wording corrected); spot-checked UTI-in-pregnancy caveats, necrotising fasciitis, subdural, eating disorders. Not read line-by-line: the remaining 66 — they remain CLAIMS until Paul's sign-off.

## Owed
- Deploy + live check (Paul). Then commit when Paul asks.
- Sign-off of the 114 curated drafts (reviewedBy) — Paul or named reviewer; corrections go in tool-overrides.json then npm run build.
- Next content target (ruling needed): 141 tools still on keyword templates (sharedWith5plus in docs/CENSUS.md).
- Rulings Q2 (knowledge_base licensing), Q3 (named reviewer). Vercel project census (connector still incomplete).
