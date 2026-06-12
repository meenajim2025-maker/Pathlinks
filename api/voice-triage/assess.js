const { getLlmById, bearerHeaders } = require('../_lib/gateway');

const TRIAGE_SYSTEM = `You are a UK GP telephone triage assistant (NICE, NHS 111, WHO IITT aligned).
Work through disposition in order; assign the FIRST that applies:

1. emergency_999 — Life-threatening: airway/breathing, circulation/shock/bleeding/chest pain, unconscious/GCS<15/seizure/stroke FAST, anaphylaxis, overdose, non-blanching rash (child), severe self-harm.
2. same_day — Cannot wait 24–48h: worsening symptoms, high fever, severe pain, dehydration, mental health crisis, head injury urgent criteria, first seizure, diabetic unwell, heavy bleeding, pregnancy bleeding, painful red eye.
3. routine_24_48h — Stable but needs assessment within 24–48h.
4. self_care — Mild symptoms; provide safety-net only.

Respond with ONLY valid JSON (no markdown):
{
  "disposition": "emergency_999|same_day|routine_24_48h|self_care",
  "dispositionLabel": "Emergency (999)|Same day / Urgent|24–48 h / Routine|Self-care + safety-net",
  "summary": "Brief clinical summary (1–2 sentences)",
  "redFlags": ["list any red flags mentioned or checked"],
  "safetyNet": "When to call 999 or reattend",
  "suggestedSearches": ["2–4 short phrases to find PathLinks triage tools, e.g. chest pain, breathlessness"]
}`;

function parseJsonFromLlm(content) {
  const raw = (content || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : raw;
  return JSON.parse(candidate);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { transcript, modelId = 'qwen-2.5-14b' } = body || {};
    if (!transcript || !String(transcript).trim()) {
      return res.status(400).json({ error: 'transcript is required' });
    }

    const model = getLlmById(modelId);
    if (model.format !== 'openai') {
      return res.status(400).json({ error: 'Voice triage assess requires an OpenAI-format model' });
    }

    const upstream = await fetch(model.endpoint, {
      method: 'POST',
      headers: bearerHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        model: model.model,
        messages: [
          { role: 'system', content: TRIAGE_SYSTEM },
          { role: 'user', content: `Caller/patient reports:\n\n${String(transcript).trim()}` },
        ],
        temperature: 0.2,
        max_tokens: 600,
      }),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Triage assessment failed', detail: text });
    }

    const completion = JSON.parse(text);
    const content = completion.choices?.[0]?.message?.content || '';
    let assessment;
    try {
      assessment = parseJsonFromLlm(content);
    } catch {
      return res.status(502).json({
        error: 'Could not parse triage response',
        raw: content,
      });
    }

    return res.status(200).json({ assessment, model: model.id });
  } catch (err) {
    console.error('voice-triage/assess', err);
    return res.status(500).json({ error: err.message || 'Assessment error' });
  }
};
