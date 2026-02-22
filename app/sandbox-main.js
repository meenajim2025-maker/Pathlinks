let sandboxScenarios = [];
let currentScenario = null;
let sandboxSession = {
    startTime: null,
    actionsTaken: [],
    toolsOpened: new Set()
};

async function initSandbox() {
    var listEl = document.getElementById('sandbox-scenario-list');
    // #region agent log
    var pl = {sessionId:'81698c',location:'sandbox-main.js:initSandbox-entry',message:'initSandbox called',data:{listElPresent:!!listEl},timestamp:Date.now(),hypothesisId:'H3'};
    if (typeof window !== 'undefined') { window.__debugLog = window.__debugLog || []; window.__debugLog.push(pl); console.log('[DEBUG-SANDBOX]', JSON.stringify(pl)); }
    fetch('http://127.0.0.1:7623/ingest/dee73cc8-fd3a-417d-b2b7-28f9d03ea65a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'81698c'},body:JSON.stringify(pl)}).catch(function(){});
    // #endregion
    if (!listEl) return;
    listEl.innerHTML = '<p class="small-text">Loading scenarios...</p>';

    try {
        var loaded = false;
        var el = document.getElementById('sandbox-scenarios-json');
        if (el && el.textContent && el.textContent.trim()) {
            try {
                sandboxScenarios = JSON.parse(el.textContent.trim());
                if (Array.isArray(sandboxScenarios) && sandboxScenarios.length > 0) loaded = true;
            } catch (_) {}
        }
        if (!loaded) {
            var url = '/data/sandbox_scenarios.json';
            try { url = new URL('data/sandbox_scenarios.json', document.baseURI || window.location.href).href; } catch (_) {}
            var response = await fetch(url);
            if (!response.ok) throw new Error('HTTP ' + response.status);
            sandboxScenarios = await response.json();
        }
        // #region agent log
        var pl4 = {sessionId:'81698c',location:'sandbox-main.js:after-data',message:'Scenario data loaded',data:{loaded:loaded,scenarioCount:sandboxScenarios?sandboxScenarios.length:0},timestamp:Date.now(),hypothesisId:'H4'};
        if (typeof window !== 'undefined') { window.__debugLog = window.__debugLog || []; window.__debugLog.push(pl4); console.log('[DEBUG-SANDBOX]', JSON.stringify(pl4)); }
        fetch('http://127.0.0.1:7623/ingest/dee73cc8-fd3a-417d-b2b7-28f9d03ea65a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'81698c'},body:JSON.stringify(pl4)}).catch(function(){});
        // #endregion
        if (!Array.isArray(sandboxScenarios) || sandboxScenarios.length === 0) throw new Error('No scenarios');
        renderSandboxScenarios();

        if (!window.__sandboxHooksAttached) {
            window.__sandboxHooksAttached = true;
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.addEventListener('click', () => {
                    if (currentScenario && sandboxSession.startTime) {
                        sandboxSession.toolsOpened.add(item.id);
                        logSandboxAction(`Opened view: ${item.textContent}`);
                    }
                });
            });
            document.body.addEventListener('click', (e) => {
                if (currentScenario && sandboxSession.startTime) {
                    if (e.target.tagName === 'BUTTON' && e.target.textContent.includes('Calculate')) {
                        logSandboxAction(`Calculated: ${e.target.closest('.card')?.querySelector('h3')?.textContent || 'Score'}`);
                    }
                }
            });
        }

    } catch (e) {
        // #region agent log
        var plC = {sessionId:'81698c',location:'sandbox-main.js:initSandbox-catch',message:'initSandbox error',data:{error:String(e&&e.message||e)},timestamp:Date.now(),hypothesisId:'H4'};
        if (typeof window !== 'undefined') { window.__debugLog = window.__debugLog || []; window.__debugLog.push(plC); console.log('[DEBUG-SANDBOX]', JSON.stringify(plC)); }
        fetch('http://127.0.0.1:7623/ingest/dee73cc8-fd3a-417d-b2b7-28f9d03ea65a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'81698c'},body:JSON.stringify(plC)}).catch(function(){});
        // #endregion
        console.error("Error loading sandbox scenarios:", e);
        if (listEl) listEl.innerHTML = '<p class="small-text" style="color:#c0392b;">Could not load scenarios. Check console.</p>';
    }
}

function renderSandboxScenarios() {
    const listEl = document.getElementById('sandbox-scenario-list');
    // #region agent log
    var pl5 = {sessionId:'81698c',location:'sandbox-main.js:renderSandboxScenarios',message:'Rendering scenarios',data:{listElPresent:!!listEl,scenarioCount:sandboxScenarios?sandboxScenarios.length:0},timestamp:Date.now(),hypothesisId:'H5'};
    if (typeof window !== 'undefined') { window.__debugLog = window.__debugLog || []; window.__debugLog.push(pl5); console.log('[DEBUG-SANDBOX]', JSON.stringify(pl5)); }
    fetch('http://127.0.0.1:7623/ingest/dee73cc8-fd3a-417d-b2b7-28f9d03ea65a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'81698c'},body:JSON.stringify(pl5)}).catch(function(){});
    // #endregion
    if (!listEl) return;

    listEl.innerHTML = '';
    sandboxScenarios.forEach((scenario, idx) => {
        const card = document.createElement('div');
        card.className = 'export-card';
        card.style.cursor = 'pointer';
        card.style.padding = '20px';
        card.style.border = '2px solid transparent';
        card.style.borderRadius = '12px';
        card.style.background = '#ffffff';
        card.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)';
        card.style.marginBottom = '16px';
        card.style.transition = 'all 0.2s ease';

        card.onmouseover = () => { card.style.border = '2px solid var(--primary)'; card.style.transform = 'translateY(-2px)'; };
        card.onmouseout = () => { card.style.border = '2px solid transparent'; card.style.transform = 'translateY(0)'; };

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="margin: 0 0 8px 0; color: var(--primary-dark);">${scenario.title}</h3>
                    <p style="margin: 0; font-size: 13px; color: #666;">Interactive Clinical Case Simulation</p>
                </div>
                <span style="font-size: 24px;">▶️</span>
            </div>
        `;
        card.onclick = () => startSandboxScenario(scenario);
        listEl.appendChild(card);
    });
}

function startSandboxScenario(scenario) {
    currentScenario = scenario;
    sandboxSession = {
        startTime: Date.now(),
        actionsTaken: [],
        toolsOpened: new Set()
    };

    document.getElementById('sandbox-scenario-selection').classList.add('hidden');
    document.getElementById('sandbox-active-simulation').classList.remove('hidden');

    document.getElementById('sandbox-vignette-title').textContent = scenario.title;
    document.getElementById('sandbox-vignette-text').textContent = scenario.vignette;
    document.getElementById('sandbox-results-panel').classList.add('hidden');

    const openToolsBtn = document.getElementById('sandbox-open-decision-tools-btn');
    if (openToolsBtn) {
        if (scenario.suggestedToolQuery) {
            openToolsBtn.style.display = 'inline-block';
            openToolsBtn.onclick = () => {
                window.__pendingDecisionToolsQuery = scenario.suggestedToolQuery;
                const nav = document.getElementById('nav-decision-tools');
                if (nav) nav.click();
            };
        } else {
            openToolsBtn.style.display = 'none';
        }
    }

    // Start timer display
    updateSandboxTimer();
    window.sandboxTimerInterval = setInterval(updateSandboxTimer, 1000);
}

function updateSandboxTimer() {
    if (!sandboxSession.startTime) return;
    const elapsed = Math.floor((Date.now() - sandboxSession.startTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    document.getElementById('sandbox-timer').textContent = `${mins}:${secs}`;
}

function logSandboxAction(actionText) {
    if (!sandboxSession.actionsTaken.includes(actionText)) {
        sandboxSession.actionsTaken.push(actionText);

        // Update live action log UI
        const logList = document.getElementById('sandbox-live-log');
        if (logList) {
            const li = document.createElement('li');
            li.textContent = `✓ ${actionText}`;
            li.style.fontSize = '12px';
            li.style.color = '#4CAF50';
            li.style.marginBottom = '4px';
            logList.appendChild(li);
        }
    }
}

function endSandboxScenario() {
    clearInterval(window.sandboxTimerInterval);

    const resultsPanel = document.getElementById('sandbox-results-panel');
    resultsPanel.classList.remove('hidden');

    // Simple heuristic grading for prototype
    let score = 0;
    let feedback = [];

    const toolsUsed = Array.from(sandboxSession.toolsOpened);

    // Check if correct pathways were opened
    let pathwaysHit = 0;
    const correctPathways = currentScenario.correctPathways || [];
    correctPathways.forEach(path => {
        if (toolsUsed.includes(path)) pathwaysHit++;
    });

    if (pathwaysHit > 0) {
        score += 40;
        feedback.push("✅ Navigated to relevant clinical guidelines/calculators.");
    } else {
        feedback.push("❌ Did not navigate to the expected clinical pathways.");
    }

    // Check actions (loose simulated check based on strings)
    let actionHits = 0;
    const correctActions = currentScenario.correctActions || [];
    correctActions.forEach(action => {
        const hit = sandboxSession.actionsTaken.some(a => a.toLowerCase().includes(action.split(' ')[0].toLowerCase()));
        if (hit) actionHits++;
    });

    if (actionHits > 0 || sandboxSession.actionsTaken.length > 0) {
        score += 60;
        feedback.push("✅ Actioned relevant clinical calculators/tools.");
    } else {
        feedback.push("❌ Missing expected clinical interactions (e.g., Risk score calculation).");
    }

    // Formatting score bar
    const scoreColor = score > 70 ? '#4CAF50' : (score > 40 ? '#FF9800' : '#F44336');
    document.getElementById('sandbox-final-score').textContent = `${score}%`;
    document.getElementById('sandbox-final-score').style.color = scoreColor;

    document.getElementById('sandbox-feedback-list').innerHTML = feedback.map(f => `<li style="margin-bottom:8px; font-size:14px;">${f}</li>`).join('');
    document.getElementById('sandbox-rationale').textContent = currentScenario.educationalRationale;

    // Reset active logs
    const logList = document.getElementById('sandbox-live-log');
    if (logList) logList.innerHTML = '';
}

function returnToSandboxMenu() {
    currentScenario = null;
    document.getElementById('sandbox-active-simulation').classList.add('hidden');
    document.getElementById('sandbox-scenario-selection').classList.remove('hidden');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSandbox);
} else {
    initSandbox();
}
