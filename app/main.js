let testData = [];
let learningData = null;
let decisionToolsData = null;
let drugInteractionsData = null;

// Class aliases for drug-interaction matching (e.g. "ramipril" → "ace inhibitor")
const DRUG_CLASS_ALIASES = {
    'ace inhibitor': ['ramipril', 'lisinopril', 'enalapril', 'perindopril', 'captopril', 'quinapril', 'fosinopril', 'trandolapril'],
    'nsaid': ['ibuprofen', 'naproxen', 'diclofenac', 'mefenamic acid', 'piroxicam', 'meloxicam', 'celecoxib', 'etoricoxib'],
    'ssri': ['sertraline', 'fluoxetine', 'citalopram', 'escitalopram', 'paroxetine', 'fluvoxamine'],
    'maoi': ['phenelzine', 'isocarboxazid', 'tranylcypromine', 'moclobemide'],
    'statin': ['simvastatin', 'atorvastatin', 'rosuvastatin', 'pravastatin', 'fluvastatin', 'cerivastatin']
};

// Load data and initialize selects
async function init() {
    // Set up navigation first so all tabs (including Sandbox) work even if dashboard data fails
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.id.replace('nav-', '') + '-view';
            // #region agent log
            var viewFound = false;
            views.forEach(function(v) { if (v.id === viewId) viewFound = true; });
            var payload1 = {sessionId:'81698c',location:'main.js:nav-click',message:'Nav item clicked',data:{itemId:item.id,viewId:viewId,viewFound:viewFound,initSandboxType:typeof initSandbox},timestamp:Date.now(),hypothesisId:'H1'};
            var payload2 = {sessionId:'81698c',location:'main.js:nav-click',message:'Sandbox branch',data:{isNavSandbox:item.id==='nav-sandbox',willCallInitSandbox:item.id==='nav-sandbox'&&typeof initSandbox==='function'},timestamp:Date.now(),hypothesisId:'H2'};
            if (typeof window !== 'undefined') { window.__debugLog = window.__debugLog || []; window.__debugLog.push(payload1); window.__debugLog.push(payload2); console.log('[DEBUG-SANDBOX]', JSON.stringify(payload1)); console.log('[DEBUG-SANDBOX]', JSON.stringify(payload2)); }
            fetch('http://127.0.0.1:7623/ingest/dee73cc8-fd3a-417d-b2b7-28f9d03ea65a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'81698c'},body:JSON.stringify(payload1)}).catch(function(){});
            fetch('http://127.0.0.1:7623/ingest/dee73cc8-fd3a-417d-b2b7-28f9d03ea65a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'81698c'},body:JSON.stringify(payload2)}).catch(function(){});
            // #endregion
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

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
            }
            if (item.id === 'nav-sandbox' && typeof initSandbox === 'function') initSandbox();
        });
    });

    // Deep link: open Decision tools view on load if URL asks for it
    const urlParams = new URLSearchParams(location.search);
    const hash = (location.hash || '').replace(/^#/, '');
    if (urlParams.get('view') === 'decision-tools' || hash === 'decision-tools') {
        const navDecisionTools = document.getElementById('nav-decision-tools');
        if (navDecisionTools) navDecisionTools.click();
    }

    // Initialize Calculators (needed for Calculators tab)
    initQRISK();
    initNEWS2();
    initWells();
    initCURB();

    try {
        const response = await fetch('./data/blood_tests_protocol.json');
        testData = await response.json();

        const categorySelect = document.getElementById('select-test');
        if (categorySelect) {
            categorySelect.innerHTML = '';
            testData.forEach((cat, index) => {
                const opt = document.createElement('option');
                opt.value = index;
                opt.textContent = cat.category;
                categorySelect.appendChild(opt);
            });
            categorySelect.addEventListener('change', updateParameters);
        }
        const analyseBtn = document.getElementById('analyse-btn');
        if (analyseBtn) analyseBtn.addEventListener('click', analyseResult);

        const testSearch = document.getElementById('test-search');
        if (testSearch) {
            testSearch.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                if (term.length > 1 && testData.length) {
                    testData.forEach((cat, cIdx) => {
                        cat.tests.forEach((t, tIdx) => {
                            if (t.name.toLowerCase().includes(term)) {
                                const sel = document.getElementById('select-test');
                                if (sel) sel.value = cIdx;
                                updateParameters();
                                const paramSelect = document.getElementById('select-param');
                                if (paramSelect) paramSelect.value = tIdx;
                            }
                        });
                    });
                }
            });
        }
    } catch (e) {
        console.error("Error loading test data:", e);
        const categorySelect = document.getElementById('select-test');
        if (categorySelect) categorySelect.innerHTML = '<option value="">Failed to load protocols</option>';
        const out = document.getElementById('guidance-output');
        if (out) out.innerHTML = '<div class="placeholder-text"><p>Could not load blood test data. Check the console or try refreshing.</p></div>';
    }

    // Drug interactions: load data and wire Check button
    try {
        const diRes = await fetch('./data/drug_interactions.json');
        drugInteractionsData = await diRes.json();
        const checkBtn = document.getElementById('drug-interactions-check-btn');
        if (checkBtn) checkBtn.addEventListener('click', runDrugInteractionsCheck);
    } catch (e) {
        console.error("Error loading drug interactions data:", e);
        drugInteractionsData = { interactions: [] };
    }

    // Dark mode toggle (optional UI from backup)
    const darkToggle = document.getElementById('dark-mode-toggle');
    if (darkToggle) {
        const stored = localStorage.getItem('pathlinks-dark-mode');
        if (stored === '1') {
            document.body.classList.add('dark-mode');
            darkToggle.checked = true;
        }
        darkToggle.addEventListener('change', function () {
            document.body.classList.toggle('dark-mode', this.checked);
            localStorage.setItem('pathlinks-dark-mode', this.checked ? '1' : '0');
        });
    }
}

function normalizeDrugName(s) {
    if (!s || typeof s !== 'string') return '';
    return s
        .toLowerCase()
        .replace(/\d+\s*(mg|mcg|microgram|ml|units?)\b/gi, '')
        .replace(/\s*\d+\s*$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseDrugList(text) {
    if (!text || typeof text !== 'string') return [];
    const raw = text.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    const normalized = raw.map(normalizeDrugName).filter(Boolean);
    const seen = new Set();
    return normalized.filter(n => {
        if (seen.has(n)) return false;
        seen.add(n);
        return true;
    });
}

function expandedDrugSet(normalizedList) {
    const set = new Set(normalizedList);
    for (const [className, members] of Object.entries(DRUG_CLASS_ALIASES)) {
        for (const drug of normalizedList) {
            if (members.some(m => drug.includes(m) || m.includes(drug))) {
                set.add(className);
                break;
            }
        }
    }
    return set;
}

function matchesDrug(expandedSet, drugName) {
    if (!drugName) return false;
    const d = drugName.toLowerCase().trim();
    if (expandedSet.has(d)) return true;
    for (const term of expandedSet) {
        if (term.includes(d) || d.includes(term)) return true;
    }
    return false;
}

function runDrugInteractionsCheck() {
    const inputEl = document.getElementById('drug-list-input');
    const resultsEl = document.getElementById('drug-interactions-results');
    const sourcesEl = document.getElementById('drug-interactions-sources');
    if (!inputEl || !resultsEl) return;
    const text = inputEl.value || '';
    const normalizedList = parseDrugList(text);
    const expandedSet = expandedDrugSet(normalizedList);

    if (!drugInteractionsData || !Array.isArray(drugInteractionsData.interactions)) {
        resultsEl.innerHTML = '<p class="placeholder-text">Drug interaction data could not be loaded. Please refresh the page.</p>';
        if (sourcesEl) sourcesEl.textContent = '';
        return;
    }

    const matched = drugInteractionsData.interactions.filter(int => {
        const a = matchesDrug(expandedSet, int.drugA);
        const b = matchesDrug(expandedSet, int.drugB);
        const bAlt = int.drugBAlt ? matchesDrug(expandedSet, int.drugBAlt) : false;
        return (a && (b || bAlt));
    });

    const order = { contraindicated: 0, major: 1, moderate: 2, minor: 3 };
    matched.sort((x, y) => (order[x.severity] ?? 4) - (order[y.severity] ?? 4));

    if (sourcesEl) {
        const refs = drugInteractionsData.formularyRefs;
        sourcesEl.innerHTML = refs && refs.length
            ? '<strong>Sources:</strong> ' + escapeHtml(refs.join(', ')) + '. Always verify in current BNF/BNFc.'
            : '';
        sourcesEl.style.display = refs && refs.length ? 'block' : 'none';
    }

    if (matched.length === 0) {
        resultsEl.innerHTML = '<p class="placeholder-text">No interactions identified from the drug list.</p><p class="drug-interactions-disclaimer"><strong>This does not rule out all possible interactions.</strong> Always check the current BNF, BNFc, or Stockley\'s before clinical decisions. Use clinical judgement and local formulary.</p>';
        return;
    }

    const bySeverity = { contraindicated: [], major: [], moderate: [], minor: [] };
    matched.forEach(int => {
        const s = (int.severity || '').toLowerCase().replace(/\s+/g, '');
        if (bySeverity[s]) bySeverity[s].push(int);
        else bySeverity.moderate.push(int);
    });

    const severityLabels = {
        contraindicated: 'Contraindicated / Do not combine',
        major: 'Major – avoid or use with caution and monitoring',
        moderate: 'Moderate – consider alternatives or monitor',
        minor: 'Minor – be aware'
    };

    let html = '<p class="drug-interactions-disclaimer"><strong>Verify in current BNF/BNFc</strong> before acting. This is a screening aid only.</p>';
    ['contraindicated', 'major', 'moderate', 'minor'].forEach(sev => {
        const list = bySeverity[sev];
        if (!list || list.length === 0) return;
        html += '<h4 class="drug-interactions-severity-head">' + escapeHtml(severityLabels[sev]) + '</h4><ul class="drug-interactions-list">';
        list.forEach(int => {
            const severityClass = (int.severity || '').toLowerCase().replace(/\s+/, '-');
            const label = (int.drugBAlt && int.drugB) ? `${int.drugA} + ${int.drugB} / ${int.drugBAlt}` : `${int.drugA} + ${int.drugB}`;
            const sourceHint = int.source ? ' <span class="drug-interaction-source">(' + escapeHtml(int.source) + ')</span>' : '';
            html += '<li class="drug-interaction severity-' + severityClass + '"><strong>' + escapeHtml(label) + '</strong>' + sourceHint + ' <span class="severity-badge">' + escapeHtml(int.severity) + '</span><br><span class="description">' + escapeHtml(int.description) + '</span></li>';
        });
        html += '</ul>';
    });
    resultsEl.innerHTML = html;
}

function escapeHtml(s) {
    if (!s) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
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
        // GP Triage Layer
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
    const redFlagsBox = document.getElementById('decision-red-flags-box');
    const redFlagsList = document.getElementById('decision-red-flags-list');
    const redFlagsToggle = document.getElementById('decision-red-flags-toggle');
    const redFlagsBody = document.getElementById('decision-red-flags-body');
    const redFlagsChevron = document.getElementById('decision-red-flags-chevron');
    if (redFlagsToggle && redFlagsBody && redFlagsChevron) {
        redFlagsToggle.addEventListener('click', function () {
            const open = redFlagsBody.style.display !== 'none';
            redFlagsBody.style.display = open ? 'none' : '';
            redFlagsChevron.textContent = open ? '▶' : '▼';
            redFlagsToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
        });
    }
    const stepsContainer = document.getElementById('decision-steps-container');
    const guidanceBox = document.getElementById('decision-guidance-box');
    const guidanceText = document.getElementById('decision-guidance-text');
    const copyGuidanceBtn = document.getElementById('decision-copy-guidance-btn');
    const clearFiltersBtn = document.getElementById('decision-clear-filters-btn');
    if (!systemSelect || !toolSelect || !panel) return;

    if (systemSelect.dataset.loading === 'true') return;
    if (systemSelect.dataset.initialized) return;

    const loadingEl = document.getElementById('decision-tools-loading');
    if (!decisionToolsData) {
        systemSelect.dataset.loading = 'true';
        if (loadingEl) loadingEl.classList.remove('hidden');
        try {
            const res = await fetch('./data/decision_tools_protocol.json?v=' + (window.DECISION_TOOLS_CACHE_BUST || '10'));
            if (!res.ok) throw new Error('Not found');
            decisionToolsData = await res.json();
            systemSelect.dataset.loading = 'false';
            systemSelect.dataset.initialized = 'true';
            if (loadingEl) loadingEl.classList.add('hidden');
        } catch (e) {
            console.error("[DecisionTools] Load failed:", e);
            systemSelect.dataset.loading = 'false';
            if (loadingEl) loadingEl.classList.add('hidden');
            panel.classList.add('hidden');
            stepsContainer.innerHTML = '<p class="placeholder-text">Decision tools data not found. Run <code>node scripts/build-decision-tools.js</code> to generate or check network connectivity.</p>';
            return;
        }
    } else {
        systemSelect.dataset.initialized = 'true';
    }

    const systems = decisionToolsData.systems || [];
    const totalToolsCount = systems.reduce((acc, sys) => acc + (sys.tools || []).length, 0);
    const totalCountEl = document.getElementById('decision-tools-total-count');
    const versionEl = document.getElementById('decision-tools-version');
    const emptyHintEl = document.getElementById('decision-tools-empty-hint');
    if (totalCountEl) totalCountEl.textContent = '(' + totalToolsCount + ' tools)';
    if (versionEl) {
        const v = decisionToolsData.protocolVersion;
        const built = decisionToolsData.builtAt ? new Date(decisionToolsData.builtAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        versionEl.textContent = (v != null ? ' · Protocol v' + v : '') + (built ? ' · built ' + built : '');
    }
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
    const niceFilterSelect = document.getElementById('decision-nice-filter');

    // Build unique NICE refs list from all tools
    const allNiceRefs = new Set();
    systems.forEach(sys => {
        (sys.tools || []).forEach(tool => {
            (tool.niceRefs || []).forEach(ref => { if (ref && String(ref).trim()) allNiceRefs.add(String(ref).trim()); });
        });
    });
    const sortedNiceRefs = Array.from(allNiceRefs).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    if (niceFilterSelect) {
        sortedNiceRefs.forEach(ref => {
            const opt = document.createElement('option');
            opt.value = ref;
            opt.textContent = ref;
            niceFilterSelect.appendChild(opt);
        });
    }

    function populateTopicDropdown(sys, filterStr, niceRef) {
        let tools = sys.tools || [];
        if (niceRef) tools = tools.filter(t => (t.niceRefs || []).indexOf(niceRef) !== -1);
        const q = (filterStr || '').trim().toLowerCase();
        const filtered = q ? tools.filter(t => (t.title || '').toLowerCase().includes(q)) : tools;
        toolSelect.innerHTML = '<option value="">-- Choose topic --</option>';
        filtered.forEach(tool => {
            const tIdx = (sys.tools || []).indexOf(tool);
            const opt = document.createElement('option');
            opt.value = tIdx;
            opt.textContent = tool.title;
            toolSelect.appendChild(opt);
        });
        const total = (sys.tools || []).length;
        if (countEl) countEl.textContent = filtered.length === total && !niceRef ? total + ' topics' : 'Showing ' + filtered.length + (niceRef || q ? ' of ' + total : '') + ' topics';
    }

    function getSelectedNiceRef() {
        return niceFilterSelect && niceFilterSelect.value ? niceFilterSelect.value : '';
    }

    const RECENT_STORAGE_KEY = 'pathlinks-recent-tools';
    const MAX_RECENT = 5;
    function addToRecent(sysIdx, toolIdx, title) {
        if (!sysIdx || !title) return;
        let arr = JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) || '[]');
        arr = arr.filter(r => !(String(r.sysIdx) === String(sysIdx) && r.title === title));
        arr.unshift({ sysIdx: String(sysIdx), toolIdx: String(toolIdx), title: title });
        arr = arr.slice(0, MAX_RECENT);
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(arr));
        updateRecentUI();
    }
    function updateRecentUI() {
        const container = document.getElementById('decision-recent-links');
        const parent = document.getElementById('decision-recent-tools');
        if (!container || !parent) return;
        const arr = JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) || '[]');
        if (arr.length === 0) { parent.style.display = 'none'; return; }
        parent.style.display = 'block';
        container.innerHTML = arr.map((r, i) => {
            const short = (r.title || '').length > 32 ? (r.title || '').slice(0, 29) + '…' : (r.title || '');
            return '<a href="#" data-recent-i="' + i + '" style="margin-left:6px;color:var(--primary);">' + escapeHtml(short) + '</a>';
        }).join('');
        container.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                const i = parseInt(this.getAttribute('data-recent-i'), 10);
                const list = JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) || '[]');
                const r = list[i];
                if (!r || r.sysIdx == null) return;
                const sysIdx = String(r.sysIdx);
                const title = r.title;
                if (!title) return;
                const sys = systems[parseInt(sysIdx, 10)];
                if (!sys || !sys.tools) return;
                const tool = sys.tools.find(t => t.title === title);
                if (!tool) return;
                const toolIdx = sys.tools.indexOf(tool);
                systemSelect.value = sysIdx;
                toolSelect.disabled = false;
                populateTopicDropdown(sys, '', '');
                toolSelect.value = String(toolIdx);
                renderToolUI(tool);
                panel.classList.remove('hidden');
            });
        });
    }
    updateRecentUI();

    systemSelect.onchange = function () {
        const sysIdx = this.value;
        toolSelect.disabled = sysIdx === '';
        if (sysIdx === '') {
            toolSelect.innerHTML = '<option value="">-- Choose topic --</option>';
            if (countEl) countEl.textContent = '';
            if (filterInput) filterInput.value = '';
            panel.classList.add('hidden');
            if (emptyHintEl) emptyHintEl.style.display = '';
            return;
        }
        const sys = systems[parseInt(sysIdx, 10)];
        const filterStr = filterInput ? filterInput.value : '';
        populateTopicDropdown(sys, filterStr, getSelectedNiceRef());
    };

    if (niceFilterSelect) {
        niceFilterSelect.addEventListener('change', function () {
            const sysIdx = systemSelect.value;
            if (sysIdx === '') return;
            const sys = systems[parseInt(sysIdx, 10)];
            populateTopicDropdown(sys, filterInput ? filterInput.value : '', getSelectedNiceRef());
        });
    }

    if (filterInput) {
        filterInput.addEventListener('input', function () {
            const sysIdx = systemSelect.value;
            if (sysIdx === '') return;
            const sys = systems[parseInt(sysIdx, 10)];
            populateTopicDropdown(sys, this.value, getSelectedNiceRef());
        });
    }
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function () {
            if (niceFilterSelect) niceFilterSelect.value = '';
            if (filterInput) filterInput.value = '';
            const sysIdx = systemSelect.value;
            if (sysIdx !== '') {
                const sys = systems[parseInt(sysIdx, 10)];
                populateTopicDropdown(sys, '', '');
            }
        });
    }
    function copyGuidanceToClipboard() {
        const text = guidanceText && guidanceText.textContent ? guidanceText.textContent.trim() : '';
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            const prev = copyGuidanceBtn.textContent;
            copyGuidanceBtn.textContent = 'Copied';
            setTimeout(() => { copyGuidanceBtn.textContent = prev; }, 1500);
        }).catch(() => {});
    }
    if (copyGuidanceBtn) copyGuidanceBtn.addEventListener('click', copyGuidanceToClipboard);
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' || (!e.ctrlKey && !e.metaKey)) return;
        const viewEl = document.getElementById('decision-tools-view');
        if (!viewEl || viewEl.classList.contains('hidden')) return;
        if (panel.classList.contains('hidden')) return;
        copyGuidanceToClipboard();
    });

    const searchAllInput = document.getElementById('decision-search-all');
    const searchResultsEl = document.getElementById('decision-search-results');
    if (searchAllInput && searchResultsEl) {
        const maxSearchHits = 25;
        let searchDebounceTimer = null;
        function runSearch() {
            const q = (searchAllInput.value || '').trim().toLowerCase();
            searchResultsEl.classList.add('hidden');
            searchResultsEl.innerHTML = '';
            if (q.length < 2) return;
            const hits = [];
            systems.forEach((sys, sysIdx) => {
                (sys.tools || []).forEach((tool, toolIdx) => {
                    const title = (tool.title || '').toLowerCase();
                    const sysName = (sys.name || '').toLowerCase();
                    const niceRefsStr = (tool.niceRefs || []).join(' ').toLowerCase();
                    if (title.includes(q) || sysName.includes(q) || niceRefsStr.includes(q)) hits.push({ sysIdx, toolIdx, sysName: sys.name, title: tool.title, tool });
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
            searchResultsEl.dataset.firstHit = show.length ? JSON.stringify({ sysIdx: show[0].sysIdx, toolIdx: show[0].toolIdx, title: show[0].title, sysName: show[0].sysName }) : '';
            if (show.length === 0) {
                searchResultsEl.innerHTML = '<div class="search-no-results" style="padding:12px;color:var(--text-muted);font-size:13px;">No matches. Try broader terms or clear filters.</div>';
                searchResultsEl.classList.remove('hidden');
                searchResultsEl.setAttribute('aria-label', 'No search results');
                return;
            }
            searchResultsEl.setAttribute('aria-label', (hits.length > maxSearchHits ? 'Showing ' + maxSearchHits + ' of ' + hits.length : hits.length) + ' results');
            const totalHits = hits.length;
            const countTip = totalHits > maxSearchHits
                ? '<div class="search-results-count" style="padding:6px 12px;font-size:11px;color:var(--text-muted);border-bottom:1px solid #eee;">Showing ' + maxSearchHits + ' of ' + totalHits + ' matches</div>'
                : '';
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
                    populateTopicDropdown(systems[sysIdx], '', getSelectedNiceRef());

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
            if (show.length) {
                if (countTip) searchResultsEl.insertAdjacentHTML('afterbegin', countTip);
                searchResultsEl.classList.remove('hidden');
            }
        }
        searchAllInput.addEventListener('input', function () {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(runSearch, 250);
        });
        searchAllInput.addEventListener('keydown', function (e) {
            const hits = searchResultsEl.querySelectorAll('.search-hit');
            if (e.key === 'Enter') {
                e.preventDefault();
                const focused = searchResultsEl.querySelector('.search-hit.focused');
                if (focused) focused.click();
                else if (hits.length) hits[0].click();
                else runSearch();
                return;
            }
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
            if (!hits.length) return;
            e.preventDefault();
            const current = searchResultsEl.querySelector('.search-hit.focused');
            let idx = current ? Array.prototype.indexOf.call(hits, current) : -1;
            if (e.key === 'ArrowDown') idx = Math.min(idx + 1, hits.length - 1);
            else idx = Math.max(idx - 1, 0);
            hits.forEach((el, i) => el.classList.toggle('focused', i === idx));
            if (hits[idx]) hits[idx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
        searchAllInput.addEventListener('blur', function () {
            setTimeout(() => { searchResultsEl.classList.add('hidden'); }, 150);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                searchAllInput.blur();
                searchResultsEl.classList.add('hidden');
            }
            if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const active = document.activeElement;
                if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
                const view = document.getElementById('decision-tools-view');
                if (view && !view.classList.contains('hidden')) {
                    searchAllInput.focus();
                    e.preventDefault();
                }
            }
        });
        // Sandbox deep-link: prefill search and open first result if any
        if (window.__pendingDecisionToolsQuery) {
            const q = window.__pendingDecisionToolsQuery;
            window.__pendingDecisionToolsQuery = null;
            searchAllInput.value = q;
            searchAllInput.dispatchEvent(new Event('input', { bubbles: true }));
            setTimeout(() => {
                const first = searchResultsEl.querySelector('.search-hit');
                if (first) first.click();
            }, 350);
        }
    }

    toolSelect.onchange = function () {
        const sysIdx = systemSelect.value;
        const toolIdx = this.value;
        if (sysIdx === '' || toolIdx === '') {
            panel.classList.add('hidden');
            if (emptyHintEl) emptyHintEl.style.display = '';
            return;
        }
        const sys = systems[parseInt(sysIdx, 10)];
        const tool = (sys.tools || [])[parseInt(toolIdx, 10)];
        if (tool) renderToolUI(tool);
    };
    const backToListBtn = document.getElementById('decision-back-to-list-btn');
    if (backToListBtn) {
        backToListBtn.onclick = function () {
            panel.classList.add('hidden');
            if (emptyHintEl) emptyHintEl.style.display = '';
            const viewEl = document.getElementById('decision-tools-view');
            if (viewEl) viewEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            systemSelect.focus();
        };
    }

    const exportVisibleBtn = document.getElementById('decision-export-visible-btn');
    const exportSectionBtn = document.getElementById('decision-export-section-btn');
    const exportAllBtn = document.getElementById('decision-export-all-btn');
    function downloadJson(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }
    function getVisibleTools() {
        const sysIdx = systemSelect.value;
        if (sysIdx === '') return null;
        const sys = systems[parseInt(sysIdx, 10)];
        const niceRef = getSelectedNiceRef();
        const filterStr = (filterInput && filterInput.value || '').trim().toLowerCase();
        let list = sys.tools || [];
        if (niceRef) list = list.filter(t => (t.niceRefs || []).indexOf(niceRef) !== -1);
        if (filterStr) list = list.filter(t => (t.title || '').toLowerCase().includes(filterStr));
        return { system: sys.name, id: sys.id, tools: list };
    }
    if (exportVisibleBtn) {
        exportVisibleBtn.onclick = function () {
            const visible = getVisibleTools();
            if (!visible || visible.tools.length === 0) {
                alert('Choose a system and ensure at least one topic is visible (check NICE/topic filter).');
                return;
            }
            const date = new Date().toISOString().slice(0, 10);
            const payload = { ...visible, exportedAt: new Date().toISOString() };
            downloadJson(payload, 'decision-tools-visible-' + (visible.id || '') + '_' + date + '.json');
        };
    }
    if (exportSectionBtn) {
        exportSectionBtn.onclick = function () {
            const sysIdx = systemSelect.value;
            if (sysIdx === '') {
                alert('Choose a system first.');
                return;
            }
            const sys = systems[parseInt(sysIdx, 10)];
            const payload = { system: sys.name, id: sys.id, tools: sys.tools || [], exportedAt: new Date().toISOString() };
            const date = new Date().toISOString().slice(0, 10);
            downloadJson(payload, 'decision-tools-' + (sys.id || sysIdx) + '_' + date + '.json');
        };
    }
    if (exportAllBtn) {
        exportAllBtn.onclick = function () {
            const date = new Date().toISOString().slice(0, 10);
            downloadJson(decisionToolsData, 'decision_tools_protocol_' + date + '.json');
        };
    }

    function openRandomTool() {
        const sysList = systems.filter(s => (s.tools || []).length > 0);
        if (!sysList.length) return;
        const sys = sysList[Math.floor(Math.random() * sysList.length)];
        const tools = sys.tools || [];
        if (!tools.length) return;
        const tool = tools[Math.floor(Math.random() * tools.length)];
        const sysIdx = systems.indexOf(sys);
        const toolIdx = tools.indexOf(tool);
        systemSelect.value = String(sysIdx);
        toolSelect.disabled = false;
        populateTopicDropdown(sys, '', '');
        toolSelect.value = String(toolIdx);
        renderToolUI(tool);
        panel.classList.remove('hidden');
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const randomToolTopBtn = document.getElementById('decision-random-tool-top-btn');
    const randomToolPanelBtn = document.getElementById('decision-random-tool-btn');
    const printToolBtn = document.getElementById('decision-print-tool-btn');
    if (randomToolTopBtn) randomToolTopBtn.onclick = openRandomTool;
    if (randomToolPanelBtn) randomToolPanelBtn.onclick = openRandomTool;
    const prevToolBtn = document.getElementById('decision-prev-tool-btn');
    const nextToolBtn = document.getElementById('decision-next-tool-btn');
    if (prevToolBtn) {
        prevToolBtn.onclick = function () {
            if (toolSelect.selectedIndex <= 1) return;
            toolSelect.selectedIndex--;
            toolSelect.dispatchEvent(new Event('change', { bubbles: true }));
        };
    }
    if (nextToolBtn) {
        nextToolBtn.onclick = function () {
            if (toolSelect.selectedIndex < 0 || toolSelect.selectedIndex >= toolSelect.options.length - 1) return;
            toolSelect.selectedIndex++;
            toolSelect.dispatchEvent(new Event('change', { bubbles: true }));
        };
    }
    function openToolPrintView(andPrint) {
        const sysIdx = systemSelect.value;
        const toolIdx = toolSelect.value;
        if (sysIdx === '' || toolIdx === '') return;
        const sys = systems[parseInt(sysIdx, 10)];
        const tool = (sys.tools || [])[parseInt(toolIdx, 10)];
        if (!tool) return;
        const redFlagsList = [];
        (tool.steps || []).forEach(step => {
            (step.options || []).forEach(opt => {
                const g = (opt.guidance || '').trim();
                if (/refer|urgent|2WW|red flag|emergency|same-day|immediate/i.test(g) || /refer|urgent|2WW|red flag|emergency/i.test(opt.label || '')) {
                    redFlagsList.push((opt.label || '') + (g ? ': ' + g.split(/\n/)[0].replace(/^MANAGEMENT PLAN:\s*/i, '').trim().slice(0, 100) : ''));
                }
            });
        });
        let stepsHtml = '';
        (tool.steps || []).forEach(step => {
            if (step.type !== 'dropdown' || !step.options) return;
            stepsHtml += '<h4 style="margin:12px 0 4px 0;">' + escapeHtml(step.question) + '</h4><ul style="margin:0 0 12px 0; padding-left:20px;">';
            (step.options || []).forEach(opt => {
                stepsHtml += '<li><strong>' + escapeHtml(opt.label || '') + '</strong><br><span style="white-space:pre-line;font-size:12px;">' + escapeHtml(opt.guidance || '') + '</span></li>';
            });
            stepsHtml += '</ul>';
        });
        const win = window.open('', '_blank', 'width=700,height=800');
        win.document.write('<!DOCTYPE html><html><head><title>' + escapeHtml(tool.title) + '</title><meta charset="utf-8"></head><body style="font-family:Inter,sans-serif;padding:24px;max-width:700px;">' +
            '<h1 style="margin:0 0 8px 0;">' + escapeHtml(tool.title) + '</h1>' +
            '<p class="small-text"><strong>NICE / evidence:</strong> ' + escapeHtml((tool.niceRefs || []).join(', ') || 'NICE CKS') + '</p>' +
            '<p style="line-height:1.5;">' + escapeHtml(tool.evidence || '') + '</p>' +
            (redFlagsList.length ? '<h3 style="margin-top:16px;color:#c0392b;">Red flags / When to refer</h3><ul style="padding-left:20px;">' + redFlagsList.map(r => '<li>' + escapeHtml(r) + '</li>').join('') + '</ul>' : '') +
            '<h3 style="margin-top:16px;">Steps</h3>' + stepsHtml +
            '<p style="margin-top:24px;font-size:11px;color:#666;">PathLinks Decision Tools · ' + new Date().toLocaleDateString() + '</p>' +
            '</body></html>');
        win.document.close();
        win.focus();
        if (andPrint !== false) setTimeout(function () { win.print(); }, 300);
    }
    if (printToolBtn) printToolBtn.onclick = function () { openToolPrintView(true); };
    const exportPdfBtn = document.getElementById('decision-export-pdf-btn');
    if (exportPdfBtn) exportPdfBtn.onclick = function () { openToolPrintView(true); };

    // Deep link: ?view=decision-tools&system=0&tool=5 or #decision-tools
    const params = new URLSearchParams(location.search);
    const systemParam = params.get('system');
    const toolParam = params.get('tool');
    if (systemParam != null && systemParam !== '' && toolParam != null && toolParam !== '') {
        const sysIdx = parseInt(systemParam, 10);
        const toolIdx = parseInt(toolParam, 10);
        if (!isNaN(sysIdx) && !isNaN(toolIdx) && systems[sysIdx]) {
            const sys = systems[sysIdx];
            const tools = sys.tools || [];
            if (tools[toolIdx]) {
                systemSelect.value = String(sysIdx);
                toolSelect.disabled = false;
                populateTopicDropdown(sys, filterInput ? filterInput.value : '', getSelectedNiceRef());
                toolSelect.value = String(toolIdx);
                renderToolUI(tools[toolIdx]);
            }
        }
    }

    function renderToolUI(tool) {
        const sysIdx = systemSelect.value;
        const toolIdx = toolSelect.value;
        if (sysIdx && toolIdx && tool && tool.title) addToRecent(sysIdx, toolIdx, tool.title);
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

        // Red flags / When to refer: collect from step options
        const refRegex = /refer|urgent|2WW|red flag|emergency|same-day|immediate/i;
        const points = [];
        (tool.steps || []).forEach(step => {
            (step.options || []).forEach(opt => {
                const label = (opt.label || '').trim();
                const guidance = (opt.guidance || '').trim();
                if (!label && !guidance) return;
                const isRef = refRegex.test(label) || refRegex.test(guidance);
                if (isRef) {
                    const short = guidance.split(/\n/)[0].replace(/^MANAGEMENT PLAN:\s*/i, '').trim();
                    points.push(short ? label + ': ' + (short.length > 120 ? short.slice(0, 117) + '…' : short) : label);
                }
            });
        });
        if (redFlagsBox && redFlagsList) {
            redFlagsList.innerHTML = '';
            if (points.length) {
                points.forEach(p => {
                    const li = document.createElement('li');
                    li.textContent = p;
                    redFlagsList.appendChild(li);
                });
                redFlagsBox.classList.remove('hidden');
                const body = document.getElementById('decision-red-flags-body');
                const toggle = document.getElementById('decision-red-flags-toggle');
                const chevron = document.getElementById('decision-red-flags-chevron');
                if (body && toggle && chevron) {
                    toggle.setAttribute('aria-expanded', 'true');
                    body.style.display = '';
                    chevron.textContent = '▼';
                }
            } else {
                redFlagsBox.classList.add('hidden');
            }
        }

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
        if (emptyHintEl) emptyHintEl.style.display = 'none';
        panel.classList.remove('hidden');
    }
}

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}



function renderEmisIntegrations() {
    const exportDiv = document.getElementById('emis-integration-panel');
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
            const response = await fetch('../docs/EMIS_PROTOCOL_SETUP_GUIDE.md');
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
                    <tr class="alert"><td>Potassium</td><td>≥ 6.0 mmol/L</td><td>ECG immediately. Check sample/report time gap. If ≥6.5: Hospital admission</td><td class="code">44I7.</td></tr>
                    <tr class="alert"><td>Sodium</td><td>&lt; 125 mmol/L</td><td>Assess urgently (Seizures). Consider Drugs/Malignancy.</td><td class="code">44I5.</td></tr>
                    <tr class="alert"><td>Calcium</td><td>&gt; 3.0 mmol/L</td><td>Urgent hospital admission. Exclude Malignancy.</td><td class="code">44J1.</td></tr>
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

init();
