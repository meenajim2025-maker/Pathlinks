const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(process.cwd(), 'config', 'ai-gateways.json');

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function getApiKey() {
  const key = process.env.PATHREADY_API_KEY;
  if (!key) throw new Error('PATHREADY_API_KEY is not configured');
  return key;
}

function bearerHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    'User-Agent': 'PathLinks/1.0',
    ...extra,
  };
}

function getLlmById(id) {
  const cfg = loadConfig();
  const model = cfg.llm.find((m) => m.id === id);
  if (!model) throw new Error(`Unknown LLM: ${id}`);
  return model;
}

module.exports = { loadConfig, getApiKey, bearerHeaders, getLlmById };
