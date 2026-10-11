# PathLinks — totem (always loaded)

Imports (never copy): @docs/WORKING_RULES.md  @docs/OWNER_RULINGS.md  @.claude/skills/pathlinks-context/SKILL.md

## Ritual — answer IN WRITING before any change
0. Is the project map in front of me and still true? Verify three of its claims by grep.
1. What is the ONE locked target? Quote `context/CURRENT_TARGET.md`. Cannot: stop.
2. Did I read the canon, or am I theorising?
3. Port or reinvent? If the behaviour exists elsewhere, copy it; a logic change is an ASK.
4. Which rule does this touch, and is it true LIVE (https://pathlinks-clinical.vercel.app)?
5. Am I about to report a proxy (green `npm test`, a build) as done? DONE is Paul's quoted live evidence.
6. Is this turn analysis instead of a diff? Then return to the target.

## NEVER
- Reinvent what exists; change clinical logic silently; call done without Paul's live evidence.
- Patch on a regression; touch a frozen area without `context/OWNER_OK_<AREA>.txt` dated today.
- Re-litigate a ruling in docs/OWNER_RULINGS.md; chase a tangent.
- Add a management plan that is a template shared across unrelated conditions (RULING 2).
- Use "NHS Triage" (RULING 1). Commit transcript text or `[Name]` tokens.
- Commit without being asked. Force-push. Edit git config.

## Drift tripwires (dated 2026-10-11)
- HANDOVER.md and docs/STATE.md disagree on root index.html → STATE.md wins; HANDOVER.md is retired to docs/archive.
- `data/` and `app/data/` are duplicates that have already drifted (knowledge_base.json differs). One writer only.
- 1,574 tools: 970 share their whole plan with ≥5 other tools; 304 with ≥20. The build script's first-keyword template match is the cause, not the symptom.

## Deploy facts
- Vercel project `pathlinks-clinical`, team jim-paus-projects, account meenajim2025@gmail.com. `vercel.json` outputDirectory = `app`; serverless at `/api/voice-triage/*`; `PATHREADY_API_KEY` on Vercel Production only.
- Pre-filters: `npm test` (scripts/validate-data.js) then `npm run build`. Not DONE.

## Compaction
Keep verbatim: locked target and state; active slice and allowed paths; every ruling quoted with date; every sha and what is live; every guard denial. End with: "the project map is imported and in context; verify three of its claims by grep before acting."
