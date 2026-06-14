const { loadConfig, bearerHeaders } = require('../_lib/gateway');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { audioBase64, mimeType = 'audio/webm' } = body || {};
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    const buffer = Buffer.from(audioBase64, 'base64');
    const cfg = loadConfig();
    const stt = cfg.speech.stt;

    // Name the upload to match the actual container so the ASR model decodes it
    // correctly across browsers (Chrome/Firefox send webm/ogg, Safari sends mp4/m4a).
    const ext = (() => {
      const m = String(mimeType || '').toLowerCase();
      if (m.includes('mp4')) return 'mp4';
      if (m.includes('m4a') || m.includes('x-m4a') || m.includes('aac')) return 'm4a';
      if (m.includes('ogg')) return 'ogg';
      if (m.includes('wav')) return 'wav';
      if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
      return 'webm';
    })();

    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimeType }), `recording.${ext}`);
    form.append('model', stt.model);

    const upstream = await fetch(stt.endpoint, {
      method: 'POST',
      headers: bearerHeaders(),
      body: form,
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Transcription failed', detail: text });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { text };
    }

    const transcript = (data.text || data.transcript || '').trim();
    return res.status(200).json({ transcript, raw: data });
  } catch (err) {
    console.error('voice-triage/transcribe', err);
    return res.status(500).json({ error: err.message || 'Transcription error' });
  }
};
