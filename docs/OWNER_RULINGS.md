# Owner rulings — verbatim, dated. Never summarised, never re-asked.

## RULING 1 (2026-02, recorded 2026-10-11)
Branding is "GP Triage" not "NHS Triage"; remove references to NHS and Pathways from project naming where instructed.

## RULING 2 (2026-02, recorded 2026-10-11)
Concrete drug names and referral steps required; zero tolerance for generic/placeholder management plans.

## RULING 3 (2026-02, recorded 2026-10-11)
Audit entire sections completely — do not sample; user should not need to manually QA.

## RULING 4 (2026-02, recorded 2026-10-11)
All transcribed podcast content must be anonymised (remove names of people mentioned).

## RULING 5 (2026-10-11, Paul)
"aim is to make this project the best teaching tool and a reference for all the clinicians from around the world using UK based medicine data and teaching technioques"

## RULING 6 (standing, from Paul's preferences)
Only create git commits when explicitly requested; if unclear, ask first. Never force-push; never edit git config.

## RULING 7 (standing, clinical safety)
"This tool supports decision-making and does not replace clinical judgement." No diagnostic claims; red-flag escalation where appropriate; no identifiable patient data anywhere; secrets only in .env.

## RULING 8 (2026-10-11, Paul) — answers Q1
"first is faster and more honest, proceed with the changes , if you can write/make changes to the headline numbers it will be great , just follow the accepted management plan if available from any reputed resources"
Applied: template-shared tools merged into one representative per group (1,574 → 887); headline numbers corrected everywhere; curated plans follow NICE CKS / BNF / named guideline and are labelled drafts until signed.

## Open questions awaiting a ruling
- Q4 Continue curation into the 141 template-based tools (Hypothyroidism, Asthma, COPD, Depression, CKD, HIV, Contraception groups etc.) using the same method? Each is a real condition with a keyword template rather than a placeholder — thinner than curated but not generic across unrelated conditions.
- Q2 knowledge_base.json licensing: keep podcast-derived summaries behind a login, replace with original summaries, or remove? (blocks worldwide release)
- Q3 Named clinical reviewer for `reviewedBy: TODO` — Paul himself, or a second clinician?
