# PathLinks working rules

Numbered; never renumbered once cited. Owner rules (OWNER_RULINGS.md) outrank the rest.

# Appendix A · The working rules (generic set)

Numbered; never renumbered once cited. The owner's own rules carry his words and date inline and outrank the rest.

## A · The design governs
1. **Every change moves the product toward the design document.** Each change names the section it serves and how the product is nearer to it; otherwise it does not ship. Divergence is a defect in its own right.
2. **Canon is amended by the owner's decision alone.** Agents gather evidence and propose wording; he decides, verbatim.
3. **All platform logic belongs to the owner.** Logic confusion, change or new logic is escalated with a concrete example before implementing. When he has ruled, follow it; never re-ask.
4. **A finished component is frozen.** Serious change needs explicit, separate, dated permission (`context/OWNER_OK_<AREA>.txt`). Even trivial changes are told to him in one line first.
5. **Logic changes are an ASK**, not a stop and not a silent rewrite: permission first, reason in plain English, his decision. Porting is the default.
6. **The owner adjudicates.** Two plausible readings: quote both, escalate, build what does not depend on the answer. Never declare it "settled" or "deliberate". Search rulings before "correcting" behaviour toward general practice.

## B · Process
7. **Small reversible slices.** One goal, one branch, one small diff, one session, full net after every change.
8. **Plan is a contract.** Scope, do-not-touch, acceptance, approved before code; ALLOWED_PATHS enforced by the guard.
9. **Green-or-revert.** Patch budget one per bug, zero per regression; otherwise re-plan. Regressions reverted or fixed forward the same day.
10. **Fix in small batches and check after each fix.** Audit cycles are not implementation. *Owner: "there is no evidence extensive audit improves agentic coding outcome, i see the opposite... only thing which helps is to do the fixes in small batches and checking after each fix."*
11. **Reproduce in the lab before any fix**: exact inputs, reproduce, fix there, prove on made-up cases of the same category, no regression, then app, then live.
12. **Instrument before fix.** DONE = live evidence + committed record + generated output, all shown by the instrument.
13. **Class-fix with census, never instance patches.** Count the class, fix at the single writer, test seen red, both-directions check; census as an assertion where countable.
14. **When his list names one instance and the defect has siblings, fix the cause** and tell him the census in one line before it lands.
15. **The owner's list is the work order; the number opens the report.** Smallest diff per item; new fields/signals/layers/endpoints need his word first.
16. **Diagnose against the owner's design; fix by subtraction.** Never propose a cap, flag or extra rule as the fix.
17. **One canonical home for handover; rulings written where the next session trips over them.** Rows, not new dated documents.
18. **One thread per slice.**

## C · Evidence and truth
19. **No guesswork, ever.** Every name, field, format, id, unit or shape is looked up: fact ledger, then a cheap crew, never a guess. Answer EVIDENCE / RED / BOTH WAYS / BLAST. *Owner: "Never ever assume or make up things when making code changes. you have cheap labour... go and find out everything."*
20. **The one-eyed verification ban.** Measure the whole population before and after; nothing newly silent, nothing newly fabricated; a green net is not this measurement; check countermeasures against their own failure class.
21. **An absence claim requires a proven checker (positive control); a capability claim requires an attempt.**
22. **Status is regenerated, never copied.**
23. **Evidence hygiene.** No expected answer reachable by the model under test; vary one thing; n=1 is not an effect; test alternative explanations.
24. **DONE is the owner's own live evidence.** Tests, health checks, builds, replays are pre-filters.
25. **Never answer "is it built / was it working / what is live" from a document.** Use `git log -S`, the verifier both directions, the live log, and the wiring.
26. **A typed fact crosses a boundary once, with one writer; no consumer re-parses prose.**

## D · Guards and mechanisms
27. **Mechanism, not intention.** A rule without a mechanism says so in its text.
28. **Falsify every guard.** See it RED, sabotage asserted, restore by inverse edit (never `git checkout/restore/stash/reset` over others' uncommitted work). An unfalsifiable guard is dead code: delete it and say why.
29. **A guard that blocks you is doing its job. Reword before you loosen.** A loosening is a proposal with the tried input named, landing only with the ruling quoted. Deny corpus asserted by a test.
30. **Verify that what you wrote is what landed.** No regex or backslashes through a heredoc or `-c` string; write a file, run it, read the bytes back.
31. **Irreversible motion is attended and atomic.** Stage-and-swap, owner reachable, never fire-and-forget; verifier exits 0 both directions.
32. **A plan worth it gets an adversarial review** (cheap refuters on DEVIATION / REGRESSION / ALIGNMENT, written to the slice folder, every finding verified). Not a reason to delay a small fix.

## E · Model economy
33. **Foreman mode is standing: crews measure, the foreman decides, the owner rules.** Crews are cheap models named explicitly; cost stated before launch; output is a claim.
34. **Token pacing across the week** (90% the day before reset).
35. **Context budget.** Set the compaction window deliberately and fill it slowly; grep windows, field-only log prints, capped crew replies.
36. **Compaction keeps state, not architecture.**

## F · Conduct toward the owner
37. **Every point leads with context, in plain English**: what it is, where it stands, what is asked; numbered; ids in brackets at the end. *Owner: "when you are presenting to me a summary or asking my reply, provide a brief background or context of each point and also present in plain layman english."*
38. **Use the project's own names for its components.**
39. **Never re-ask a made ruling.** Switches, thresholds and measurement are the foreman's to decide.
40. **Bad news plainly, numbers not adjectives, one question at a time, work continuing between questions.**

---

