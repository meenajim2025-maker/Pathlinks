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

    if (guidanceKey && test.guidance[guidanceKey]) {
        test.guidance[guidanceKey].actions.forEach(action => {
            html += `<div class="action-item">${action}</div>`;
        });
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
            <div class="export-card" style="padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h3>📦 EMIS Protocol (.xml) File</h3>
                <p>Download this XML file and use the <strong>Import</strong> button in EMIS <strong>Resource Publisher</strong>. (Restart EMIS first to clear the crash cache).</p>
                <button class="primary-btn" style="width: auto; margin-top: 10px;" id="download-xml">Download Protocol (.xml)</button>
            </div>
            <div class="export-card" style="padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h3>📝 Clinical Coding Template</h3>
                <p>Suggested structure for your EMIS Template to ensure younger doctors follow the checklist.</p>
                <pre style="background: #f4f4f4; padding: 10px; font-size: 11px; margin-top: 10px;">
&lt;Template Name="PathLinks Blood Actioning"&gt;
  [Field] Result Value
  [Field] Action Taken: e.g. 66Y.. (Result explained)
  [Field] PathLinks Checklist Followed? (Yes/No)
  [Field] Follow up required?
&lt;/Template&gt;
                </pre>
            </div>
        </div>
    `;

    document.getElementById('download-xml')?.addEventListener('click', async () => {
        try {
            const response = await fetch('./emis_templates/PathLinks_V23.xml');
            const text = await response.text();
            const blob = new Blob([text], { type: 'application/xml' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'PathLinks_V23.xml';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            console.error("Download failed:", e);
            window.open('./emis_templates/PathLinks_V23.xml', '_blank');
        }
    });
}

init();
