let testData = [];

// Load data and initialize selects
async function init() {
    try {
        const response = await fetch('./data/blood_tests_protocol.json');
        testData = await response.json();

        const categorySelect = document.getElementById('select-test');
        testData.forEach((cat, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = cat.category;
            categorySelect.appendChild(opt);
        });

        categorySelect.addEventListener('change', updateParameters);
        document.getElementById('analyse-btn').addEventListener('click', analyseResult);
        document.getElementById('calculate-qrisk-btn').addEventListener('click', calculateQRISK);
        document.getElementById('simulate-emis-import-btn')?.addEventListener('click', simulateEmisImport);

        // Navigation logic
        const navItems = document.querySelectorAll('.nav-item');
        const views = document.querySelectorAll('.view');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');

                const viewId = item.id.replace('nav-', '') + '-view';
                views.forEach(v => {
                    if (v.id === viewId) v.classList.remove('hidden');
                    else v.classList.add('hidden');
                });

                if (item.id === 'nav-protocols') renderProtocols();
                if (item.id === 'nav-emis-coding') renderEmisIntegrations();
            });
        });

        // Search logic
        document.getElementById('test-search').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            if (term.length > 1) {
                testData.forEach((cat, cIdx) => {
                    cat.tests.forEach((t, tIdx) => {
                        if (t.name.toLowerCase().includes(term)) {
                            document.getElementById('select-test').value = cIdx;
                            updateParameters();
                            document.getElementById('select-param').value = tIdx;
                        }
                    });
                });
            }
        });

    } catch (e) {
        console.error("Error loading test data:", e);
    }
}

function updateParameters() {
    const catIdx = document.getElementById('select-test').value;
    const paramSelect = document.getElementById('select-param');
    paramSelect.innerHTML = '<option value="">-- Choose Parameter --</option>';

    if (catIdx !== "") {
        paramSelect.disabled = false;
        testData[catIdx].tests.forEach((test, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = test.name;
            paramSelect.appendChild(opt);
        });

        // Show QRISK if Lipids category selected
        if (testData[catIdx].category === "Lipids & Cardiac") {
            document.getElementById('qrisk-section').classList.remove('hidden');
        } else {
            document.getElementById('qrisk-section').classList.add('hidden');
        }
    } else {
        paramSelect.disabled = true;
        document.getElementById('qrisk-section').classList.add('hidden');
    }
}

function calculateQRISK() {
    const age = parseInt(document.getElementById('age').value);
    const sex = document.querySelector('input[name="sex"]:checked').value;
    const smoking = parseInt(document.getElementById('smoking-status').value);
    const sbp = parseInt(document.getElementById('systolic-bp').value);
    const bmi = parseFloat(document.getElementById('bmi').value);

    // Checkboxes
    const diabetes = document.getElementById('diabetes').checked;
    const fh = document.getElementById('fh-cvd').checked;
    const ckd = document.getElementById('ckd').checked;
    const af = document.getElementById('af').checked;
    const bpMeds = document.getElementById('bp-meds').checked;
    const ra = document.getElementById('ra').checked;

    // Simplified Heuristic for QRISK3 (Educational Simulation)
    let risk = (age - 30) * 0.4;
    if (sex === 'male') risk += 2.5;
    if (smoking > 0) risk += smoking * 2.1;
    if (sbp > 140) risk += (sbp - 140) * 0.3;
    if (bmi > 30) risk += (bmi - 30) * 0.5;
    if (diabetes) risk += 5.2;
    if (fh) risk += 3.5;
    if (ckd) risk += 4.1;
    if (af) risk += 2.8;
    if (bpMeds) risk += 1.5;
    if (ra) risk += 1.2;

    const finalRisk = Math.min(Math.max(risk, 0.5), 99.9).toFixed(1);

    const resultBox = document.getElementById('qrisk-result');
    const scoreVal = document.getElementById('qrisk-score');
    const actionText = document.getElementById('qrisk-action');

    resultBox.classList.remove('hidden');
    scoreVal.textContent = finalRisk + "%";

    if (parseFloat(finalRisk) >= 10.0) {
        scoreVal.style.color = "var(--accent)";
        actionText.innerHTML = "<strong>Primary Prevention Indicated.</strong> Offer Atorvastatin 20mg if not contraindicated. Review lifestyle and BP.";
    } else {
        scoreVal.style.color = "var(--success)";
        actionText.innerHTML = "Low CVD Risk (Below 10% threshold). Focus on lifestyle and primary prevention advice.";
    }
}

function simulateEmisImport() {
    // Mocking an EMIS API call that fetches patient properties
    console.log("Mocking EMIS Data Fetch...");

    // Animate button
    const btn = document.getElementById('simulate-emis-import-btn');
    const originalText = btn.textContent;
    btn.textContent = "Connecting to EMIS Web...";

    setTimeout(() => {
        // Mock data from EMIS for a fictional patient
        document.getElementById('smoking-status').value = "3"; // Moderate Smoker
        document.getElementById('systolic-bp').value = "155";
        document.getElementById('bmi').value = "31.4";
        document.getElementById('diabetes').checked = true;
        document.getElementById('bp-meds').checked = true;

        btn.textContent = "✅ Data Imported from EMIS";
        btn.style.background = "var(--success)";

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = "#607d8b";
        }, 2000);
    }, 800);
}

function analyseResult() {
    const catIdx = document.getElementById('select-test').value;
    const paramIdx = document.getElementById('select-param').value;
    const value = parseFloat(document.getElementById('test-value').value);
    const sex = document.querySelector('input[name="sex"]:checked').value;
    const age = parseInt(document.getElementById('age').value);
    const output = document.getElementById('guidance-output');

    if (isNaN(value)) {
        output.innerHTML = '<div class="placeholder-text"><p>Please enter a numerical result value.</p></div>';
        return;
    }

    const test = testData[catIdx].tests[paramIdx];
    let range;

    // Check if test has age-specific ranges (like PSA)
    if (test.name === "PSA") {
        if (age < 50) range = test.ranges.age_40_49;
        else if (age < 60) range = test.ranges.age_50_59;
        else if (age < 70) range = test.ranges.age_60_69;
        else range = test.ranges.age_70_79;
    } else {
        range = test.ranges[sex] || test.ranges.all;
    }

    let status = "normal";
    let guidanceKey = null;

    if (value < range.min) {
        status = "abnormal";
        guidanceKey = "low";
    } else if (value > range.max) {
        status = (value > range.max * 1.5) ? "pathological" : "abnormal";
        guidanceKey = "high";
    }

    let html = `
        <div class="guidance-result">
            <div class="status-box ${status}">
                <span>${status.toUpperCase()}: ${test.name} = ${value} ${test.unit}</span>
                <span class="range-info">(Ref: ${range.min || 0} - ${range.max})</span>
            </div>
            <h3>Clinical Guidance</h3>
            <div class="action-list">
    `;

    if (guidanceKey && test.guidance && test.guidance[guidanceKey]) {
        test.guidance[guidanceKey].actions.forEach(action => {
            html += `<div class="action-item">${action}</div>`;
        });
    } else if (status !== 'normal') {
        html += `<div class="action-item" style="border-left-color: var(--warning)">Abnormal result detected. Review clinical context and consider further investigation. No specific protocol guidance available for this test.</div>`;
    } else {
        html += `<div class="action-item" style="border-left-color: var(--success)">Result within local reference range. Action based on clinical context.</div>`;
    }

    // specific coding help
    html += `
            </div>
            <div class="emis-coding-box" style="margin-top: 20px; padding: 15px; background: #fdfdfd; border: 1px dashed #ccc; border-radius: 8px;">
                <h4 style="font-size: 13px; color: var(--text-muted); margin-bottom: 10px;">PROPOSED EMIS CODES</h4>
                <div style="font-family: monospace; font-size: 12px; background: #eee; padding: 10px; border-radius: 4px;">
                    Read Code: ${test.name === 'Hb' ? '422..' : '66Y..'} <br>
                    Status: ${status === 'normal' ? 'Normal result' : 'Abnormal result'} <br>
                    Clinician: Actioned via PathLinks Protocol
                </div>
            </div>
        </div>
    `;

    output.innerHTML = html;
}

function renderProtocols() {
    const container = document.getElementById('protocol-list-container');
    container.innerHTML = "";
    testData.forEach(cat => {
        cat.tests.forEach(test => {
            const div = document.createElement('div');
            div.className = "protocol-item";
            div.innerHTML = `
                <div>
                    <span class="cat-label">${cat.category}</span>
                    <strong style="margin-left: 10px;">${test.name}</strong>
                </div>
                <button class="primary-btn" style="width: auto; padding: 8px 16px; font-size: 12px;" onclick="viewFullProtocol('${test.name}')">View Guidance</button>
            `;
            container.appendChild(div);
        });
    });
}

function renderEmisIntegrations() {
    const exportDiv = document.getElementById('emis-code-export');
    exportDiv.innerHTML = `
        <div class="export-container" style="display: flex; flex-direction: column; gap: 20px;">
            
            <!-- Important Notice -->
            <div class="export-card" style="padding: 20px; border: 2px solid #ff9800; border-radius: 12px; background: linear-gradient(135deg, #fff8e1 0%, #ffe0b2 100%);">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <span style="font-size: 28px;">⚠️</span>
                    <div>
                        <h3 style="margin: 0 0 8px 0; color: #e65100;">Important: About EMIS Integration</h3>
                        <p style="margin: 0; font-size: 13px; line-height: 1.6;">
                            EMIS Web uses a <strong>proprietary .ewdt format</strong> that can only be created within EMIS Web itself. 
                            External XML files cannot be imported as working protocols.
                        </p>
                        <p style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.6;">
                            Instead, use the <strong>Protocol Setup Guide</strong> below to create these protocols manually in EMIS Web's Resource Publisher.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Setup Guide Download -->
            <div class="export-card" style="padding: 24px; border: 2px solid #4CAF50; border-radius: 12px; background: linear-gradient(135deg, #f8fff8 0%, #e8f5e9 100%);">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <span style="font-size: 32px;">📋</span>
                    <div>
                        <h3 style="margin: 0; color: #2e7d32;">EMIS Protocol Setup Guide</h3>
                        <span style="font-size: 12px; color: #666;">Step-by-step instructions for EMIS Web</span>
                    </div>
                </div>
                <p style="margin-bottom: 16px;">Complete guide for creating PathLinks protocols in EMIS Web Resource Publisher:</p>
                <ul style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; margin-bottom: 16px; padding-left: 20px;">
                    <li>🚨 Hyperkalaemia Alert</li>
                    <li>🧪 Hyponatraemia Alert</li>
                    <li>🩸 Anaemia Investigation</li>
                    <li>🦋 Hypothyroidism Alert</li>
                    <li>📊 New T2DM Diagnosis</li>
                    <li>💊 Lipid/QRISK Reminder</li>
                    <li>🩺 PSA Review Protocol</li>
                    <li>🔬 ALT/MASLD Pathway</li>
                </ul>
                <button class="primary-btn" style="width: auto; padding: 12px 24px; font-size: 14px; background: linear-gradient(135deg, #4CAF50, #2e7d32);" id="download-setup-guide">
                    📥 Download Setup Guide (.md)
                </button>
            </div>

            <!-- Printable Protocol Card -->
            <div class="export-card" style="padding: 20px; border: 1px solid #2196F3; border-radius: 8px; background: #e3f2fd;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <span style="font-size: 24px;">🖨️</span>
                    <h3 style="margin: 0; color: #1565c0;">Printable Quick Reference Card</h3>
                </div>
                <p style="font-size: 13px;">Print-friendly summary of all blood result action thresholds for desk reference.</p>
                <button class="secondary-btn" style="width: auto; margin-top: 10px;" id="print-protocol">🖨️ Print Quick Reference</button>
            </div>

            <!-- How to Create Protocols -->
            <div class="export-card" style="padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h3>🔧 Creating Protocols in EMIS Web</h3>
                <ol style="font-size: 13px; line-height: 1.8; padding-left: 20px;">
                    <li><strong>EMIS Button</strong> → Configuration → Resource Publisher</li>
                    <li>Click <strong>Protocols</strong> tab</li>
                    <li>Right-click folder → <strong>Add Protocol</strong></li>
                    <li>Set <strong>System Trigger</strong> = "On Filing Result"</li>
                    <li>Add trigger criteria (e.g., Test = "Potassium", Value ≥ 6.0)</li>
                    <li>Add <strong>Action Node</strong> → Display Prompt with clinical guidance</li>
                    <li>Save and test with a dummy patient record</li>
                </ol>
            </div>

            <!-- Read Code Reference -->
            <div class="export-card" style="padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h3>🏷️ Read Codes for Blood Result Actioning</h3>
                <p style="font-size: 12px; color: #666; margin-bottom: 12px;">Copy these codes when setting up EMIS protocols or templates</p>
                <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f5f5f5;">
                            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Code</th>
                            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Description</th>
                            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Use Case</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="background: #fff;"><td style="padding: 8px; font-family: monospace; font-weight: bold;">66Y..</td><td>Result explained to patient</td><td>Normal results communicated</td></tr>
                        <tr style="background: #f9f9f9;"><td style="padding: 8px; font-family: monospace; font-weight: bold;">9N17.</td><td>Blood test repeat arranged</td><td>Follow-up booking</td></tr>
                        <tr style="background: #fff;"><td style="padding: 8px; font-family: monospace; font-weight: bold;">422..</td><td>Anaemia screen done</td><td>Low Hb investigations</td></tr>
                        <tr style="background: #f9f9f9;"><td style="padding: 8px; font-family: monospace; font-weight: bold;">44I7.</td><td>Serum potassium raised</td><td>Hyperkalaemia alert</td></tr>
                        <tr style="background: #fff;"><td style="padding: 8px; font-family: monospace; font-weight: bold;">44I5.</td><td>Serum sodium low</td><td>Hyponatraemia</td></tr>
                        <tr style="background: #f9f9f9;"><td style="padding: 8px; font-family: monospace; font-weight: bold;">38DR.</td><td>QRISK2 CVD 10yr score</td><td>CVD risk assessment</td></tr>
                        <tr style="background: #fff;"><td style="padding: 8px; font-family: monospace; font-weight: bold;">C10F.</td><td>Type 2 diabetes mellitus</td><td>New T2DM diagnosis</td></tr>
                        <tr style="background: #f9f9f9;"><td style="padding: 8px; font-family: monospace; font-weight: bold;">C10..</td><td>Hypothyroidism</td><td>Thyroid diagnosis</td></tr>
                        <tr style="background: #fff;"><td style="padding: 8px; font-family: monospace; font-weight: bold;">4K15.</td><td>PSA raised</td><td>Elevated PSA result</td></tr>
                        <tr style="background: #f9f9f9;"><td style="padding: 8px; font-family: monospace; font-weight: bold;">44G5.</td><td>Serum ALT level</td><td>Liver function</td></tr>
                    </tbody>
                </table>
                <button class="secondary-btn" style="width: auto; margin-top: 12px;" id="copy-codes">📋 Copy All Codes</button>
            </div>

            <!-- Use PathLinks Web App -->
            <div class="export-card" style="padding: 20px; border: 2px solid #9c27b0; border-radius: 8px; background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <span style="font-size: 24px;">💡</span>
                    <h3 style="margin: 0; color: #7b1fa2;">Alternative: Use PathLinks Web App</h3>
                </div>
                <p style="font-size: 13px; line-height: 1.6;">
                    While EMIS protocols require manual setup, you can use <strong>this PathLinks web app</strong> as a 
                    real-time clinical decision support tool. Simply enter any blood result in the Dashboard to get 
                    instant guidance and suggested actions.
                </p>
                <p style="font-size: 12px; color: #666; margin-top: 8px;">
                    Tip: Bookmark this app on practice computers for quick access during consultations.
                </p>
            </div>
        </div>
    `;

    // Setup Guide Download Handler
    document.getElementById('download-setup-guide')?.addEventListener('click', async () => {
        try {
            const response = await fetch('./docs/EMIS_PROTOCOL_SETUP_GUIDE.md');
            if (!response.ok) throw new Error('File not found');
            const text = await response.text();
            const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'PathLinks_EMIS_Setup_Guide.md';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Visual feedback
            const btn = document.getElementById('download-setup-guide');
            btn.textContent = '✅ Downloaded!';
            btn.style.background = '#4CAF50';
            setTimeout(() => {
                btn.innerHTML = '📥 Download Setup Guide (.md)';
                btn.style.background = 'linear-gradient(135deg, #4CAF50, #2e7d32)';
            }, 2000);
        } catch (e) {
            console.error("Download failed:", e);
            alert('Download failed. Please check console for errors.');
        }
    });

    // Print Quick Reference
    document.getElementById('print-protocol')?.addEventListener('click', () => {
        const printContent = `
            <html>
            <head>
                <title>PathLinks Blood Result Quick Reference</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #1a237e; border-bottom: 2px solid #1a237e; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #333; padding: 8px; text-align: left; }
                    th { background: #e3f2fd; }
                    .alert { background: #ffebee; }
                    .warning { background: #fff3e0; }
                    h2 { margin-top: 30px; color: #0d47a1; }
                    .code { font-family: monospace; background: #f5f5f5; padding: 2px 6px; }
                </style>
            </head>
            <body>
                <h1>🩸 PathLinks Blood Result Actioning Quick Reference</h1>
                <p><em>Version 3.1 - February 2026</em></p>
                
                <h2>🚨 CRITICAL ALERTS (Immediate Action)</h2>
                <table>
                    <tr><th>Test</th><th>Critical Value</th><th>Action</th><th>Read Code</th></tr>
                    <tr class="alert"><td>Potassium</td><td>≥ 6.0 mmol/L</td><td>ECG immediately. If ≥6.5: Hospital admission</td><td class="code">44I7.</td></tr>
                    <tr class="alert"><td>Sodium</td><td>&lt; 125 mmol/L</td><td>Assess urgently. Risk of seizures</td><td class="code">44I5.</td></tr>
                </table>
                
                <h2>📊 Common Abnormalities</h2>
                <table>
                    <tr><th>Test</th><th>Threshold</th><th>Action</th><th>Read Code</th></tr>
                    <tr><td>Hb (F)</td><td>&lt; 115 g/L</td><td>Check Ferritin, B12, Folate. FIT if &gt;60</td><td class="code">422..</td></tr>
                    <tr><td>Hb (M)</td><td>&lt; 130 g/L</td><td>Check Ferritin, B12, Folate. FIT if &gt;60</td><td class="code">422..</td></tr>
                    <tr><td>TSH</td><td>&gt; 10 mU/L</td><td>Start Levothyroxine 25-50mcg</td><td class="code">C10..</td></tr>
                    <tr><td>HbA1c</td><td>≥ 48 mmol/mol</td><td>T2DM diagnosis. Start Metformin</td><td class="code">C10F.</td></tr>
                    <tr><td>Total Chol</td><td>&gt; 5.0 mmol/L</td><td>Calculate QRISK3. If ≥10%: Statin</td><td class="code">38DR.</td></tr>
                    <tr><td>ALT</td><td>&gt; ULN</td><td>Consider MASLD pathway, FIB-4</td><td class="code">44G5.</td></tr>
                </table>
                
                <h2>🩺 PSA Age-Specific Thresholds</h2>
                <table>
                    <tr><th>Age</th><th>Threshold</th><th>Action if Elevated</th></tr>
                    <tr><td>40-49</td><td>&gt; 2.5 ng/mL</td><td rowspan="4">Repeat in 6-8 weeks. If persistent: 2WW Urology</td></tr>
                    <tr><td>50-59</td><td>&gt; 3.5 ng/mL</td></tr>
                    <tr><td>60-69</td><td>&gt; 4.5 ng/mL</td></tr>
                    <tr><td>70-79</td><td>&gt; 6.5 ng/mL</td></tr>
                </table>
                
                <p style="margin-top: 40px; font-size: 11px; color: #666;">PathLinks Clinical Decision Support | For clinical queries contact your governance team</p>
            </body>
            </html>
        `;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    });

    // Copy Codes Handler
    document.getElementById('copy-codes')?.addEventListener('click', () => {
        const codes = `Read Codes for Blood Result Actioning:
66Y.. - Result explained to patient
9N17. - Blood test repeat arranged
422.. - Anaemia screen done
44I7. - Serum potassium raised
44I5. - Serum sodium low
38DR. - QRISK2 CVD 10yr score
C10F. - Type 2 diabetes mellitus
C10.. - Hypothyroidism
4K15. - PSA raised
44G5. - Serum ALT level`;
        navigator.clipboard.writeText(codes).then(() => {
            const btn = document.getElementById('copy-codes');
            btn.textContent = '✅ Copied!';
            setTimeout(() => {
                btn.innerHTML = '📋 Copy All Codes';
            }, 2000);
        });
    });
}

init();
