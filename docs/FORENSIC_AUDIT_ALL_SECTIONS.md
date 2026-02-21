# Forensic audit: all sections (tools on system fallback)

**Date:** 2025-02-21  
**Purpose:** List every decision tool that uses the system fallback (no topic-specific template) so templates can be added section by section.

**How to re-run:** Build first, then:
```bash
node scripts/audit-all-sections-fallback.js
```
Reads `data/decision_tools_protocol.json`; tools with `steps[0].id` starting with `guidance-` are on fallback.

---

## Summary (after adding cardiovascular templates)

| Metric | Value |
|--------|--------|
| Total tools | 1920 |
| On fallback (need topic template) | **562** |
| With topic-specific template | 1358 |

**Sections with 0 on fallback:** Cardiovascular & Cardiac, Endocrinology & Diabetes.

---

## Sections still with fallback (562 tools)

| Section | On fallback |
|---------|-------------|
| Dermatology & Skin | 28 |
| Mental Health & Wellbeing | 28 |
| Gastroenterology & Liver | 52 |
| Musculoskeletal & Joints | 55 |
| Respiratory & Sleep | 28 |
| Paediatrics & Child Health | 47 |
| Renal, Urology & LUTS | 38 |
| Women's & Reproductive Health | 43 |
| Infectious Disease & Screening | 48 |
| Neurology & Headache | 28 |
| Haematology & Anaemia | 47 |
| ENT & Allergy | 28 |
| Procedures & General Practice | 33 |
| Other clinical topics | 59 |

Full list of titles per section: run `node scripts/audit-all-sections-fallback.js` and see console output.

---

## Fix for user seeing old content (e.g. Multiple endocrine neoplasia)

- **Cache-bust:** App now fetches `decision_tools_protocol.json?v=3` so the browser does not use cached JSON. Bump the version in `app/script.js` when the protocol changes.
- **Deploy:** After any protocol or template change, run `npx vercel --prod --yes` so the live site serves the new file.

Endocrinology (including Multiple endocrine neoplasia) has **0** tools on fallback in the build; if the user still saw generic text, it was due to cached JSON. Cache-bust + deploy fixes this.
