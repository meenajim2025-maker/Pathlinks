let testData = [];
let learningData = null;
let decisionToolsData = null;

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
        document.getElementById('device-auth-generate-btn')?.addEventListener('click', showNewDeviceAuthCode);
        document.getElementById('device-auth-copy-url-btn')?.addEventListener('click', function () {
            var urlEl = document.getElementById('device-auth-url');
            var btn = this;
            if (urlEl && urlEl.href && urlEl.href !== '#') {
                navigator.clipboard.writeText(urlEl.href).then(function () { btn.textContent = 'Copied!'; setTimeout(function () { btn.textContent = 'Copy link'; }, 2000); }).catch(function () { });
            }
        });

        // Initialize Calculators
        initQRISK();
        initNEWS2();
        initWells();
        initCURB();

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

                if (item.id === 'nav-decision-tools') renderDecisionTools();
                if (item.id === 'nav-calculators') {
                    initQRISK();
                    initNEWS2();
                    initWells();
                    initCURB();
                    initCHA2DS2();
                    initGFR();
                }
            });
        });

        initTheme();

        // Search logic
        document.getElementById('test-search').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();

            // Special cases for calculators
            const calcTerms = ['qrisk', 'news', 'sepsis', 'wells', 'curb', 'dvt', 'pneumonia', 'stroke', 'af', 'gfr', 'renal'];
            if (calcTerms.some(kw => term.includes(kw))) {
                // If specific calculator keyword found, highlight the calculators tab
                document.getElementById('nav-calculators').style.boxShadow = '0 0 10px rgba(52, 152, 219, 0.5)';
                setTimeout(() => {
                    document.getElementById('nav-calculators').style.boxShadow = 'none';
                }, 2000);
            }

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
        document.getElementById('select-test').innerHTML = '<option value="">Failed to load protocols</option>';
        const out = document.getElementById('guidance-output');
        if (out) out.innerHTML = '<div class="placeholder-text"><p>Could not load blood test data. Check the console or try refreshing.</p></div>';
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

function initQRISK() {
    const btn = document.getElementById('calculate-qrisk-btn-calc');
    if (btn) btn.onclick = calculateQRISK;

    const importBtn = document.getElementById('simulate-emis-import-btn-calc');
    if (importBtn) importBtn.onclick = simulateEmisImport;
}

function calculateQRISK() {
    // Determine context (Standalone view or dashboard)
    const isStandalone = !!document.getElementById('smoking-status-calc');
    const suffix = isStandalone ? '-calc' : '';

    const ageVal = document.getElementById('age' + suffix) ? document.getElementById('age' + suffix).value : (document.getElementById('age') ? document.getElementById('age').value : '50');
    const age = parseInt(ageVal);
    const smoking = parseInt(document.getElementById('smoking-status' + suffix).value);
    const sbp = parseInt(document.getElementById('systolic-bp' + suffix).value);
    const bmi = parseFloat(document.getElementById('bmi' + suffix).value);
    const cholRatio = parseFloat(document.getElementById('chol-ratio' + suffix)?.value || '3.5');
    const ethnicity = parseInt(document.getElementById('ethnicity' + suffix).value);
    const diabetesType = parseInt(document.getElementById('diabetes-type' + suffix)?.value || '0');
    const townsend = parseInt(document.getElementById('townsend' + suffix)?.value || '5');

    // Checkboxes
    const fh = document.getElementById('fh-cvd' + suffix).checked;
    const ckd = document.getElementById('ckd' + suffix).checked;
    const af = document.getElementById('af' + suffix).checked;
    const bpMeds = document.getElementById('bp-meds' + suffix).checked;
    const ra = document.getElementById('ra' + suffix).checked;
    const sle = document.getElementById('sle' + suffix)?.checked || false;
    const smi = document.getElementById('smi' + suffix)?.checked || false;
    const antipsychotic = document.getElementById('antipsychotic' + suffix)?.checked || false;
    const migraine = document.getElementById('migraine' + suffix)?.checked || false;
    const ed = document.getElementById('ed' + suffix)?.checked || false;

    // Sex check
    const sex = document.querySelector(`input[name="sex${suffix}"]:checked`)?.value || 'female';

    // Heuristic QRISK3 Simulation (Improved clinical weighting)
    // 1. Base Age Risk (Exponential increase with age)
    let risk = 0.05 * Math.pow(1.11, age - 25);

    // 2. Sex & Ethnicity Adjustments
    if (sex === 'male') risk *= 1.4;
    if ([2, 3, 4, 5].includes(ethnicity)) risk *= 1.3; // South Asian adjustment

    // 3. Biometric Weighted Additions
    if (smoking > 0) risk += smoking * 2.5;
    if (sbp > 120) risk += (sbp - 120) * 0.15;
    if (bmi > 25) risk += (bmi - 25) * 0.4;
    if (cholRatio > 3) risk += (cholRatio - 3) * 2.0;

    // 4. Deprivation (Townsend Score)
    risk += (townsend - 1) * 0.6;

    // 5. Clinical Condition Adders
    if (diabetesType === 1) risk += 10.5;
    if (diabetesType === 2) risk += 7.2;
    if (fh) risk += 4.5;
    if (ckd) risk += 5.2;
    if (af) risk += 3.8;
    if (bpMeds) risk += 2.0;
    if (ra) risk += 2.2;
    if (sle) risk += 2.8;
    if (smi) risk += 3.5;
    if (antipsychotic) risk += 2.5;
    if (migraine) risk += 1.8;
    if (ed && sex === 'male') risk += 3.2;

    const finalRisk = Math.min(Math.max(risk, 0.1), 99.9).toFixed(1);

    const resultBox = document.getElementById('qrisk-result' + suffix);
    const scoreVal = document.getElementById('qrisk-score' + suffix);
    const actionText = document.getElementById('qrisk-action' + suffix);

    resultBox.classList.remove('hidden');
    scoreVal.textContent = finalRisk + "%";

    if (parseFloat(finalRisk) >= 10.0) {
        scoreVal.style.color = "#e74c3c"; // var(--accent)
        actionText.innerHTML = `<strong>High CVD Risk (≥10%):</strong> Primary prevention indicated.<br>• Offer <strong>Atorvastatin 20mg</strong> nightly.<br>• Target non-HDL reduction >40%.<br>• Optimize BP and lifestyle.`;
    } else {
        scoreVal.style.color = "#27ae60"; // var(--success)
        actionText.innerHTML = "<strong>Low CVD Risk (<10%):</strong> Statin not routinely indicated for primary prevention. Focus on lifestyle optimization.";
    }
}

function simulateEmisImport(e) {
    const btn = e.target;
    const suffix = btn.id.includes('-calc') ? '-calc' : '';

    const originalText = btn.textContent;
    btn.textContent = "⌛ Pulling Clinical Data...";
    btn.disabled = true;

    setTimeout(() => {
        // Mock data from EMIS record
        document.getElementById('age' + suffix).value = "64";
        document.getElementById('smoking-status' + suffix).value = "3";
        document.getElementById('systolic-bp' + suffix).value = "158";
        document.getElementById('bmi' + suffix).value = "29.4";
        if (document.getElementById('chol-ratio' + suffix)) {
            document.getElementById('chol-ratio' + suffix).value = "5.2";
        }
        if (document.getElementById('diabetes-type' + suffix)) {
            document.getElementById('diabetes-type' + suffix).value = "2";
        }
        if (document.getElementById('townsend' + suffix)) {
            document.getElementById('townsend' + suffix).value = "7";
        }

        document.getElementById('bp-meds' + suffix).checked = true;

        if (document.getElementById('ed' + suffix)) {
            document.getElementById('ed' + suffix).checked = true;
        }

        btn.textContent = "✅ Data Synced";
        btn.style.background = "#27ae60";
        btn.disabled = false;

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = "";
        }, 2000);
    }, 1200);
}


function analyseResult() {
    const catIdx = document.getElementById('select-test').value;
    const paramIdx = document.getElementById('select-param').value;
    const value = parseFloat(document.getElementById('test-value').value);
    const sex = document.querySelector('input[name="sex"]:checked').value;
    const age = parseInt(document.getElementById('age').value);
    const output = document.getElementById('guidance-output');

    if (catIdx === '' || paramIdx === '') {
        output.innerHTML = '<div class="placeholder-text"><p>Select a test category and parameter first.</p></div>';
        return;
    }
    const test = testData[catIdx].tests[paramIdx];
    const categoryName = testData[catIdx].category;
    const isNumericalTest = !['Grade', 'Status', 'Titre'].includes(test.unit);

    if (isNaN(value) && isNumericalTest) {
        output.innerHTML = '<div class="placeholder-text"><p>Please enter a numerical result value for this test.</p></div>';
        return;
    }

    let range;
    const findAgeRange = (ranges, currentAge) => {
        for (const key in ranges) {
            if (key.startsWith('age_')) {
                const parts = key.split('_');
                const minA = parseInt(parts[1], 10);
                const maxA = parseInt(parts[2], 10);
                if (currentAge >= minA && currentAge <= maxA) return ranges[key];
            }
        }
        return null;
    };

    range = findAgeRange(test.ranges, age);
    if (!range) {
        range = test.ranges[sex] || test.ranges.all;
    }

    let status = "normal";
    let guidanceKey = "normal";
    let displayValue = value;

    if (isNumericalTest) {
        const hasMin = range.min !== undefined && range.min !== null;
        const hasMax = range.max !== undefined && range.max !== null;

        if (hasMin && value < range.min) {
            status = "abnormal";
            guidanceKey = "low";
        } else if (hasMax && value > range.max) {
            status = (value > range.max * 1.5) ? "pathological" : "abnormal";
            guidanceKey = "high";
        }
    } else {
        // Non-numerical logic (Smears, Viral Status, titires)
        const valStr = String(document.getElementById('test-value').value).toLowerCase().trim();
        displayValue = document.getElementById('test-value').value; // Keep original for display

        const abnormalTerms = ['positive', 'abnormal', 'reactive', 'mild', 'moderate', 'severe', 'borderline', 'detected'];
        const normalTerms = ['negative', 'normal', 'non-reactive', 'not detected'];

        if (abnormalTerms.some(term => valStr.includes(term))) {
            status = "pathological";
            guidanceKey = "high";
        } else if (normalTerms.some(term => valStr.includes(term))) {
            status = "normal";
            guidanceKey = "normal";
        } else {
            // Default to abnormal if unrecognized text is entered in a status field
            status = "abnormal";
            guidanceKey = "high";
        }
    }

    const hasMin = range && range.min !== undefined && range.min !== null;
    const hasMax = range && range.max !== undefined && range.max !== null;

    let html = `
        <div class="guidance-result">
            <div class="status-box ${status}">
                <span>${status.toUpperCase()}: ${test.name} = ${displayValue} ${test.unit || ''}</span>
                <span class="range-info">(${isNumericalTest ? `Ref: ${hasMin ? range.min : '—'} – ${hasMax ? range.max : '—'} ${test.unit}` : 'Standard: Negative/Normal'})</span>
            </div>
            <h3 style="color: var(--primary); border-bottom: 2px solid #eee; padding-bottom: 8px;">📋 PathLinks Management Plan</h3>
            <div class="action-list">
    `;

    if (guidanceKey && test.guidance && test.guidance[guidanceKey]) {
        // NHS Pathways Triage Layer
        if (test.guidance[guidanceKey].triage) {
            html += `
                <div class="triage-box" style="margin-bottom: 24px; padding: 16px; background: #fff5f5; border: 2px solid #e53935; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h4 style="color: #c62828; margin: 0 0 12px 0; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">🚑</span> Emergency Triage Assessment
                    </h4>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
            `;
            test.guidance[guidanceKey].triage.forEach(item => {
                const isDisposition = item.startsWith('Disposition:');
                const style = isDisposition ? 'background: #ffebee; padding: 8px; border-radius: 6px; font-weight: 700; color: #b71c1c; border-left: 4px solid #c62828;' : 'color: #333; font-weight: 500; padding-left: 4px;';
                html += `<div class="triage-item" style="font-size: 12px; ${style}">${item.replace('Disposition:', '<strong>Disposition:</strong>')}</div>`;
            });
            html += `</div></div>`;
        }

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
                    Read Code: ${test.emisCode || '66Y..'} <br>
                    Status: ${status.charAt(0).toUpperCase() + status.slice(1)} result <br>
                    Clinician: Actioned via PathLinks Protocol
                </div>
            </div>
        </div>
    `;

    output.innerHTML = html;
}


async function renderDecisionTools() {
    const systemSelect = document.getElementById('decision-system');
    const toolSelect = document.getElementById('decision-tool');
    const panel = document.getElementById('decision-tool-panel');
    const titleEl = document.getElementById('decision-tool-title');
    const niceEl = document.getElementById('decision-tool-nice');
    const evidenceEl = document.getElementById('decision-tool-evidence');
    const stepsContainer = document.getElementById('decision-steps-container');
    const guidanceBox = document.getElementById('decision-guidance-box');
    const guidanceText = document.getElementById('decision-guidance-text');
    if (!systemSelect || !toolSelect || !panel) return;

    if (systemSelect.dataset.loading === 'true') return;
    if (systemSelect.dataset.initialized) return;

    if (!decisionToolsData) {
        systemSelect.dataset.loading = 'true';
        try {
            const res = await fetch('./data/decision_tools_protocol.json');
            if (!res.ok) throw new Error('Not found');
            decisionToolsData = await res.json();
            systemSelect.dataset.loading = 'false';
            systemSelect.dataset.initialized = 'true';
        } catch (e) {
            console.error("[DecisionTools] Load failed:", e);
            systemSelect.dataset.loading = 'false';
            panel.classList.add('hidden');
            stepsContainer.innerHTML = '<p class="placeholder-text">Decision tools data not found. Run <code>node scripts/build-decision-tools.js</code> to generate or check network connectivity.</p>';
            return;
        }
    } else {
        systemSelect.dataset.initialized = 'true';
    }

    const systems = decisionToolsData.systems || [];
    systemSelect.innerHTML = '<option value="">-- Choose system --</option>';
    systems.forEach((sys, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = sys.name + ' (' + (sys.tools || []).length + ')';
        systemSelect.appendChild(opt);
    });

    toolSelect.innerHTML = '<option value="">-- Choose topic --</option>';
    toolSelect.disabled = true;
    panel.classList.add('hidden');

    const filterInput = document.getElementById('decision-tool-filter');
    const countEl = document.getElementById('decision-tool-count');

    function populateTopicDropdown(sys, filterStr) {
        const tools = sys.tools || [];
        const q = (filterStr || '').trim().toLowerCase();
        const filtered = q ? tools.filter(t => (t.title || '').toLowerCase().includes(q)) : tools;
        toolSelect.innerHTML = '<option value="">-- Choose topic --</option>';
        filtered.forEach(tool => {
            const tIdx = tools.indexOf(tool);
            const opt = document.createElement('option');
            opt.value = tIdx;
            opt.textContent = tool.title;
            toolSelect.appendChild(opt);
        });
        if (countEl) countEl.textContent = filtered.length === tools.length ? tools.length + ' topics' : 'Showing ' + filtered.length + ' of ' + tools.length + ' topics';
    }

    systemSelect.onchange = function () {
        const sysIdx = this.value;
        toolSelect.disabled = sysIdx === '';
        if (sysIdx === '') {
            toolSelect.innerHTML = '<option value="">-- Choose topic --</option>';
            if (countEl) countEl.textContent = '';
            if (filterInput) filterInput.value = '';
            panel.classList.add('hidden');
            return;
        }
        const sys = systems[parseInt(sysIdx, 10)];
        const filterStr = filterInput ? filterInput.value : '';
        populateTopicDropdown(sys, filterStr);
    };

    if (filterInput) {
        filterInput.addEventListener('input', function () {
            const sysIdx = systemSelect.value;
            if (sysIdx === '') return;
            const sys = systems[parseInt(sysIdx, 10)];
            populateTopicDropdown(sys, this.value);
        });
    }

    const searchAllInput = document.getElementById('decision-search-all');
    const searchResultsEl = document.getElementById('decision-search-results');
    if (searchAllInput && searchResultsEl) {
        const maxSearchHits = 25;
        searchAllInput.addEventListener('input', function () {
            const q = (this.value || '').trim().toLowerCase();
            searchResultsEl.classList.add('hidden');
            searchResultsEl.innerHTML = '';
            if (q.length < 2) return;
            const hits = [];
            systems.forEach((sys, sysIdx) => {
                (sys.tools || []).forEach((tool, toolIdx) => {
                    const title = (tool.title || '').toLowerCase();
                    const sysName = (sys.name || '').toLowerCase();
                    if (title.includes(q) || sysName.includes(q)) hits.push({ sysIdx, toolIdx, sysName: sys.name, title: tool.title, tool });
                });
            });

            // Task 3: Prioritize Specific Pathways over Generic Pathways
            hits.sort((a, b) => {
                const aIsGeneric = a.tool.steps && a.tool.steps[0] && a.tool.steps[0].id === 'guidance';
                const bIsGeneric = b.tool.steps && b.tool.steps[0] && b.tool.steps[0].id === 'guidance';
                if (aIsGeneric && !bIsGeneric) return 1;
                if (!aIsGeneric && bIsGeneric) return -1;
                return (a.title || '').localeCompare(b.title || '', 'en', { sensitivity: 'base' });
            });

            const show = hits.slice(0, maxSearchHits);
            show.forEach(({ sysIdx, toolIdx, sysName, title }) => {
                const div = document.createElement('div');
                div.className = 'search-hit';
                div.setAttribute('role', 'option');

                // Visual indicator for specific pathway in search hits
                const toolHit = hits.find(h => h.title === title && h.sysName === sysName).tool;
                const isGeneric = toolHit.steps && toolHit.steps[0] && toolHit.steps[0].id === 'guidance';
                const badge = isGeneric ? '<span style="color: #f39c12; font-size: 10px;">[Generic]</span>' : '<span style="color: #27ae60; font-size: 10px;">[Specific]</span>';

                div.innerHTML = badge + ' <span>' + escapeHtml(title) + '</span> <span class="system-name">(' + escapeHtml(sysName) + ')</span>';
                div.addEventListener('mousedown', function (e) {
                    e.preventDefault(); // Prevent input blur from hiding results before click processed
                    console.log(`[Search] Selected: ${title} (sysIdx: ${sysIdx}, toolIdx: ${toolIdx})`);
                    if (filterInput) filterInput.value = '';
                    searchAllInput.value = '';
                    searchResultsEl.classList.add('hidden');
                    searchResultsEl.innerHTML = '';

                    // Step 1: Sync System Dropdown
                    systemSelect.value = String(sysIdx);
                    toolSelect.disabled = false;

                    // Step 2: Populate Tool Dropdown for this system
                    populateTopicDropdown(systems[sysIdx], '');

                    // Step 3: Explicitly set the value and ensure it's selected in the DOM
                    toolSelect.value = String(toolIdx);

                    // Step 4: Verification & Rendering
                    const sys = systems[sysIdx];
                    const tool = (sys.tools || [])[parseInt(toolIdx, 10)];

                    if (tool) {
                        console.log(`[Search] Found tool: ${tool.title}. Rendering UI.`);
                        renderToolUI(tool);

                        // UX: Scroll to tool panel
                        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                        console.warn(`[Search] Tool index mismatch. Searching by title fallback...`);
                        const fallbackTool = (sys.tools || []).find(t => t.title === title);
                        if (fallbackTool) {
                            const actualIdx = sys.tools.indexOf(fallbackTool);
                            toolSelect.value = String(actualIdx);
                            renderToolUI(fallbackTool);
                            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }
                });
                searchResultsEl.appendChild(div);
            });
            if (show.length) searchResultsEl.classList.remove('hidden');
        });
        searchAllInput.addEventListener('blur', function () {
            setTimeout(() => { searchResultsEl.classList.add('hidden'); }, 150);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                searchAllInput.blur();
                searchResultsEl.classList.add('hidden');
            }
        });
    }

    toolSelect.onchange = function () {
        const sysIdx = systemSelect.value;
        const toolIdx = this.value;
        if (sysIdx === '' || toolIdx === '') {
            panel.classList.add('hidden');
            return;
        }
        const sys = systems[parseInt(sysIdx, 10)];
        const tool = (sys.tools || [])[parseInt(toolIdx, 10)];
        if (tool) renderToolUI(tool);
    };

    function renderToolUI(tool) {
        // UI elements from parent scope
        titleEl.innerHTML = escapeHtml(tool.title);

        // Safety badge
        const isGeneric = tool.steps && tool.steps[0] && tool.steps[0].id === 'guidance';
        const badgeClass = isGeneric ? 'badge-warning' : 'badge-success';
        const badgeText = isGeneric ? 'Generic Pathway' : 'Specific Pathway';
        titleEl.innerHTML += ` <span class="badge ${badgeClass}" style="font-size: 11px; vertical-align: middle; margin-left: 8px;">${badgeText}</span>`;

        niceEl.textContent = (tool.niceRefs || []).join(', ') || 'NICE CKS';
        evidenceEl.textContent = tool.evidence || 'See NICE CKS and local policy.';
        guidanceBox.classList.add('hidden');
        stepsContainer.innerHTML = '';

        (tool.steps || []).forEach((step, stepIdx) => {
            if (step.type !== 'dropdown' || !step.options || !step.options.length) return;
            const div = document.createElement('div');
            div.className = 'field-group';
            div.style.marginBottom = '1rem';
            const label = document.createElement('label');
            label.textContent = step.question;
            const select = document.createElement('select');
            select.dataset.stepIndex = stepIdx;
            select.innerHTML = '<option value="">-- Select --</option>';
            step.options.forEach((opt, oIdx) => {
                const o = document.createElement('option');
                o.value = oIdx;
                o.textContent = opt.label;
                o.dataset.guidance = (opt.guidance || '').replace(/"/g, '&quot;');
                select.appendChild(o);
            });
            select.addEventListener('change', function () {
                const chosen = this.options[this.selectedIndex];
                if (!chosen || chosen.value === '') {
                    guidanceBox.classList.add('hidden');
                    return;
                }
                const g = (chosen.dataset.guidance || '').replace(/&quot;/g, '"');
                guidanceText.textContent = g;
                guidanceBox.classList.remove('hidden');

                // Visual feedback for generic vs specific
                if (isGeneric) {
                    guidanceBox.style.borderLeft = '4px solid #f39c12';
                    guidanceBox.style.background = '#fffaf0';
                } else {
                    guidanceBox.style.borderLeft = '4px solid #3498db';
                    guidanceBox.style.background = '#f0f7ff';
                }
            });
            div.appendChild(label);
            div.appendChild(select);
            stepsContainer.appendChild(div);
        });
        panel.classList.remove('hidden');
    }
}

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}





function initNEWS2() {
    const inputs = ['news-rr', 'news-spo2', 'news-oxygen', 'news-sbp', 'news-hr', 'news-consciousness', 'news-temp'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', calculateNEWS2);
            el.addEventListener('change', calculateNEWS2);
        }
    });
}

function calculateNEWS2() {
    const rr = parseInt(document.getElementById('news-rr').value) || 0;
    const spo2 = parseInt(document.getElementById('news-spo2').value) || 0;
    const oxygen = parseInt(document.getElementById('news-oxygen').value) || 0;
    const sbp = parseInt(document.getElementById('news-sbp').value) || 0;
    const hr = parseInt(document.getElementById('news-hr').value) || 0;
    const consciousness = parseInt(document.getElementById('news-consciousness').value) || 0;
    const temp = parseFloat(document.getElementById('news-temp').value) || 0;

    let news = 0;
    let qsofa = 0;

    // qSOFA: RR >= 22 (1), SBP <= 100 (1), GCS < 15 (1)
    if (rr >= 22) qsofa++;
    if (sbp <= 100 && sbp > 0) qsofa++;
    if (consciousness > 0) qsofa++;

    // NEWS2 Calculation
    // RR
    if (rr > 0) {
        if (rr <= 8) news += 3;
        else if (rr <= 11) news += 1;
        else if (rr >= 25) news += 3;
        else if (rr >= 21) news += 2;
    }

    // SpO2
    if (spo2 > 0) {
        if (spo2 <= 91) news += 3;
        else if (spo2 <= 93) news += 2;
        else if (spo2 <= 95) news += 1;
    }

    // Oxygen
    news += parseInt(oxygen);

    // SBP
    if (sbp > 0) {
        if (sbp <= 90) news += 3;
        else if (sbp <= 100) news += 2;
        else if (sbp <= 110) news += 1;
        else if (sbp >= 220) news += 3;
    }

    // HR
    if (hr > 0) {
        if (hr <= 40) news += 3;
        else if (hr <= 50) news += 1;
        else if (hr >= 131) news += 3;
        else if (hr >= 111) news += 2;
        else if (hr >= 91) news += 1;
    }

    // Consciousness
    news += parseInt(consciousness);

    // Temp
    if (temp > 0) {
        if (temp <= 35.0) news += 3;
        else if (temp <= 36.0) news += 1;
        else if (temp >= 39.1) news += 2;
        else if (temp >= 38.1) news += 1;
    }

    document.getElementById('qsofa-score-display').textContent = qsofa;
    document.getElementById('news2-score-display').textContent = news;

    const result = document.getElementById('sepsis-risk-result');
    if (rr === 0 && spo2 === 0 && sbp === 0 && hr === 0) {
        result.classList.add('hidden');
        return;
    }

    result.classList.remove('hidden');

    if (news >= 7 || qsofa >= 2) {
        result.style.background = '#ffebee';
        result.style.color = '#c62828';
        result.style.border = '1px solid #ef9a9a';
        result.innerHTML = '<strong>RED FLAG - High Risk:</strong> Urgent clinical review and consider hospital admission. Start Sepsis 6 (IV fluids, antibiotics, lactate).';
    } else if (news >= 5) {
        result.style.background = '#fff3e0';
        result.style.color = '#ef6c00';
        result.style.border = '1px solid #ffcc80';
        result.innerHTML = '<strong>AMBER FLAG - Medium Risk:</strong> Urgent clinical review by senior clinician. Increase observation frequency.';
    } else if (news >= 1) {
        result.style.background = '#fffde7';
        result.style.color = '#f57f17';
        result.style.border = '1px solid #fff59d';
        result.innerHTML = '<strong>Low Risk (Low Score):</strong> Escalate to ward clinician for review if scores 1-4.';
    } else {
        result.style.background = '#e8f5e9';
        result.style.color = '#2e7d32';
        result.style.border = '1px solid #a5d6a7';
        result.innerHTML = '<strong>GREEN - Stable:</strong> Continue routine observation and clinical review.';
    }
}

function initWells() {
    const inputs = document.querySelectorAll('.wells-input');
    inputs.forEach(input => {
        input.addEventListener('change', calculateWells);
    });
}

function calculateWells() {
    let score = 0;
    const inputs = document.querySelectorAll('.wells-input');
    inputs.forEach(input => {
        if (input.checked) {
            score += parseInt(input.dataset.points);
        }
    });

    const display = document.getElementById('wells-score-display');
    const resultText = document.getElementById('wells-result-text');
    display.textContent = score;

    if (score >= 2) {
        resultText.innerHTML = '<span style="color: #c62828;">DVT LIKELY (Clinical probability 46%)</span><br><span style="font-size: 11px; font-weight: normal;">Action: Arrange urgent Proximal Vein Ultrasound within 4h. If delay >4h, give interim DOAC (e.g. Apixaban).</span>';
    } else {
        resultText.innerHTML = '<span style="color: #27ae60;">DVT UNLIKELY (Clinical probability 3%)</span><br><span style="font-size: 11px; font-weight: normal;">Action: Arrange D-Dimer. If D-Dimer negative: DVT excluded. If D-Dimer positive: Arrange Ultrasound.</span>';
    }
}

function initCURB() {
    const inputs = document.querySelectorAll('.curb-input');
    inputs.forEach(input => {
        input.addEventListener('change', calculateCURB);
    });
}

function calculateCURB() {
    let score = 0;
    const inputs = document.querySelectorAll('.curb-input');
    inputs.forEach(input => {
        if (input.checked) {
            score += parseInt(input.dataset.points);
        }
    });

    const display = document.getElementById('curb-score-display');
    const resultText = document.getElementById('curb-result-text');
    display.textContent = score;

    if (score >= 3) {
        resultText.innerHTML = '<span style="color: #c62828;">SEVERE (Score 3–5): HIGH MORTALITY (15–40%)</span><br><span style="font-size: 11px; font-weight: normal;">Action: URGENT hospital admission. Consider ICU if score 4–5. Dual IV antibiotics.</span>';
    } else if (score >= 2) {
        resultText.innerHTML = '<span style="color: #f39c12;">MODERATE (Score 2): MODERATE MORTALITY (9%)</span><br><span style="font-size: 11px; font-weight: normal;">Action: Consider hospital admission or supervised outpatient care. Dual therapy antibiotics.</span>';
    } else if (score >= 1) {
        resultText.innerHTML = '<span style="color: #2e7d32;">LOW (Score 1): LOW MORTALITY (1.5%)</span><br><span style="font-size: 11px; font-weight: normal;">Action: Consider home treatment. Oral monotherapy. Clinical follow-up.</span>';
    } else {
        resultText.innerHTML = '<span style="color: #27ae60;">LOW (Score 0): VERY LOW MORTALITY (0.6%)</span><br><span style="font-size: 11px; font-weight: normal;">Action: Home treatment usually suitable. Clinical follow-up.</span>';
    }
}

function initCHA2DS2() {
    const inputs = [
        { id: 'c-age-75', label: 'Age ≥ 75 years', points: 2 },
        { id: 'c-age-65', label: 'Age 65–74 years', points: 1 },
        { id: 'c-chf', label: 'Congestive Heart Failure', points: 1 },
        { id: 'c-htn', label: 'Hypertension', points: 1 },
        { id: 'c-dm', label: 'Diabetes Mellitus', points: 1 },
        { id: 'c-stroke', label: 'Stroke / TIA / Thromboembolism', points: 2 },
        { id: 'c-vascular', label: 'Vascular Disease (e.g. MI, PAD)', points: 1 },
        { id: 'c-female', label: 'Female Sex', points: 1 }
    ];

    const container = document.getElementById('cha2ds2-inputs');
    if (container && container.innerHTML === '') {
        inputs.forEach(input => {
            const label = document.createElement('label');
            label.style.display = 'block';
            label.style.marginBottom = '8px';
            label.style.fontSize = '13px';
            label.innerHTML = `<input type="checkbox" id="${input.id}" class="cha-input" data-points="${input.points}"> ${input.label}`;
            container.appendChild(label);
        });

        document.querySelectorAll('.cha-input').forEach(el => {
            el.addEventListener('change', calculateCHA2DS2);
        });
    }
}

function calculateCHA2DS2() {
    let score = 0;
    document.querySelectorAll('.cha-input').forEach(el => {
        if (el.checked) score += parseInt(el.dataset.points);
    });

    document.getElementById('cha2ds2-score').textContent = score;
    const riskEl = document.getElementById('cha2ds2-risk');

    if (score === 0) {
        riskEl.innerHTML = '<strong>No anticoagulation</strong> required (Low risk).';
        riskEl.style.color = '#2e7d32';
    } else if (score === 1) {
        riskEl.innerHTML = '<strong>Consider anticoagulation</strong> (Moderate risk). Clinically indicated in men.';
        riskEl.style.color = '#f57f17';
    } else {
        riskEl.innerHTML = '<strong>Anticoagulation recommended</strong> (High risk). Trial DOAC unless contraindicated.';
        riskEl.style.color = '#c62828';
    }
}

function initGFR() {
    const inputs = ['gfr-creatinine', 'gfr-age', 'gfr-sex', 'gfr-ethnicity'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', calculateGFR);
            el.addEventListener('change', calculateGFR);
        }
    });
}

function calculateGFR() {
    const creat = parseFloat(document.getElementById('gfr-creatinine').value);
    const age = parseInt(document.getElementById('gfr-age').value);
    const sex = document.getElementById('gfr-sex').value;
    const eth = parseFloat(document.getElementById('gfr-ethnicity').value);

    if (!creat || !age) return;

    // MDRD Formula: GFR = 175 x (SCr / 88.4)^-1.154 x (Age)^-0.203 x (0.742 if female) x (1.212 if Black)
    let gfr = 175 * Math.pow(creat / 88.4, -1.154) * Math.pow(age, -0.203);
    if (sex === 'female') gfr *= 0.742;
    gfr *= eth;

    document.getElementById('gfr-score').textContent = Math.round(gfr);
}

function initTheme() {
    const toggle = document.getElementById('dark-mode-toggle');
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        toggle.checked = true;
    }
    toggle.addEventListener('change', () => {
        if (toggle.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    });
}

init();
