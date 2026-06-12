/**
 * PathReady / Siby gateway client helpers.
 * API key: set PATHREADY_API_KEY in .env (local) or environment (Vercel/server).
 * Config: config/ai-gateways.json (endpoints only — no secrets).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config', 'ai-gateways.json');

function loadEnvFile() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

function getApiKey() {
  loadEnvFile();
  const key = process.env.PATHREADY_API_KEY;
  if (!key) {
    throw new Error(
      'PATHREADY_API_KEY not set. Copy .env.example to .env or export PATHREADY_API_KEY.'
    );
  }
  return key;
}

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
  };
}

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function getLlmById(id) {
  const cfg = loadConfig();
  const model = cfg.llm.find((m) => m.id === id);
  if (!model) throw new Error(`Unknown LLM id: ${id}. Available: ${cfg.llm.map((m) => m.id).join(', ')}`);
  return model;
}

/** OpenAI-style chat completion (vLLM: Gemma 4, Qwen 14B, Mistral 24B). */
async function chatOpenAI(modelId, messages, options = {}) {
  const model = getLlmById(modelId);
  if (model.format !== 'openai') {
    throw new Error(`${modelId} uses Ollama format; use chatOllama() instead.`);
  }
  const body = {
    model: model.model,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.max_tokens ?? 512,
    stream: options.stream ?? false,
  };
  const res = await fetch(model.endpoint, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM ${modelId} ${res.status}: ${text}`);
  }
  return res.json();
}

/** Ollama-style chat (Gemma 3 4B, Qwen 3B, DeepSeek R1). */
async function chatOllama(modelId, messages, options = {}) {
  const model = getLlmById(modelId);
  if (model.format !== 'ollama') {
    throw new Error(`${modelId} uses OpenAI format; use chatOpenAI() instead.`);
  }
  const body = {
    model: model.model,
    messages,
    stream: options.stream ?? false,
    options: {
      num_ctx: options.num_ctx ?? model.contextLimit,
    },
  };
  const res = await fetch(model.endpoint, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM ${modelId} ${res.status}: ${text}`);
  }
  return res.json();
}

/** Speech-to-text: multipart file upload. filePath = local audio file. */
async function transcribeAudio(filePath, options = {}) {
  const cfg = loadConfig();
  const stt = cfg.speech.stt;
  const FormData = globalThis.FormData;
  const Blob = globalThis.Blob;
  if (!FormData || !Blob) {
    throw new Error('transcribeAudio requires FormData (Node 18+ or browser).');
  }
  const buf = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([buf]), path.basename(filePath));
  form.append('model', options.model || stt.model);

  const headers = { Authorization: `Bearer ${getApiKey()}` };
  const res = await fetch(stt.endpoint, { method: 'POST', headers, body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`STT ${res.status}: ${text}`);
  }
  return res.json();
}

/** TTS single-shot (non-streaming). */
async function synthesizeSpeech(input, options = {}) {
  const cfg = loadConfig();
  const tts = cfg.speech.tts;
  const url = options.stream
    ? tts.endpoints.stream.url
    : tts.endpoints.singleShot.url;
  const body = {
    model: tts.model,
    input,
    voice: options.voice ?? tts.defaultVoice,
    chunk_size: options.chunk_size ?? tts.defaultChunkSize,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TTS ${res.status}: ${text}`);
  }
  return res;
}

module.exports = {
  loadConfig,
  getApiKey,
  getAuthHeaders,
  getLlmById,
  chatOpenAI,
  chatOllama,
  transcribeAudio,
  synthesizeSpeech,
  CONFIG_PATH,
};
