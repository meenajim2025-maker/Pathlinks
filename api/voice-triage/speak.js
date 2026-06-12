const { loadConfig, bearerHeaders } = require('../_lib/gateway');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { text, voice } = body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    const cfg = loadConfig();
    const tts = cfg.speech.tts;
    const url = tts.endpoints.singleShot.url;

    const upstream = await fetch(url, {
      method: 'POST',
      headers: bearerHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        model: tts.model,
        input: String(text).trim(),
        voice: voice || tts.defaultVoice,
        chunk_size: tts.defaultChunkSize,
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      return res.status(upstream.status).json({ error: 'TTS failed', detail });
    }

    const contentType = upstream.headers.get('content-type') || 'audio/wav';
    const arrayBuffer = await upstream.arrayBuffer();
    const audioBase64 = Buffer.from(arrayBuffer).toString('base64');

    return res.status(200).json({
      audioBase64,
      mimeType: contentType.split(';')[0].trim(),
    });
  } catch (err) {
    console.error('voice-triage/speak', err);
    return res.status(500).json({ error: err.message || 'TTS error' });
  }
};
