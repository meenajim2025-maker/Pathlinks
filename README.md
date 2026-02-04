# PathLinks Clinical Decision Support (V2.0)

A comprehensive clinical decision support tool for UK General Practice, designed to streamline blood test actioning and integrated with EMIS Web.

## 🚀 Key Features

- **Protocol-Driven Actioning**: Over 50 standard blood tests with NICE-aligned clinical guidance.
- **Diabetes Management**: Automated interpretation of HbA1c (Prediabetes, T2DM diagnosis, and intensification triggers).
- **Lipid & CVD Risk**: Integrated **QRISK3 Calculator** that can simulate EMIS data imports.
- **Antenatal & Viral Screening**: Safe interpreting of HIV, Syphilis, Hep B, and Varicella (Chickenpox) in pregnancy.
- **Immunology & Allergy**: Grade-based interpretation of Specific IgE (RAST) and post-vaccination immunity checks (Anti-HBs).
- **Tumour Markers**: Age-specific PSA thresholds and NICE 2WW referral prompts for CA125, CA19-9, etc.
- **EMIS Integration**: Downloadable XML protocols for automated clinical alerts within EMIS Web.

## 📁 Project Structure

- `/app`: The core web application (index.html, style.css, script.js).
- `/data`: The clinical engine (`blood_tests_protocol.json`).
- `/emis_templates`: EMIS Web compatible XML protocols.

## 🛠️ How to Use

1. **Dashboard**: Open `http://localhost:3000` to access the clinical analysis tool.
2. **Actioning**: Select a category and parameter, enter the value, and follow the clinical checklist.
3. **EMIS Workflow**: Go to the "EMIS Integration" tab to download the latest protocol file for import into your clinical system.

## 📋 Version History

- **V2.0**: Massive expansion into Antenatal, Vaccination Immunity, and RAST Allergy testing.
- **V1.9**: Added Diabetes Management (HbA1c) and NG28 escalation logic.
- **V1.8**: Integrated QRISK3 Calculator and EMIS data simulation.
- **V1.7**: Added Lipids expansion and fixed Tumour Marker age-specific logic.

---
*Developed for PathLinks Clinical Governance.*
