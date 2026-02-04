# PathLinks EMIS Web Protocol Setup Guide

## ⚠️ Important Note

EMIS Web protocols and templates **cannot be imported from external XML files**. They must be created **within EMIS Web** using the Resource Publisher / Template Manager interface.

This guide provides step-by-step instructions for setting up PathLinks clinical protocols in your EMIS Web system.

---

## 📋 Prerequisites

- EMIS Web admin access (or appropriate permissions)
- Access to Configuration > Resource Publisher (or Template Manager)

---

## 🚀 Creating Clinical Alert Protocols in EMIS Web

### Step 1: Access Resource Publisher

1. Click the **EMIS Button** (top left)
2. Go to **Configuration** → **Resource Publisher** (or Template Manager)
3. Click on the **Protocols** tab

### Step 2: Create a New Protocol Folder

1. Right-click in the folder pane
2. Select **New Folder**
3. Name it: `PathLinks Blood Result Protocols`

### Step 3: Create Individual Protocols

For each protocol below, follow these steps:

1. Right-click on your new folder
2. Select **Add Protocol**
3. Enter the protocol details as specified

---

## 📊 Protocol Configurations

### Protocol 1: Hyperkalaemia Alert

| Field | Value |
|-------|-------|
| **Name** | PathLinks - Hyperkalaemia Alert |
| **Description** | Alert when Potassium >= 6.0 mmol/L |
| **System Trigger** | On Filing Result |
| **Trigger Criteria** | Test = Potassium; Value >= 6.0 |
| **Run Mode** | Always Run |

**Action Node:**
- Type: Display Prompt
- Title: URGENT: Hyperkalaemia Detected
- Message: 
  ```
  Potassium ≥ 6.0 mmol/L
  
  ACTIONS:
  1. Obtain ECG immediately
  2. If K ≥ 6.5: Urgent hospital admission
  3. Review medications: ACEi, ARBs, Spironolactone, NSAIDs
  
  Suggested Read Code: 44I7. (Serum K+ raised)
  ```

---

### Protocol 2: Severe Hyponatraemia Alert

| Field | Value |
|-------|-------|
| **Name** | PathLinks - Severe Hyponatraemia |
| **Description** | Alert when Sodium < 125 mmol/L |
| **System Trigger** | On Filing Result |
| **Trigger Criteria** | Test = Sodium; Value < 125 |
| **Run Mode** | Always Run |

**Action Node:**
- Type: Display Prompt
- Title: URGENT: Severe Hyponatraemia
- Message:
  ```
  Sodium < 125 mmol/L - Risk of seizures/confusion
  
  ACTIONS:
  1. Assess clinical status urgently
  2. Consider hospital admission
  3. Review medications (diuretics, SSRIs)
  
  Suggested Read Code: 44I5. (Serum sodium low)
  ```

---

### Protocol 3: Anaemia Investigation

| Field | Value |
|-------|-------|
| **Name** | PathLinks - Anaemia Screen |
| **Description** | Prompt for low Haemoglobin |
| **System Trigger** | On Filing Result |
| **Trigger Criteria** | Test = Hb; Value < 115 (Female) OR < 130 (Male) |
| **Run Mode** | Always Run |

**Action Node:**
- Type: Display Prompt
- Title: Anaemia Detected
- Message:
  ```
  Low Haemoglobin result filed
  
  INVESTIGATIONS:
  1. Check Ferritin, B12, Folate
  2. If age >60 or red flags: FIT test
  3. Consider 2WW referral if GI symptoms
  
  Suggested Read Code: 422.. (Anaemia screen done)
  ```

---

### Protocol 4: Hypothyroidism Alert

| Field | Value |
|-------|-------|
| **Name** | PathLinks - Overt Hypothyroidism |
| **Description** | Alert when TSH > 10 mU/L |
| **System Trigger** | On Filing Result |
| **Trigger Criteria** | Test = TSH; Value > 10 |
| **Run Mode** | Always Run |

**Action Node:**
- Type: Display Prompt
- Title: Overt Hypothyroidism
- Message:
  ```
  TSH > 10 mU/L indicates overt hypothyroidism
  
  MANAGEMENT:
  1. Start Levothyroxine 25-50mcg OD
     (Lower dose if elderly or cardiac disease)
  2. Recheck TFTs in 6-8 weeks
  3. Target TSH 0.4 - 2.0 mU/L
  
  Suggested Read Code: C10.. (Hypothyroidism)
  ```

---

### Protocol 5: New Diabetes Diagnosis

| Field | Value |
|-------|-------|
| **Name** | PathLinks - New T2DM Diagnosis |
| **Description** | Alert when HbA1c >= 48 mmol/mol |
| **System Trigger** | On Filing Result |
| **Trigger Criteria** | Test = HbA1c; Value >= 48 |
| **Run Mode** | Prompt User |

**Decision Node:**
- Question: Is this a new diagnosis of Type 2 Diabetes?

**Action Node (if Yes):**
- Type: Display Prompt + Add Code
- Title: New Type 2 Diabetes
- Message:
  ```
  HbA1c ≥ 48 mmol/mol = Diagnostic of T2DM
  
  INITIAL MANAGEMENT (NG28):
  1. Offer Metformin 500mg BD (titrate up)
  2. Lifestyle advice (diet, exercise, weight)
  3. Target HbA1c: usually 48 mmol/mol
  4. Book diabetes annual review
  
  Add Read Code: C10F. (Type 2 diabetes mellitus)
  ```

---

### Protocol 6: High Cholesterol - QRISK Reminder

| Field | Value |
|-------|-------|
| **Name** | PathLinks - Lipid QRISK Reminder |
| **Description** | Prompt QRISK when TC > 5.0 mmol/L |
| **System Trigger** | On Filing Result |
| **Trigger Criteria** | Test = Total Cholesterol; Value > 5.0 |
| **Run Mode** | Prompt User |

**Action Node:**
- Type: Display Prompt
- Title: Elevated Cholesterol - Consider QRISK
- Message:
  ```
  Total Cholesterol > 5.0 mmol/L
  
  NEXT STEPS:
  1. Calculate QRISK3 score
  2. If QRISK3 ≥ 10%: Offer statin therapy
  3. If QRISK3 < 10%: Lifestyle modification
  
  Suggested Read Code: 38DR. (QRISK2 CVD 10yr risk)
  ```

---

### Protocol 7: Elevated PSA

| Field | Value |
|-------|-------|
| **Name** | PathLinks - PSA Review |
| **Description** | Alert for elevated PSA (age-specific) |
| **System Trigger** | On Filing Result |
| **Trigger Criteria** | Test = PSA; Custom age thresholds |
| **Run Mode** | Always Run |

**Action Node:**
- Type: Display Prompt
- Title: Elevated PSA - Review Required
- Message:
  ```
  PSA above age-specific threshold
  
  AGE-SPECIFIC THRESHOLDS:
  - Age 40-49: > 2.5 ng/mL
  - Age 50-59: > 3.5 ng/mL
  - Age 60-69: > 4.5 ng/mL
  - Age 70-79: > 6.5 ng/mL
  
  If persistently elevated: Consider 2WW urology referral
  
  Suggested Read Code: 4K15. (PSA raised)
  ```

---

### Protocol 8: Elevated ALT - MASLD Pathway

| Field | Value |
|-------|-------|
| **Name** | PathLinks - ALT Elevated |
| **Description** | Alert when ALT > 35 IU/L (F) or > 40 IU/L (M) |
| **System Trigger** | On Filing Result |
| **Trigger Criteria** | Test = ALT; Value above ULN |
| **Run Mode** | Prompt User |

**Action Node:**
- Type: Display Prompt
- Title: Elevated ALT - Consider MASLD Pathway
- Message:
  ```
  ALT above upper limit of normal
  
  CONSIDER MASLD PATHWAY:
  1. Check for alcohol excess
  2. Hepatitis B/C screen if risk factors
  3. Calculate FIB-4 score
  4. If FIB-4 intermediate/high: Enhanced liver fibrosis test
  
  Suggested Read Code: 44G5. (Serum ALT level)
  ```

---

## 🏷️ Quick Reference: Read Codes

| Code | Description | Use Case |
|------|-------------|----------|
| 66Y.. | Result explained to patient | Normal results communicated |
| 9N17. | Blood test repeat arranged | Follow-up booking |
| 422.. | Anaemia screen done | Low Hb investigations |
| 44I7. | Serum potassium raised | Hyperkalaemia |
| 44I5. | Serum sodium low | Hyponatraemia |
| 38DR. | QRISK2 CVD 10yr score | CVD risk recorded |
| C10F. | Type 2 diabetes mellitus | New T2DM diagnosis |
| C10.. | Hypothyroidism | Thyroid diagnosis |
| 4K15. | PSA raised | Elevated PSA result |
| 44G5. | Serum ALT level | Liver function |

---

## 📞 Support

For clinical queries about this protocol: Contact your local clinical governance team

For EMIS technical support: Contact EMIS Health support

---

*PathLinks Clinical Decision Support - Version 3.1*
*Last updated: February 2026*
