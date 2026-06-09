/**
 * Council providers — one runner per paid/free AI seat.
 * All runners return { provider, model, ok, text, ms, error }.
 * Zero deps: Node 18+ fetch + child_process.
 */
'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ENV_FILE = path.join(REPO_ROOT, 'dashboard', '.env.local');

/** Parse KEY=VALUE lines from dashboard/.env.local, overlaid on process.env. */
function loadEnv() {
  const env = { ...process.env };
  try {
    const raw = fs.readFileSync(ENV_FILE, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !line.startsWith('#')) {
        env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  } catch (err) {
    process.stderr.write(`[council] no dashboard/.env.local (${err.code}); using process.env only\n`);
  }
  return env;
}

function stripAnsi(text) {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\[[0-9;]*m/g, '');
}

/** Extract the final agent message from codex exec stdout (after the last "tokens used" line). */
function parseCodexOutput(stdout) {
  const clean = stripAnsi(stdout);
  const lines = clean.split(/\r?\n/);
  let lastTokensIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^tokens used/i.test(lines[i].trim())) lastTokensIdx = i;
  }
  if (lastTokensIdx >= 0) {
    const tail = lines
      .slice(lastTokensIdx + 1)
      .filter(l => !/^[\d,]+$/.test(l.trim())) // drop the token-count line itself
      .join('\n')
      .trim();
    if (tail) return tail;
  }
  return clean.trim();
}

/** GPT-5.5 via local codex CLI; prompt over stdin to avoid Windows quoting issues. */
function runCodex(prompt, { timeoutMs = 240_000 } = {}) {
  const started = Date.now();
  return new Promise(resolve => {
    const done = (ok, text, error) =>
      resolve({ provider: 'codex', model: 'gpt-5.5', ok, text, ms: Date.now() - started, error });
    // Fixed args + shell:true (Windows .cmd shim); user prompt only ever flows via stdin.
    // NOTE: 'gpt-5.5-codex' 400s on ChatGPT-account codex; plain 'gpt-5.5' is the valid id.
    const child = spawn('codex', ['exec', '--skip-git-repo-check', '--model', 'gpt-5.5', '-'], {
      shell: true,
      windowsHide: true,
    });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill();
      done(false, '', `timeout after ${timeoutMs}ms`);
    }, timeoutMs);
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.on('error', e => { clearTimeout(timer); done(false, '', e.message); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0) done(true, parseCodexOutput(out));
      else done(false, '', `exit ${code}: ${stripAnsi(err).slice(0, 300)}`);
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/** Gemini REST (thinkingBudget 0 — thinking-token truncation fix, learned 2026-05-29). */
async function runGemini(prompt, env, { timeoutMs = 120_000, model = 'gemini-2.5-flash' } = {}) {
  const started = Date.now();
  const key = env.GEMINI_API_KEY;
  if (!key) return { provider: 'gemini', model, ok: false, text: '', ms: 0, error: 'GEMINI_API_KEY missing' };
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4096, thinkingConfig: { thinkingBudget: 0 } },
        }),
      },
    );
    if (!res.ok) return { provider: 'gemini', model, ok: false, text: '', ms: Date.now() - started, error: `HTTP ${res.status}` };
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return { provider: 'gemini', model, ok: Boolean(text), text, ms: Date.now() - started, error: text ? undefined : 'empty response' };
  } catch (e) {
    return { provider: 'gemini', model, ok: false, text: '', ms: Date.now() - started, error: e.message };
  }
}

/** Shared OpenAI-compatible chat runner (DeepSeek, Cerebras, Groq). */
async function runOpenAiCompat(provider, baseUrl, keyName, model, prompt, env, { timeoutMs = 120_000 } = {}) {
  const started = Date.now();
  const key = env[keyName];
  if (!key) return { provider, model, ok: false, text: '', ms: 0, error: `${keyName} missing` };
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 4096 }),
    });
    if (!res.ok) return { provider, model, ok: false, text: '', ms: Date.now() - started, error: `HTTP ${res.status}` };
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    return { provider, model, ok: Boolean(text), text, ms: Date.now() - started, error: text ? undefined : 'empty response' };
  } catch (e) {
    return { provider, model, ok: false, text: '', ms: Date.now() - started, error: e.message };
  }
}

const SEATS = {
  codex: (prompt, env, opts) => runCodex(prompt, opts),
  gemini: (prompt, env, opts) => runGemini(prompt, env, opts),
  deepseek: (prompt, env, opts) =>
    runOpenAiCompat('deepseek', 'https://api.deepseek.com', 'DEEPSEEK_API_KEY', 'deepseek-chat', prompt, env, opts),
  cerebras: (prompt, env, opts) =>
    runOpenAiCompat('cerebras', 'https://api.cerebras.ai/v1', 'CEREBRAS_API_KEY', 'gpt-oss-120b', prompt, env, opts),
  groq: (prompt, env, opts) =>
    runOpenAiCompat('groq', 'https://api.groq.com/openai/v1', 'GROQ_API_KEY', 'llama-3.3-70b-versatile', prompt, env, opts),
};

module.exports = { loadEnv, parseCodexOutput, stripAnsi, SEATS };
