let testData = [];
let learningData = null;
let decisionToolsData = null;

// Load data and initialize selects
async function init() {
    try {
        const response = await fetch('./data/blood_tests_protocol.json');
        testData = await response.json();

        // Load learning data in background so we can show related snippets in the clinical tool
        fetch('./data/knowledge_base.json').then(r => r.ok ? r.json() : fetch('./data/clinical_topics_learning.json').then(r2 => r2.ok ? r2.json() : null)).then(data => { learningData = data; }).catch(() => { });

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
                if (item.id === 'nav-learning') renderLearningTopics();
                if (item.id === 'nav-decision-tools') renderDecisionTools();
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

function getRelatedLearning(testName, categoryName) {
    if (!learningData || !learningData.sections) return [];
    const words = (testName + ' ' + categoryName).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    const out = [];
    learningData.sections.forEach(section => {
        (section.topics || []).forEach(t => {
            const title = (t.title || '').toLowerCase();
            const transcript = (t.transcript || '').toLowerCase();
            const match = words.some(w => title.includes(w) || transcript.includes(w));
            const tr = t.transcript || '';
            if (match && tr.length > 80) {
                const skip = Math.min(220, Math.floor(tr.length * 0.15));
                const clinical = tr.slice(skip);
                out.push({ title: t.title, transcript: clinical.slice(0, 380) + (clinical.length > 380 ? '…' : ''), episode: t.episode });
            }
        });
    });
    return out.slice(0, 2);
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
    if (isNaN(value)) {
        output.innerHTML = '<div class="placeholder-text"><p>Please enter a numerical result value.</p></div>';
        return;
    }

    const test = testData[catIdx].tests[paramIdx];
    const categoryName = testData[catIdx].category;
    let range;

    const findAgeRange = (ranges, currentAge) => {
        // Look for keys like age_40_49
        for (const key in ranges) {
            if (key.startsWith('age_')) {
                const parts = key.split('_'); // ['age', '40', '49']
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

    if (!range) {
        output.innerHTML = '<div class="placeholder-text"><p>No reference range available for this test/sex/age combination.</p></div>';
        return;
    }

    let status = "normal";
    let guidanceKey = null;

    const hasMin = range.min !== undefined && range.min !== null;
    const hasMax = range.max !== undefined && range.max !== null;

    if (hasMin && value < range.min) {
        status = "abnormal";
        guidanceKey = "low";
    } else if (hasMax && value > range.max) {
        status = (value > range.max * 1.5) ? "pathological" : "abnormal";
        guidanceKey = "high";
    }

    let html = `
        <div class="guidance-result">
            <div class="status-box ${status}">
                <span>${status.toUpperCase()}: ${test.name} = ${value} ${test.unit}</span>
                <span class="range-info">(Ref: ${hasMin ? range.min : '—'} – ${hasMax ? range.max : '—'} ${test.unit})</span>
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
                    Read Code: ${test.emisCode || '66Y..'} <br>
                    Status: ${status.charAt(0).toUpperCase() + status.slice(1)} result <br>
                    Clinician: Actioned via PathLinks Protocol
                </div>
            </div>
    `;

    const related = getRelatedLearning(test.name, categoryName);
    if (related.length > 0) {
        html += `<div class="related-learning-box" style="margin-top: 16px; padding: 14px; background: #f0f7ff; border-left: 4px solid var(--primary); border-radius: 8px;"><h4 style="font-size: 13px; color: var(--primary); margin: 0 0 8px 0;">Related learning from library</h4>`;
        related.forEach(r => {
            html += `<p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600;">${(r.title || '').replace(/_/g, ' ')}${r.episode != null ? ' (Ep ' + r.episode + ')' : ''}</p><p style="margin: 0 0 10px 0; font-size: 12px; line-height: 1.4; color: #444;">${escapeHtml(r.transcript)}</p>`;
        });
        html += `</div>`;
    }
    html += `</div>`;

    output.innerHTML = html;
}

async function renderLearningTopics() {
    const container = document.getElementById('learning-container');
    if (!container) return;

    if (!learningData) {
        try {
            let res = await fetch('./data/knowledge_base.json');
            if (!res.ok) res = await fetch('./data/clinical_topics_learning.json');
            learningData = await res.json();
        } catch (e) {
            container.innerHTML = '<div class="card" style="padding: 24px;"><p>Learning data not found. Run <code>node scripts/parse-mp3-topics.js "/Volumes/NO NAME"</code> then <code>python scripts/transcribe_mp3_to_knowledge.py "/Volumes/NO NAME"</code> to extract knowledge from USB MP3s.</p></div>';
            return;
        }
    }

    const searchEl = document.getElementById('knowledge-search');
    const query = (searchEl && searchEl.value) ? searchEl.value.trim().toLowerCase() : '';
    const hasTranscripts = learningData.sections && learningData.sections.some(s => (s.topics || []).some(t => t.transcript));

    let html = '';
    if (learningData.sections && learningData.sections.length) {
        const subLabel = hasTranscripts ? 'Search runs over titles and transcript text.' : 'Titles only; run the transcription script to add full text.';
        html += `<p class="small-text" style="margin-bottom: 16px;">${learningData.totalTopics} topics across ${learningData.sections.length} sections. ${subLabel}</p>`;
        learningData.sections.forEach(section => {
            if (!section.topics || section.topics.length === 0) return;
            const filtered = query
                ? section.topics.filter(t => {
                    const title = (t.title || '').toLowerCase().replace(/_/g, ' ');
                    const transcript = (t.transcript || '').toLowerCase();
                    return title.includes(query) || transcript.includes(query);
                })
                : section.topics;
            if (filtered.length === 0) return;
            html += `<div class="card learning-section-card" style="margin-bottom: 20px;"><h3 style="margin: 0 0 12px 0; font-size: 1.1rem; color: var(--primary);">${section.name}</h3><ul class="learning-topic-list">`;
            filtered.forEach(t => {
                const epLabel = t.episode != null ? `Ep ${t.episode} – ` : '';
                const titleDisplay = (t.title || '').replace(/_/g, ' ');
                const hasT = t.transcript && t.transcript.length > 0;
                const tid = `topic-${section.id}-${(t.episode || t.filename || '').toString().replace(/\W/g, '-')}`;
                html += `<li class="learning-topic-item" data-topic-id="${tid}">
                    <span class="episode-tag">${epLabel}</span>
                    <span class="learning-topic-title">${titleDisplay}</span>
                    ${hasT ? `<button type="button" class="link-btn show-transcript-btn" data-topic-id="${tid}" aria-label="Show transcript">Read transcript</button>` : ''}
                    <div id="${tid}" class="topic-transcript hidden">${escapeHtml((t.transcript || '').slice(0, 50000))}</div>
                </li>`;
            });
            html += '</ul></div>';
        });
        container.innerHTML = html;
        container.querySelectorAll('.show-transcript-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = this.getAttribute('data-topic-id');
                const el = document.getElementById(id);
                if (!el) return;
                const isHidden = el.classList.contains('hidden');
                el.classList.toggle('hidden', !isHidden);
                this.textContent = isHidden ? 'Hide transcript' : 'Read transcript';
            });
        });
        if (searchEl && !searchEl.dataset.bound) {
            searchEl.dataset.bound = '1';
            searchEl.addEventListener('input', () => renderLearningTopics());
        }
    } else {
        html = '<div class="card" style="padding: 24px;"><p>No learning sections available.</p></div>';
        container.innerHTML = html;
    }
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

    if (!decisionToolsData) {
        try {
            const res = await fetch('./data/decision_tools_protocol.json');
            if (!res.ok) throw new Error('Not found');
            decisionToolsData = await res.json();
        } catch (e) {
            panel.classList.add('hidden');
            stepsContainer.innerHTML = '<p class="placeholder-text">Decision tools data not found. Run <code>node scripts/build-decision-tools.js</code> to generate.</p>';
            return;
        }
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
                    if (title.includes(q) || sysName.includes(q)) hits.push({ sysIdx, toolIdx, sysName: sys.name, title: tool.title });
                });
            });
            hits.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'en', { sensitivity: 'base' }));
            const show = hits.slice(0, maxSearchHits);
            show.forEach(({ sysIdx, toolIdx, sysName, title }) => {
                const div = document.createElement('div');
                div.className = 'search-hit';
                div.setAttribute('role', 'option');
                div.innerHTML = '<span>' + escapeHtml(title) + '</span> <span class="system-name">(' + escapeHtml(sysName) + ')</span>';
                div.addEventListener('click', function () {
                    if (filterInput) filterInput.value = '';
                    searchAllInput.value = '';
                    searchResultsEl.classList.add('hidden');
                    searchResultsEl.innerHTML = '';

                    // Update selects so UI stays in sync if possible
                    systemSelect.value = String(sysIdx);
                    toolSelect.disabled = false;
                    populateTopicDropdown(systems[sysIdx], '');
                    toolSelect.value = String(toolIdx);

                    const sys = systems[sysIdx];
                    const tool = (sys.tools || [])[parseInt(toolIdx, 10)];
                    if (tool) renderToolUI(tool);
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

function viewFullProtocol(testName) {
    let found = null;
    let categoryName = '';
    for (const cat of testData) {
        const t = cat.tests.find(x => x.name === testName);
        if (t) {
            found = t;
            categoryName = cat.category;
            break;
        }
    }
    if (!found) return;
    let rangeStr;
    if (found.ranges.all) {
        rangeStr = `${found.ranges.all.min ?? 0} – ${found.ranges.all.max} ${found.unit}`;
    } else if (found.ranges.male && found.ranges.female) {
        rangeStr = `M: ${found.ranges.male.min}–${found.ranges.male.max} / F: ${found.ranges.female.min}–${found.ranges.female.max} ${found.unit}`;
    } else if (found.ranges.age_40_49 || found.ranges.age_50_59) {
        const parts = [];
        if (found.ranges.age_40_49) parts.push('40–49: ≤' + found.ranges.age_40_49.max);
        if (found.ranges.age_50_59) parts.push('50–59: ≤' + found.ranges.age_50_59.max);
        if (found.ranges.age_60_69) parts.push('60–69: ≤' + found.ranges.age_60_69.max);
        if (found.ranges.age_70_79) parts.push('70–79: ≤' + found.ranges.age_70_79.max);
        rangeStr = (parts.length ? parts.join(' | ') + ' ' : '') + found.unit;
    } else {
        rangeStr = found.unit;
    }
    let body = `<p><strong>Reference range:</strong> ${rangeStr}</p>`;
    if (found.guidance) {
        if (found.guidance.high && found.guidance.high.actions) {
            body += `<h4 style="margin-top: 12px;">If high</h4><ul class="action-list">`;
            found.guidance.high.actions.forEach(a => { body += `<li class="action-item">${a}</li>`; });
            body += '</ul>';
        }
        if (found.guidance.low && found.guidance.low.actions) {
            body += `<h4 style="margin-top: 12px;">If low</h4><ul class="action-list">`;
            found.guidance.low.actions.forEach(a => { body += `<li class="action-item">${a}</li>`; });
            body += '</ul>';
        }
    }
    document.getElementById('protocol-modal-title').textContent = `${found.name} (${categoryName})`;
    document.getElementById('protocol-modal-body').innerHTML = body;
    const modal = document.getElementById('protocol-modal');
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
}

function renderProtocols() {
    const container = document.getElementById('protocol-list-container');
    container.innerHTML = "";
    testData.forEach(cat => {
        cat.tests.forEach(test => {
            const div = document.createElement('div');
            div.className = "protocol-item";
            const safeName = test.name.replace(/'/g, "\\'");
            div.innerHTML = `
                <div>
                    <span class="cat-label">${cat.category}</span>
                    <strong style="margin-left: 10px;">${test.name}</strong>
                </div>
                <button class="primary-btn" style="width: auto; padding: 8px 16px; font-size: 12px;" onclick="viewFullProtocol('${safeName}')">View Guidance</button>
            `;
            container.appendChild(div);
        });
    });
    document.getElementById('protocol-modal-close').onclick = () => {
        document.getElementById('protocol-modal').classList.add('hidden');
        document.getElementById('protocol-modal').setAttribute('aria-hidden', 'true');
    };
    document.getElementById('protocol-modal').onclick = (e) => {
        if (e.target.id === 'protocol-modal') {
            e.target.classList.add('hidden');
            e.target.setAttribute('aria-hidden', 'true');
        }
    };
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
