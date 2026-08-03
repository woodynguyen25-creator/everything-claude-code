// dashboard/scripts/loops/lib/router.js
//
// Multi-provider LLM routing skeleton for Woody's Realm loops.
// Routes per-role to the right free/cheap model with automatic fallback chain.
//
// Status: SKELETON. API client functions are stubbed and log warnings until keys are wired.
// Fill in the API keys in dashboard/.env.local, then this file's functions become live.
//
// Usage:
//   const { route } = require('./lib/router');
//   const result = await route('bulkExecutor', { prompt: 'summarize this', system: '...' });

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// -----------------------------------------------------------------------------
// Load environment variables from .env.local
// -----------------------------------------------------------------------------

function loadEnv() {
  const envPath = path.resolve(__dirname, '../../../.env.local');
  if (!fs.existsSync(envPath)) {
    console.warn('[router] .env.local not found — using process.env only');
    return;
  }
  const raw = fs.readFileSync(envPath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...rest] = trimmed.split('=');
    const value = rest.join('=').trim();
    if (key && value && !process.env[key.trim()]) {
      process.env[key.trim()] = value;
    }
  });
}
loadEnv();

// -----------------------------------------------------------------------------
// The fallback chains per role (locked in LOOP-LIBRARY.md)
// -----------------------------------------------------------------------------

const CHAINS = {
  // Heavy reasoning: Qwen 3 235B first, GPT-OSS 120B fallback (Cerebras tier-1 free)
  // DeepSeek removed from primary chain — their free trial requires top-up to start (2026 change).
  // Can be re-added later if Woody decides to pay; key support remains in callDeepSeek().
  bulkExecutor: ['cerebras', 'cerebrasMid', 'groq', 'gemini', 'ollama'],
  // Low-latency: Cerebras Llama 8B sub-200ms; Groq Llama 70B sub-100ms first-token
  fastExecutor: ['cerebrasFast', 'groq', 'gemini', 'ollama'],
  // Code: no DeepSeek free tier, so route to Cerebras GPT-OSS-120B (strong code) or local Ollama coder
  codeGeneration: ['cerebrasMid', 'cerebras', 'ollamaCoder'],
  triage: ['haiku', 'cerebrasFast', 'groqGemma', 'ollamaSmall'],
  critic: ['sonnet', 'cerebras', 'groqLlama', 'gpt55'],
  multimodal: ['gemini'], // no fallback — fail loud
  planner: ['opus', 'sonnet'],
  longContext: ['cerebras', 'cerebrasMid', 'geminiPro'],
  thinker: ['cerebrasFast', 'groqGemma', 'gemini'],
  paidWorker: ['deepseek', 'codex', 'cerebrasMid', 'groqLlama'],
  freeWorker: ['cerebras', 'groq', 'gemini', 'ollama'],
};

// Default model per provider for each role.
// Cerebras free-tier model IDs (verified 2026-05-18 via /v1/models):
//   qwen-3-235b-a22b-instruct-2507  - 235B MoE, top-tier reasoning, sometimes 429 under load
//   gpt-oss-120b                    - OpenAI's open 120B, solid all-around
//   zai-glm-4.7                     - ZAI GLM 4.7
//   llama3.1-8b                     - Fastest, sub-200ms, good for high-frequency tasks
const MODEL_MAP = {
  cerebras: 'qwen-3-235b-a22b-instruct-2507',  // primary — heavy reasoning
  cerebrasFast: 'llama3.1-8b',                 // when latency matters more than depth
  cerebrasMid: 'gpt-oss-120b',                 // fallback when Qwen-235B is 429
  groq: 'llama-3.3-70b-versatile',
  groqGemma: 'gemma2-9b-it',
  groqLlama: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-chat',
  deepseekReasoner: 'deepseek-reasoner',
  codex: 'gpt-5.4',
  ollamaCoder: 'deepseek-coder-v2:16b',
  // 2026-08-02: key rotated to a fresh AI-Studio project (prior project was
  // SUSPENDED — 403 on every model). Moved off 3.6-flash, which flapped 403 on
  // 1 of 3 back-to-back calls even on the healthy key; 3.5-flash went 3/3.
  gemini: 'gemini-3.5-flash',
  // geminiPro is UNUSABLE on this tier: every pro id (3.1-pro, 3-pro, 2.5-pro)
  // returns 429 RESOURCE_EXHAUSTED. The Google AI-Pro consumer sub grants NO
  // API quota — that is a separate wallet from the AI-Studio/Cloud key.
  // Routing anything here is a guaranteed failure, so it falls back to flash.
  // REVISIT-IF: Cloud billing is linked to the new project.
  geminiPro: 'gemini-3.5-flash',
  ollama: 'qwen2.5:7b',          // confirmed installed on Woody's machine 2026-05-18
  ollamaSmall: 'llama3.2:3b',    // confirmed installed
  ollamaTiny: 'llama3.2:1b',     // confirmed installed
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-7',
  gpt55: 'gpt-5.5',
};

// -----------------------------------------------------------------------------
// Provider clients (skeletons — replace with real SDK calls once keys are wired)
// -----------------------------------------------------------------------------

async function callGroq({ model, system, prompt, maxTokens = 2000 }) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.warn('[router] GROQ_API_KEY missing — returning stub');
    return { ok: false, provider: 'groq', error: 'no_key', stub: true };
  }
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw new Error(`groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { ok: true, provider: 'groq', model, text: data.choices[0].message.content, usage: data.usage };
}

async function callCerebras({ model, system, prompt, maxTokens = 2000 }) {
  const key = process.env.CEREBRAS_API_KEY;
  if (!key) {
    console.warn('[router] CEREBRAS_API_KEY missing — returning stub');
    return { ok: false, provider: 'cerebras', error: 'no_key', stub: true };
  }
  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw new Error(`cerebras ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { ok: true, provider: 'cerebras', model, text: data.choices[0].message.content, usage: data.usage };
}

async function callGemini({ model, system, prompt, maxTokens = 2000 }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.warn('[router] GEMINI_API_KEY missing — returning stub');
    return { ok: false, provider: 'gemini', error: 'no_key', stub: true };
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return { ok: true, provider: 'gemini', model, text };
}

async function callDeepSeek({ model, system, prompt, maxTokens = 2000 }) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    console.warn('[router] DEEPSEEK_API_KEY missing — returning stub');
    return { ok: false, provider: 'deepseek', error: 'no_key', stub: true };
  }
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw new Error(`deepseek ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { ok: true, provider: 'deepseek', model, text: data.choices[0].message.content, usage: data.usage };
}

async function callCodex({ model, system, prompt }) {
  const authPath = path.join(os.homedir(), '.codex', 'auth.json');
  if (!fs.existsSync(authPath)) {
    console.warn('[router] Codex auth missing — returning stub');
    return { ok: false, provider: 'codex', error: 'auth_missing', stub: true };
  }

  const codexCmd = path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'npm', 'codex.cmd');
  const executable = fs.existsSync(codexCmd) ? codexCmd : 'codex';
  const outputFile = path.join(os.tmpdir(), `codex-exec-${Date.now()}.txt`);
  const compositePrompt = `${system ? `${system}\n\n` : ''}${prompt}\n\nRespond with the answer only. Do not run tools unless truly required.`;
  const command = `"${executable}" exec --skip-git-repo-check --output-last-message "${outputFile}" --dangerously-bypass-approvals-and-sandbox --cd "${path.resolve(__dirname, '../../..')}" --model ${model} "${compositePrompt.replace(/"/g, '\\"')}"`;
  const result = spawnSync(command, {
    shell: true,
    encoding: 'utf8',
    timeout: 240000,
  });

  let text = '';
  try {
    text = fs.readFileSync(outputFile, 'utf8').trim();
  } catch {
    text = (result.stdout || '').trim();
  }
  if (text) {
    return { ok: true, provider: 'codex', model, text };
  }
  if (result.error) {
    return {
      ok: false,
      provider: 'codex',
      error: result.error.message,
      stub: true,
    };
  }
  if (result.status !== 0 && result.status !== null) {
    return {
      ok: false,
      provider: 'codex',
      error: result.stderr || result.stdout || `codex exited ${result.status}`,
      stub: true,
    };
  }
  return {
    ok: false,
    provider: 'codex',
    error: 'codex returned no output',
    stub: true,
  };
}

async function callOllama({ model, system, prompt, maxTokens = 2000 }) {
  const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
  try {
    const res = await fetch(`${host}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        system,
        stream: false,
        options: { num_predict: maxTokens },
      }),
    });
    if (!res.ok) throw new Error(`ollama ${res.status}`);
    const data = await res.json();
    return { ok: true, provider: 'ollama', model, text: data.response };
  } catch (err) {
    console.warn(`[router] ollama unreachable at ${host} — stub`);
    return { ok: false, provider: 'ollama', error: 'unreachable', stub: true };
  }
}

async function callClaude({ model, system, prompt, maxTokens = 2000 }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.warn('[router] ANTHROPIC_API_KEY missing — claude direct API unavailable');
    console.warn('         (Claude Max users typically use the chat UI, not the API.)');
    return { ok: false, provider: 'claude', error: 'no_key', stub: true };
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`claude ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { ok: true, provider: 'claude', model, text: data.content[0].text, usage: data.usage };
}

// -----------------------------------------------------------------------------
// Provider dispatch
// -----------------------------------------------------------------------------

const PROVIDER_CALLS = {
  groq: callGroq,
  groqGemma: callGroq,
  groqLlama: callGroq,
  cerebras: callCerebras,
  gemini: callGemini,
  geminiPro: callGemini,
  deepseek: callDeepSeek,
  deepseekReasoner: callDeepSeek,
  codex: callCodex,
  ollama: callOllama,
  ollamaCoder: callOllama,
  ollamaSmall: callOllama,
  haiku: callClaude,
  sonnet: callClaude,
  opus: callClaude,
  gpt55: () => {
    console.warn('[router] gpt-5.5 direct call not wired — manual escalation only');
    return Promise.resolve({ ok: false, provider: 'gpt55', error: 'not_wired', stub: true });
  },
};

// -----------------------------------------------------------------------------
// Main router — fallback chain per role
// -----------------------------------------------------------------------------

async function route(role, { system, prompt, maxTokens = 2000 } = {}) {
  const chain = CHAINS[role];
  if (!chain) throw new Error(`unknown role: ${role}`);

  const failures = [];
  for (const provider of chain) {
    const callFn = PROVIDER_CALLS[provider];
    const model = MODEL_MAP[provider];
    if (!callFn || !model) {
      failures.push({ provider, error: 'unknown_provider' });
      continue;
    }
    try {
      const result = await callFn({ model, system, prompt, maxTokens });
      if (result.ok) {
        if (failures.length > 0) {
          console.info(`[router:${role}] degraded to ${provider} after ${failures.length} failure(s)`);
        }
        return result;
      }
      failures.push({ provider, error: result.error });
    } catch (err) {
      failures.push({ provider, error: err.message });
    }
  }

  throw new Error(`[router:${role}] all fallbacks failed: ${JSON.stringify(failures)}`);
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

module.exports = {
  route,
  CHAINS,
  MODEL_MAP,
  // Direct provider access (for testing or specific calls)
  callGroq,
  callCerebras,
  callGemini,
  callDeepSeek,
  callOllama,
  callClaude,
  callCodex,
};
