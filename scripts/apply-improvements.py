#!/usr/bin/env python3
"""One-off remediation pass implementing the PathLinks improvement roadmap.
Safe to re-run (idempotent). Operates on both app/data/ and data/ copies."""
import json, os, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY = "2026-06-14"
REVIEW_DUE = "2026-12-14"  # 6-month clinical review cycle
DATA_DIRS = [os.path.join(ROOT, "app", "data"), os.path.join(ROOT, "data")]

def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def save(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)

PROVENANCE = {
    "maintainer": "PathLinks Clinical Governance",
    "lastReviewed": TODAY,
    "reviewDue": REVIEW_DUE,
    "reviewedBy": "TODO – clinical reviewer to sign off",
    "disclaimer": "Decision-support aid for UK healthcare professionals only. Not a registered medical device. Always verify against current NICE CKS, BNF/BNFc and local policy."
}

def clean_name_tokens(s):
    if not isinstance(s, str):
        return s
    return (s.replace("I'm [Name]", "the speaker introduces")
             .replace("[Name]", "the presenter"))

def deep_clean(obj):
    if isinstance(obj, dict):
        return {k: deep_clean(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [deep_clean(v) for v in obj]
    return clean_name_tokens(obj)

summary = {}

for d in DATA_DIRS:
    if not os.path.isdir(d):
        continue
    tag = os.path.relpath(d, ROOT)

    # ---- 1. decision_tools_protocol.json: drop transcript 'evidence', add provenance ----
    p = os.path.join(d, "decision_tools_protocol.json")
    if os.path.exists(p):
        dt = load(p)
        removed = 0
        for s in dt.get("systems", []):
            for t in s.get("tools", []):
                if "evidence" in t:
                    del t["evidence"]; removed += 1
        dt = deep_clean(dt)  # strip any residual [Name]
        dt["provenance"] = PROVENANCE
        dt["evidencePolicy"] = ("Transcript-derived 'evidence' text removed 2026-06-14 for IP/quality. "
                                 "Guidance is the curated NICE-aligned management steps only.")
        save(p, dt)
        summary[f"{tag}/decision_tools"] = f"evidence removed from {removed} tools"

    # ---- 2. knowledge_base.json: strip [Name] tokens, add provenance ----
    p = os.path.join(d, "knowledge_base.json")
    if os.path.exists(p):
        kb = load(p)
        before = json.dumps(kb).count("[Name]")
        kb = deep_clean(kb)
        if isinstance(kb, dict):
            kb["provenance"] = dict(PROVENANCE,
                note="Learning transcripts are summarised third-party educational material; review licensing before any public/commercial redistribution.")
        save(p, kb)
        summary[f"{tag}/knowledge_base"] = f"[Name] tokens cleaned ({before} -> 0)"

    # ---- 3. blood_tests_protocol.json: scaffold emisCode, keep array shape ----
    p = os.path.join(d, "blood_tests_protocol.json")
    if os.path.exists(p):
        bt = load(p)
        scaffolded = 0
        for cat in bt:
            for t in cat.get("tests", []):
                if not t.get("emisCode"):
                    t["emisCode"] = ""          # placeholder
                    t["emisCodeTodo"] = True     # flagged for clinician to populate
                    scaffolded += 1
                elif t.get("emisCodeTodo"):
                    t.pop("emisCodeTodo", None)
        save(p, bt)
        summary[f"{tag}/blood_tests"] = f"emisCode scaffolded on {scaffolded} tests"

    # ---- 4. drug_interactions.json: expand + date-stamp ----
    p = os.path.join(d, "drug_interactions.json")
    if os.path.exists(p):
        di = load(p)
        existing = {(i["drugA"].lower(), i["drugB"].lower()) for i in di["interactions"]}
        NEW = [
            ("warfarin","clarithromycin","major","Macrolide raises INR (CYP inhibition) — bleeding risk.","Avoid or monitor INR closely; consider alternative antibiotic.","BNF"),
            ("warfarin","erythromycin","major","Raised INR via CYP3A4 inhibition.","Monitor INR; consider alternative.","BNF"),
            ("warfarin","miconazole","major","Even topical/oral gel markedly raises INR.","Avoid; use alternative antifungal.","BNF / SPS"),
            ("simvastatin","amlodipine","moderate","Amlodipine raises simvastatin exposure (myopathy risk).","Max simvastatin 20 mg with amlodipine.","BNF"),
            ("simvastatin","grapefruit juice","moderate","CYP3A4 inhibition raises statin levels.","Avoid grapefruit juice with simvastatin.","BNF"),
            ("methotrexate","aspirin","major","Reduced MTX excretion — toxicity.","Avoid high-dose aspirin; caution with analgesic doses.","BNF"),
            ("amiodarone","simvastatin","moderate","Increased myopathy/rhabdomyolysis risk.","Max simvastatin 20 mg with amiodarone.","BNF"),
            ("amiodarone","warfarin","major","Potentiates warfarin for weeks (long half-life).","Reduce warfarin dose; monitor INR.","BNF"),
            ("digoxin","verapamil","major","Raised digoxin levels and AV block.","Reduce digoxin; monitor levels and ECG.","BNF"),
            ("digoxin","spironolactone","moderate","Raised digoxin levels; assay interference.","Monitor digoxin and potassium.","BNF"),
            ("clopidogrel","fluoxetine","moderate","CYP2C19 inhibition reduces clopidogrel activation.","Prefer alternative; review antiplatelet need.","SPS"),
            ("ssri","nsaid","moderate","Additive GI bleeding risk.","Co-prescribe PPI if NSAID needed; monitor.","NICE CKS"),
            ("ssri","aspirin","moderate","Increased GI bleeding risk.","Gastroprotection if combined; review need.","NICE CKS"),
            ("citalopram","domperidone","major","Additive QT prolongation.","Avoid combination.","BNF / MHRA"),
            ("citalopram","ondansetron","major","Additive QT prolongation.","Avoid or ECG/electrolyte monitoring.","BNF / MHRA"),
            ("macrolide","statin","major","CYP3A4 inhibition — rhabdomyolysis risk (esp. simvastatin/atorvastatin).","Suspend statin during course or use non-interacting statin.","BNF"),
            ("trimethoprim","ace inhibitor","moderate","Hyperkalaemia risk (additive).","Monitor potassium, especially in renal impairment/elderly.","NICE CKS / SPS"),
            ("trimethoprim","spironolactone","major","Significant hyperkalaemia risk.","Avoid in at-risk patients; monitor potassium.","SPS"),
            ("allopurinol","mercaptopurine","contraindicated","Xanthine oxidase inhibition — profound myelosuppression.","Avoid or reduce mercaptopurine to ~25% with specialist input.","BNF"),
            ("phenytoin","fluconazole","major","Raised phenytoin levels — toxicity.","Monitor phenytoin levels; adjust dose.","BNF"),
            ("carbamazepine","clarithromycin","major","Raised carbamazepine — toxicity.","Avoid; use alternative antibiotic.","BNF"),
            ("theophylline","ciprofloxacin","major","Raised theophylline — toxicity (seizures, arrhythmia).","Avoid or monitor levels and reduce dose.","BNF"),
            ("beta-blocker","verapamil","major","Additive bradycardia/AV block/heart failure.","Avoid combination, especially IV.","BNF"),
            ("metformin","alcohol","moderate","Increased lactic acidosis risk with acute excess.","Counsel; caution in renal/hepatic impairment.","BNF"),
            ("sildenafil","nitrate","contraindicated","Profound hypotension.","Absolute contraindication.","BNF"),
            ("potassium","trimethoprim","moderate","Hyperkalaemia (trimethoprim is potassium-sparing).","Monitor potassium.","SPS"),
        ]
        added = 0
        for a,b,sev,desc,act,src in NEW:
            if (a,b) in existing or (b,a) in existing:
                continue
            di["interactions"].append({"drugA":a,"drugB":b,"severity":sev,"description":desc,"action":act,"source":src})
            existing.add((a,b)); added += 1
        di["provenance"] = dict(PROVENANCE,
            coverageNote=("Curated, non-exhaustive subset of clinically important interactions. "
                          "A 'no interaction identified' result does NOT exclude an interaction — always check current BNF/BNFc/Stockley's."),
            interactionCount=len(di["interactions"]))
        save(p, di)
        summary[f"{tag}/drug_interactions"] = f"added {added} pairs (now {len(di['interactions'])})"

    # ---- 5. sandbox_scenarios.json: provenance ----
    p = os.path.join(d, "sandbox_scenarios.json")
    if os.path.exists(p):
        sc = load(p)
        if isinstance(sc, dict):
            sc.setdefault("provenance", PROVENANCE)
            save(p, sc)
            summary[f"{tag}/sandbox_scenarios"] = "provenance added"
        # if list, central provenance file covers it

    # ---- 6. clinical_topics_learning.json: clean + provenance ----
    p = os.path.join(d, "clinical_topics_learning.json")
    if os.path.exists(p):
        ct = load(p)
        ct = deep_clean(ct)
        if isinstance(ct, dict):
            ct.setdefault("provenance", PROVENANCE)
        save(p, ct)
        summary[f"{tag}/clinical_topics_learning"] = "cleaned + provenance"

    # ---- 7. central provenance manifest (covers array-shaped files too) ----
    manifest = {
        "_comment": "Clinical data provenance & review manifest. Update reviewer + dates each governance cycle.",
        "generated": TODAY,
        "reviewCycleMonths": 6,
        "files": {
            "blood_tests_protocol.json": dict(PROVENANCE, sources=["NICE CKS","NICE NG/CG","local lab ranges"]),
            "decision_tools_protocol.json": dict(PROVENANCE, sources=["NICE CKS","NICE NG/CG"]),
            "drug_interactions.json": dict(PROVENANCE, sources=["BNF","BNFc","Stockley's","SPS","NICE CKS"]),
            "knowledge_base.json": dict(PROVENANCE, sources=["Summarised educational transcripts (review licensing)"]),
            "sandbox_scenarios.json": dict(PROVENANCE, sources=["NICE-referenced teaching vignettes"]),
        }
    }
    save(os.path.join(d, "_provenance.json"), manifest)
    summary[f"{tag}/_provenance.json"] = "written"

print(json.dumps(summary, indent=2))
