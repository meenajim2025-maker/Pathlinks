/**
 * GP Voice Triage — record or type presentation, STT → LLM disposition → optional TTS.
 * Requires Vercel serverless routes at /api/voice-triage/* (PATHREADY_API_KEY on server).
 */
(function () {
  const API = {
    transcribe: '/api/voice-triage/transcribe',
    assess: '/api/voice-triage/assess',
    speak: '/api/voice-triage/speak',
  };

  const DISPOSITION_STYLES = {
    emergency_999: { bg: '#ffebee', border: '#c62828', label: 'Emergency (999)' },
    same_day: { bg: '#fff3e0', border: '#e65100', label: 'Same day / Urgent' },
    routine_24_48h: { bg: '#e3f2fd', border: '#1565c0', label: '24–48 h / Routine' },
    self_care: { bg: '#e8f5e9', border: '#2e7d32', label: 'Self-care + safety-net' },
  };

  let mediaRecorder = null;
  let audioChunks = [];
  let triageSymptoms = null;
  let lastAssessment = null;

  async function loadSymptomMap() {
    if (triageSymptoms) return triageSymptoms;
    try {
      const res = await fetch('./data/triage_symptoms.json');
      triageSymptoms = await res.json();
    } catch {
      triageSymptoms = {};
    }
    return triageSymptoms;
  }

  function setStatus(msg, isError) {
    const el = document.getElementById('voice-triage-status');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'voice-triage-status' + (isError ? ' voice-triage-status-error' : '');
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        resolve(String(dataUrl).split(',')[1] || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function apiPost(url, payload) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error || data.detail || res.statusText;
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    return data;
  }

  async function transcribeBlob(blob, mimeType) {
    const audioBase64 = await blobToBase64(blob);
    const data = await apiPost(API.transcribe, { audioBase64, mimeType });
    return data.transcript || '';
  }

  async function assessTranscript(transcript) {
    const data = await apiPost(API.assess, { transcript });
    return data.assessment;
  }

  async function speakText(text) {
    const data = await apiPost(API.speak, { text });
    const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
    await audio.play();
    return audio;
  }

  function matchSymptomTools(transcript) {
    const t = (transcript || '').toLowerCase();
    const hits = new Set();
    if (!triageSymptoms) return [];
    Object.keys(triageSymptoms).forEach((symptom) => {
      if (t.includes(symptom.toLowerCase())) {
        triageSymptoms[symptom].forEach((id) => hits.add(id));
      }
    });
    return Array.from(hits);
  }

  function renderAssessment(assessment, transcript) {
    const panel = document.getElementById('voice-triage-result');
    if (!panel) return;
    lastAssessment = assessment;

    const style = DISPOSITION_STYLES[assessment.disposition] || DISPOSITION_STYLES.self_care;
    const redFlags = (assessment.redFlags || []).length
      ? '<ul class="voice-triage-list">' + assessment.redFlags.map((r) => `<li>${escapeHtml(r)}</li>`).join('') + '</ul>'
      : '<p class="small-text">None identified in presentation.</p>';

    const searches = (assessment.suggestedSearches || []).slice(0, 4);
    const symptomIds = matchSymptomTools(transcript);
    const toolButtons = searches.map((q) =>
      `<button type="button" class="voice-triage-tool-btn" data-query="${escapeAttr(q)}">🔍 ${escapeHtml(q)}</button>`
    ).join('');

    panel.innerHTML = `
      <div class="voice-triage-disposition" style="background:${style.bg};border-color:${style.border}">
        <span class="voice-triage-disposition-label">${escapeHtml(assessment.dispositionLabel || style.label)}</span>
        <p class="voice-triage-summary">${escapeHtml(assessment.summary || '')}</p>
      </div>
      <div class="voice-triage-detail">
        <h4>Red flags</h4>
        ${redFlags}
        <h4>Safety-net</h4>
        <p>${escapeHtml(assessment.safetyNet || 'Reattend if symptoms worsen; call 999 for emergency signs.')}</p>
        ${toolButtons ? '<h4>Open in Decision tools</h4><div class="voice-triage-tool-row">' + toolButtons + '</div>' : ''}
        ${symptomIds.length ? '<p class="small-text">Symptom map matched tool IDs: ' + escapeHtml(symptomIds.join(', ')) + '</p>' : ''}
      </div>
      <div class="voice-triage-actions">
        <button type="button" class="primary-btn" id="voice-triage-speak-btn">🔊 Read disposition aloud</button>
      </div>
    `;
    panel.classList.remove('hidden');

    panel.querySelectorAll('.voice-triage-tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const q = btn.getAttribute('data-query') || '';
        openDecisionToolsSearch(q);
      });
    });

    const speakBtn = document.getElementById('voice-triage-speak-btn');
    if (speakBtn) {
      speakBtn.addEventListener('click', async () => {
        const script = [
          assessment.dispositionLabel,
          assessment.summary,
          'Safety-net: ' + (assessment.safetyNet || ''),
        ].filter(Boolean).join('. ');
        try {
          speakBtn.disabled = true;
          setStatus('Playing audio…');
          await speakText(script);
          setStatus('');
        } catch (e) {
          setStatus(e.message, true);
        } finally {
          speakBtn.disabled = false;
        }
      });
    }
  }

  function openDecisionToolsSearch(query) {
    const q = (query || '').trim();
    if (!q) return;
    sessionStorage.setItem('voiceTriageSearch', q);
    const nav = document.getElementById('nav-decision-tools');
    if (nav) nav.click();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
  }

  async function runPipeline() {
    const transcriptEl = document.getElementById('voice-triage-transcript');
    const transcript = (transcriptEl && transcriptEl.value || '').trim();
    if (!transcript) {
      setStatus('Enter or record a presentation first.', true);
      return;
    }

    const assessBtn = document.getElementById('voice-triage-assess-btn');
    if (assessBtn) assessBtn.disabled = true;
    setStatus('Assessing disposition…');

    try {
      const assessment = await assessTranscript(transcript);
      renderAssessment(assessment, transcript);
      setStatus('Assessment complete.');
    } catch (e) {
      setStatus(e.message || 'Assessment failed. Deploy to Vercel with PATHREADY_API_KEY set.', true);
    } finally {
      if (assessBtn) assessBtn.disabled = false;
    }
  }

  async function stopRecording() {
    const micBtn = document.getElementById('voice-triage-mic-btn');
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

    return new Promise((resolve) => {
      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunks, { type: mimeType });
        audioChunks = [];
        mediaRecorder = null;
        if (micBtn) {
          micBtn.classList.remove('recording');
          micBtn.textContent = '🎤 Hold to describe presentation';
        }

        if (blob.size < 500) {
          setStatus('Recording too short. Try again.', true);
          resolve();
          return;
        }

        setStatus('Transcribing…');
        try {
          const transcript = await transcribeBlob(blob, mimeType);
          const transcriptEl = document.getElementById('voice-triage-transcript');
          if (transcriptEl) transcriptEl.value = transcript;
          setStatus(transcript ? 'Transcribed. Review and assess.' : 'No speech detected.', !transcript);
          if (transcript) await runPipeline();
        } catch (e) {
          setStatus(e.message || 'Transcription failed.', true);
        }
        resolve();
      };
      mediaRecorder.stop();
    });
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      const options = MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : {};
      mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.start();
      const micBtn = document.getElementById('voice-triage-mic-btn');
      if (micBtn) {
        micBtn.classList.add('recording');
        micBtn.textContent = '⏹ Release to stop';
      }
      setStatus('Recording… describe symptoms and red flags.');
    } catch (e) {
      setStatus('Microphone access denied or unavailable.', true);
    }
  }

  function wireMicButton() {
    const micBtn = document.getElementById('voice-triage-mic-btn');
    if (!micBtn) return;

    const start = (e) => {
      e.preventDefault();
      if (mediaRecorder && mediaRecorder.state === 'recording') return;
      startRecording();
    };
    const stop = (e) => {
      e.preventDefault();
      stopRecording();
    };

    micBtn.addEventListener('mousedown', start);
    micBtn.addEventListener('mouseup', stop);
    micBtn.addEventListener('mouseleave', () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') stopRecording();
    });
    micBtn.addEventListener('touchstart', start, { passive: false });
    micBtn.addEventListener('touchend', stop, { passive: false });
  }

  function initVoiceTriage() {
    loadSymptomMap();
    wireMicButton();

    const assessBtn = document.getElementById('voice-triage-assess-btn');
    if (assessBtn && !assessBtn.dataset.wired) {
      assessBtn.dataset.wired = '1';
      assessBtn.addEventListener('click', () => runPipeline());
    }
  }

  window.initVoiceTriage = initVoiceTriage;
  window.openDecisionToolsSearch = openDecisionToolsSearch;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVoiceTriage);
  } else {
    initVoiceTriage();
  }
})();
