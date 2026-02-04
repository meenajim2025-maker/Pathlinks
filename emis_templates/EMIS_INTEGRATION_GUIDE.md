# EMIS Web Integration Guide: PathLinks

This guide outlines how to translate the PathLinks protocols into EMIS Web Logic (Protocols and Templates).

## 1. Creating an EMIS Protocol
The most powerful way to use this is via an EMIS Protocol that triggers when a result is received.

| Component | Setting | PathLinks Equivalent |
|-----------|---------|----------------------|
| **Trigger** | On filing result | Logic triggers when clinician clicks 'File' |
| **Input** | Result Value | Map to the Lab Test Code (e.g. Hb) |
| **Logic** | Condition (Range check) | Use the ranges in `blood_tests_protocol.json` |
| **Action** | Display Alert / Prompt | Show the 'Guidance' text from the card |

### Example XML Logic Snippet
If you are using the EMIS Protocol designer (Advanced), this logic maps to:
```xml
<Rule Name="Hb Analysis">
  <Condition>Result.Value < 130 AND Patient.Sex == 'M'</Condition>
  <Action Type="DisplayPrompt">
    Text: "Low Hb detected. Check Ferritin and consider FIT test if age >60."
    Style: "Clinical Alert"
  </Action>
</Rule>
```

## 2. Using EMIS Templates
For a younger clinician "actioning" a batch of results, you can create an EMIS Template named **"Blood Result Action Plan"**.

### Recommended Template Fields:
1. **Result Summary:** Free text or calculated field.
2. **PathLinks Guidance:** A read-only text box with the guidance from this tool.
3. **Action Taken Code:**
   - `66Y..` Result explained to patient
   - `9N17.` Blood result repeat needed
   - `422..` Anaemia screen done
4. **Follow-up:** Checkbox for "Repeat in 2 weeks", "Refer to 2WW", "Discuss with supervisor".

## 3. QRISK Coding
For Cholesterol results:
- **Code:** `38DR.` QRISK2 cardiovascular disease 10 year risk score
- **Logic:** If Cholesterol/HDL ratio > 6, prompt for QRISK assessment.

## 4. TSH / LFT Coding
- **TSH High / T4 Low:** Code `C10..` (Hypothyroidism). Prompt to start Levothyroxine at 25-50mcg.
- **ALT High:** Code `662..` (Liver function test abnormal). Prompt to check Alcohol, BMI (MASLD), and Viral Hep Screen.
