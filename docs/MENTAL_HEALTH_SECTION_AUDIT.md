# Mental Health section – consistency audit

**Date:** 2025-02-21  
**Scope:** Decision tools in **Mental Health**; templates in `scripts/management-content.json` and system fallback in `scripts/build-decision-tools.js`.

---

## 1. Mental health templates (summary)

| Template (keywords) | Question / steps | NICE refs |
|--------------------|------------------|-----------|
| Depression, MDD, TRD | Overview; Diagnosis & Severity; Treatment Ladder | NG222 ✓ (added where missing) |
| Phobia, social anxiety, agoraphobia | Overview; Phobia Subtypes | CG159, CG113 ✓ |
| PTSD, OCD, trauma | Overview; PTSD; OCD | NG116, CG31 ✓ (added where missing) |
| Bipolar, psychosis, schizophrenia, mania | Overview; Bipolar; Schizophrenia & Psychosis | CG185, CG178 ✓ (added where missing) |
| SSRI, antidepressant | Drug & Follow-up | NG222 ✓ (added) |
| mental-health-misc (anxiety, GAD, bipolar, eating, etc.) | Mental health | NG226, NG222, NG10, NG69, CKS ✓ |

---

## 2. Wording consistency

- **Heading:** Mix of `MANAGEMENT PLAN:` and `MANAGEMENT PLAN OVERVIEW:`; some "Consultant Grade" / "NICE CG185". ✓
- **Body:** Numbered steps. ✓
- **End refs:** Multiple overview and treatment options lacked NICE ref at end. **Fixed:** Added NICE NG222, CG159, NG116, CG31, CG185, CG178 to depression, phobia, PTSD/OCD, bipolar/schizophrenia, and SSRI options.

---

## 3. System fallback

- **Management fallback** (`systemId === 'mental-health'`): "Mental Health Support (Best Practice)" – crisis, self-help, safety-net. ✓
- **Catch-all** (`guidance-mental-health`): 3-part Assessment | Management | Referral. ✓

---

*Audit complete; NICE refs added to mental health topic options.*
