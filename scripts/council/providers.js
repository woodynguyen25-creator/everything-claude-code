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
function runCodex(prompt, { timeoutMs = 900_000 } = {}) {
  const started = Date.now();
  return new Promise(resolve => {
    const done = (ok, text, error) =>
      resolve({ provider: 'codex', model: 'gpt-5.6-sol', ok, text, ms: Date.now() - started, error });
    // Fixed args + shell:true (Windows .cmd shim); user prompt only ever flows via stdin.
    // NOTE: 'gpt-5.5-codex' 400s on ChatGPT-account codex; plain 'gpt-5.6-sol' is the valid id.
    // Pin effort=high explicitly so the council seat stays fast + predictable regardless of
    // whatever ~/.codex/config.toml drifts to (it had crept to 'xhigh' = the timeout cause, 2026-07-26).
    const child = spawn('codex', ['exec', '--skip-git-repo-check', '--model', 'gpt-5.6-sol', '-c', 'model_reasoning_effort=high', '-'], {
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

/**
 * Gemini REST. Gemini 3.x replaced thinkingBudget with thinkingLevel — 'minimal'
 * keeps the old thinking-token-truncation fix (2026-05-29).
 *
 * 2026-08-02 — key rotated to a fresh AI-Studio project (the prior project was
 * SUSPENDED: 403 "your project has been denied access", which is what drove the
 * seat's 44% lifetime failure rate alongside 429s). Model default moved
 * 3.6-flash → 3.5-flash on measured stability: over 3 back-to-back calls,
 * 3.5-flash went 3/3 while 3.6-flash and flash-latest each flapped 403 mid-run.
 *
 * Free tier reaches FLASH ONLY. Every pro id (3.1-pro, 3-pro, 2.5-pro) returns
 * 429 RESOURCE_EXHAUSTED — the AI-Pro consumer sub grants no API quota; that is
 * a separate wallet. REVISIT-IF: Cloud billing is linked to this project — then
 * gemini-3.1-pro-preview becomes viable and the seat can move to the lead tier.
 */
async function runGemini(prompt, env, { timeoutMs = 120_000, model = 'gemini-3.5-flash' } = {}) {
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
          generationConfig: { maxOutputTokens: 4096, thinkingConfig: { thinkingLevel: 'minimal' } },
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

/**
 * Gemini 3 Pro via the Antigravity CLI (`agy`) on Woody's Google AI-Pro sub —
 * OAuth, not the API key (pro models are quota-0 on the key). Same pattern as
 * the codex seat: sub-metered instead of per-token.
 *
 * 2026-07-27: replaced the `gemini` CLI, which Google cut off for ALL individual
 * accounts on 2026-06-18 (IneligibleTierError → "migrate to the Antigravity
 * suite"). Requires a ONE-TIME interactive `agy` login (creds in ~/.antigravity).
 * REVISIT-IF: Google ships a headless auth path (service account / device code).
 */
const AGY_BIN = path.join(
  process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local'),
  'agy', 'bin', 'agy.exe',
);

function runGeminiCli(prompt, { timeoutMs = 300_000, model = '', effort = '' } = {}) {
  const started = Date.now();
  const label = model || 'gemini-3-pro (agy)';
  return new Promise(resolve => {
    const done = (ok, text, error) =>
      resolve({ provider: 'geminipro', model: label, ok, text, ms: Date.now() - started, error });
    // --print = non-interactive single prompt; prompt still goes via stdin to
    // dodge Windows arg-quoting (same reason as the codex seat).
    const cliArgs = ['--print', '--output-format', 'text'];
    if (model) cliArgs.push('--model', model);
    if (effort) cliArgs.push('--effort', effort);
    const bin = fs.existsSync(AGY_BIN) ? `"${AGY_BIN}"` : 'agy';
    const child = spawn(bin, cliArgs, {
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
      if (code === 0) done(true, stripAnsi(out).trim());
      else done(false, '', `exit ${code}: ${stripAnsi(err).slice(0, 300)}`);
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/**
 * Claude (Opus 5 / Fable 5) via the Claude Code CLI on Woody's Anthropic sub —
 * sub-metered like the codex seat, not per-token. Added 2026-08-02 to give the
 * lead tier a frontier seat that isn't Sol (codex fails 22% and averages 182s).
 *
 * Verified 2026-08-02: `claude -p --model claude-opus-5` with the prompt on
 * stdin returns in ~8s, exit 0. Spawned with shell:false and an args array —
 * unlike the codex/agy seats, this avoids Windows arg-quoting entirely and
 * dodges the DEP0190 shell-injection deprecation warning.
 */
const CLAUDE_BIN = path.join(process.env.USERPROFILE || '', '.local', 'bin', 'claude.exe');

function runClaude(prompt, { timeoutMs = 300_000, model = 'claude-opus-5' } = {}) {
  const started = Date.now();
  return new Promise(resolve => {
    const done = (ok, text, error) =>
      resolve({ provider: 'claude', model, ok, text, ms: Date.now() - started, error });
    const bin = fs.existsSync(CLAUDE_BIN) ? CLAUDE_BIN : 'claude';
    const child = spawn(bin, ['-p', '--model', model], { shell: false, windowsHide: true });
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
      if (code === 0) done(true, stripAnsi(out).trim());
      else done(false, '', `exit ${code}: ${stripAnsi(err).slice(0, 300)}`);
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
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
  claude: (prompt, env, opts) => runClaude(prompt, opts),
  codex: (prompt, env, opts) => runCodex(prompt, opts),
  gemini: (prompt, env, opts) => runGemini(prompt, env, opts),
  // geminipro is 0-for-3 lifetime — `agy` refuses every account tried
  // ("not eligible for Antigravity"), and the gemini CLI is cut off for all
  // individuals since 2026-06-18. Kept callable via --to, but OUT of every
  // roster. REVISIT-IF: an `agy` login clears identity verification.
  geminipro: (prompt, env, opts) => runGeminiCli(prompt, opts),
  deepseek: (prompt, env, opts) =>
    runOpenAiCompat('deepseek', 'https://api.deepseek.com', 'DEEPSEEK_API_KEY', 'deepseek-chat', prompt, env, opts),
  cerebras: (prompt, env, opts) =>
    runOpenAiCompat('cerebras', 'https://api.cerebras.ai/v1', 'CEREBRAS_API_KEY', 'gpt-oss-120b', prompt, env, opts),
  groq: (prompt, env, opts) =>
    runOpenAiCompat('groq', 'https://api.groq.com/openai/v1', 'GROQ_API_KEY', 'llama-3.3-70b-versatile', prompt, env, opts),
  // xAI Grok 4.5 — 500k ctx, $2.00/$6.00 per M (the priciest seat; economical
  // ONLY while xAI's data-sharing free credits are active). Seat id is 'xai',
  // not 'grok', to keep it one typo away from 'groq' (a different vendor).
  xai: (prompt, env, opts) =>
    runOpenAiCompat('xai', 'https://api.x.ai/v1', 'XAI_API_KEY', 'grok-4.5', prompt, env, opts),
  grok: (prompt, env, opts) =>
    runOpenAiCompat('xai', 'https://api.x.ai/v1', 'XAI_API_KEY', 'grok-4.5', prompt, env, opts),
};

module.exports = { loadEnv, parseCodexOutput, stripAnsi, SEATS };
