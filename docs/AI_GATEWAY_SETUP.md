# AI Gateway setup (PathReady & Siby)

Unified LLM and Speech APIs for local scripts and future app features.

## Authentication

All gateways use one Bearer token:

| Variable | Description |
|----------|-------------|
| `PATHREADY_API_KEY` | Unified API key for all endpoints |

**Local:** Copy `.env.example` to `.env` and set your key (`.env` is gitignored).

**Vercel / CI:** Set `PATHREADY_API_KEY` in the project environment variables (Dashboard → Settings → Environment Variables). Do not commit keys to the repo.

## Config (no secrets)

| File | Purpose |
|------|---------|
| `config/ai-gateways.json` | Endpoints, model tags, context limits (committed) |
| `.env` | `PATHREADY_API_KEY` only (local, not committed) |
| `scripts/ai-gateway.js` | Node helper: load config + key, call LLM/STT/TTS |

## Gateways

| Gateway | Base URL | Services |
|---------|----------|----------|
| **PathReady** | `https://api1.pathready.uk` | Gemma 4 MoE (vLLM), Ollama small models, ASR, TTS |
| **Siby** | `https://api1.siby.top` | Qwen 14B, Mistral 24B (vLLM) |

## LLM model IDs (for `scripts/ai-gateway.js`)

| ID | Model | Format |
|----|-------|--------|
| `gemma-4-moe` | Gemma 4 MoE 26B | OpenAI |
| `mistral-small-24b` | Mistral Small 24B | OpenAI |
| `qwen-2.5-14b` | Qwen 2.5 14B | OpenAI |
| `gemma-3-4b` | Gemma 3 4B | Ollama |
| `qwen-2.5-3b` | Qwen 2.5 3B | Ollama |
| `deepseek-r1-1.5b` | DeepSeek R1 1.5B | Ollama |

## Node usage

```javascript
const { chatOpenAI, chatOllama, loadConfig } = require('./scripts/ai-gateway');

// vLLM (OpenAI format)
const out = await chatOpenAI('qwen-2.5-14b', [
  { role: 'system', content: 'You are a clinical assistant.' },
  { role: 'user', content: 'Draft a brief triage note for fever in a child.' },
], { temperature: 0.3, max_tokens: 512 });

// Ollama format
const ollama = await chatOllama('qwen-2.5-3b', [
  { role: 'user', content: 'Patient reports fever' },
], { stream: false });
```

## Voice triage (web app)

The **Voice triage** tab uses serverless routes (no key in the browser):

| Route | Purpose |
|-------|---------|
| `POST /api/voice-triage/transcribe` | STT — JSON `{ audioBase64, mimeType }` |
| `POST /api/voice-triage/assess` | LLM disposition — JSON `{ transcript }` |
| `POST /api/voice-triage/speak` | TTS — JSON `{ text, voice? }` |

**Vercel:** Add `PATHREADY_API_KEY` in Project → Settings → Environment Variables (Production, Preview, Development), then redeploy.

**Local:** `vercel dev` from repo root (reads `.env`).

## Browser / static app

Do **not** embed `PATHREADY_API_KEY` in client-side JavaScript. Voice triage uses the serverless proxy above.

## Speech

- **STT:** `POST` multipart to `.../trio-asr/v1/audio/transcriptions` with `file` and `model=Qwen/Qwen3-ASR-1.7B`
- **TTS (recommended):** `POST` JSON to `.../trio-tts/v1/audio/speech/pcm-stream` with `input`, `voice` (e.g. `serena`), `chunk_size`

See `config/ai-gateways.json` for full URLs.
