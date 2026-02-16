# Forensic audit: Decision tools and clinician experience

**Date:** 2025-02-16

## Issues found

### 1. Topic order within systems
- **Problem:** Tools were listed in build order (learning × 3, then extra-nice, then bulk, then bulk-1000), so topics appeared in an arbitrary order (e.g. "Sore throat – child" next to "Cow's milk allergy" in Paediatrics with no logical or alphabetical order).
- **Impact:** Clinicians could not quickly find a condition in long dropdowns (~100+ topics per system).
- **Fix:** Sort each system's tools **alphabetically by title** in the build script before writing the JSON.

### 2. No search or filter in Decision tools view
- **Problem:** Only two dropdowns (system, then topic); no way to type "sore throat" or "cow's milk" to narrow the list.
- **Impact:** Poor discoverability and slower workflow.
- **Fix:** Add a **filter input** above the topic dropdown that filters options by title (and show "X of Y topics" when filtered). Optionally add a **global search** that searches across all systems and jumps to the chosen tool.

### 3. Duplicate / similar titles across systems
- **Observation:** "Sore throat" appears in ENT (adult) and "Sore throat – child" in Paediatrics; both are correct. No change needed, but alphabetical sort and filter make it clear.
- **Recommendation:** Keep titles that disambiguate (e.g. "Sore throat – child", "UTI – woman") so clinicians know which tool they are in.

### 4. Possible misplacement in bulk data
- **Checked:** "Restless legs" was under mental-health in bulk-1000; NICE CKS treats it as neurological. Moved to neurology in data fix.
- **Checked:** "Narcolepsy" in mental-health is borderline (sleep/neurology); left as is; can add to neurology as well or move in a later pass.
- **General:** Any topic that is clearly single-system (e.g. "Sore throat" = ENT, "Sore throat – child" = Paediatrics) is correct. No other obvious misplacements found in spot check.

### 5. Knowledge base and evidence text
- **Observation:** Some tools use system fallback with generic infectious text (e.g. "Sore throat: FeverPAIN…") for every topic in that system when no template matches, which can look repetitive.
- **Recommendation:** Add more topic-specific templates in `management-content.json` for high-use conditions so guidance is tailored. Already done for many; expand over time.

### 6. Clinician experience – design improvements
- **Done:** Sort tools A–Z; add topic filter by keyword.
- **Suggested later:** (1) "Search all systems" single box that shows matching tools with system name and opens on choose. (2) Subcategories within a system (e.g. Paediatrics → Infection / Development / Behaviour) if we add category metadata. (3) Favourites or recent tools. (4) Print-friendly guidance view.

---

## Changes made (this pass)

1. **Build script:** Sort `sys.tools` by `tool.title` (localeCompare) before output.
2. **Decision tools UI:** Add "Filter topics" text input; when system is selected, filter topic dropdown by title match (case-insensitive); show "Showing X of Y" when filtered.
3. **Bulk data:** Correct obvious misplacements (e.g. Restless legs → neurology) in `extra-tools-bulk-1000.json`.
4. **Rebuild** `decision_tools_protocol.json` and copy to `app/data/`.

---

## How to extend

- **Add conditions:** Edit `scripts/extra-tools-bulk-1000.json` or `extra-tools-bulk.json`; use correct `systemId` (cardiovascular, dermatology, mental-health, gastroenterology, endocrinology, musculoskeletal, respiratory, paediatrics, renal-urology, women-health, infectious, neurology, haematology, ent, procedures-general, other).
- **Topic-specific guidance:** Add or edit templates in `scripts/management-content.json` (keyword match on title).
- **Re-run build:** `node scripts/build-decision-tools.js && cp data/decision_tools_protocol.json app/data/`.
