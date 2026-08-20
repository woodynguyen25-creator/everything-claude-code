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
function runCodex(prompt, { timeoutMs = 900_000, effort = 'high' } = {}) {
  const started = Date.now();
  return new Promise(resolve => {
    const done = (ok, text, error) =>
      resolve({ provider: 'codex', model: 'gpt-5.6-sol', ok, text, ms: Date.now() - started, error });
    // Fixed args + shell:true (Windows .cmd shim); user prompt only ever flows via stdin.
    // NOTE: 'gpt-5.5-codex' 400s on ChatGPT-account codex; plain 'gpt-5.6-sol' is the valid id.
    // Pin effort=high explicitly so the council seat stays fast + predictable regardless of
    // whatever ~/.codex/config.toml drifts to (it had crept to 'xhigh' = the timeout cause, 2026-07-26).
    const child = spawn('codex', ['exec', '--skip-git-repo-check', '--model', 'gpt-5.6-sol', '-c', `model_reasoning_effort=${effort}`, '-'], {
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
async function runGemini(prompt, env, { timeoutMs = 120_000, model = 'gemini-3.6-flash' } = {}) {
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
 * Gemini 3.1 Pro via the Antigravity CLI (`agy`) — OAuth on Woody's Google sub,
 * NOT the API key. Same pattern as the codex seat: sub-metered, not per-token.
 *
 * ⭐ REVIVED 2026-08-20. This seat was written off as "0-for-3 lifetime — agy
 * refuses every account tried (not eligible for Antigravity)". Woody's STUDENT
 * Google AI Pro plan (1 year) made the account eligible and the seat now works.
 * Measured the same day: `Gemini 3.1 Pro (High)` answered in 17s, and a real
 * council-grade prompt (argue both sides + design a falsifiable test) came back
 * in 27s with a genuinely sharp answer. Promoted from DEAD to a live seat.
 *
 * IMPORTANT — the student plan did NOT unlock the API. Measured 2026-08-20 on
 * GEMINI_API_KEY: 3.6-flash 200, gemini-3.1-pro-preview **429**, and 3-pro /
 * 2.5-pro / 3.6-pro all **404**. The consumer sub and the API are still separate
 * wallets, exactly as the runGemini docblock says. Pro is reachable ONLY through
 * agy's OAuth path. Do not "fix" this by pointing the API seat at a Pro id.
 *
 * 2026-07-27: replaced the `gemini` CLI, which Google cut off for ALL individual
 * accounts on 2026-06-18 (IneligibleTierError → "migrate to the Antigravity
 * suite"). Requires a ONE-TIME interactive `agy` login (creds in ~/.antigravity).
 */
// ── agy model IDs ──────────────────────────────────────────────────────────
// Prefer the STABLE IDs over the display labels. A label bakes the effort tier
// into the name ("Gemini 3.1 Pro (High)") and is the more likely of the two to
// drift; both forms were verified working 2026-08-20. Full catalogue from
// `agy models`: gemini-3.7|3.6|3.5-flash-{high,medium,low},
// gemini-3.1-pro-{high,low}, claude-sonnet-4-6, claude-opus-4-6-thinking,
// gpt-oss-120b-medium.
const AGY_PRO   = 'gemini-3.1-pro-high';        // geminipro  — LEAD Google seat
const AGY_COLD  = 'claude-opus-4-6-thinking';   // agyopus    — free Opus-class labour
const AGY_FLASH = 'gemini-3.7-flash-high';      // agyflash   — free worker seat

const AGY_BIN = path.join(
  process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local'),
  'agy', 'bin', 'agy.exe',
);

/**
 * agy runs a NETWORK eligibility probe on every single invocation, so a
 * transient blip surfaces as:
 *   Error: Eligibility check failed: Get ".../oauth2/v2/userinfo": EOF
 * which is near-indistinguishable at a glance from a real entitlement refusal.
 * Reproduced 2026-08-20. Misreading that string is precisely what benched this
 * seat for three weeks, so classify it explicitly instead of eyeballing it:
 * a REAL refusal names the account/verification, a TRANSIENT one carries a
 * network verb. Transient => retry once; refusal => fail loudly, never retry.
 */
function isTransientAgyError(msg = '') {
  if (/not eligible|VALIDATION_REQUIRED|Verify your account|PERMISSION_DENIED/i.test(msg)) return false;
  return /EOF|context canceled|connection reset|i\/o timeout|deadline exceeded|TLS|dial tcp|no such host|temporarily/i.test(msg);
}

/**
 * Generic Antigravity (`agy`) seat runner — OAuth on Woody's Google plan, NOT
 * the API key. Sub-metered like the codex seat, not per-token.
 *
 * ⭐ REVIVED 2026-08-20 by the STUDENT Google AI Pro plan (1 year). This path
 * was written off as "0-for-3 lifetime — agy refuses every account tried".
 * The reason it works now is NOT a better credential dance: the entitlement
 * moved onto `woodynguyen25@gmail.com`, Woody's own long-verified identity,
 * instead of the GIFTED account Google's abuse system was holding back. The
 * old diagnosis was right — the fix was an identity Google already trusts.
 *
 * IMPORTANT — the student plan did NOT unlock the API. Measured 2026-08-20 on
 * GEMINI_API_KEY: 3.6-flash 200, gemini-3.1-pro-preview 429, and 3-pro /
 * 2.5-pro / 3.6-pro all 404. The consumer sub and the API remain separate
 * wallets. Pro is reachable ONLY through agy's OAuth path — do NOT "fix" the
 * API seat by pointing it at a Pro id.
 *
 * Requires a ONE-TIME interactive `agy` login (creds in Windows Credential
 * Manager under LegacyGeneric:target=gemini:antigravity, NOT in ~/.gemini).
 */
function runAgy(prompt, { seat = 'geminipro', timeoutMs = 300_000, model = AGY_PRO, effort = '', _retried = false } = {}) {
  const started = Date.now();
  const label = model || AGY_PRO;
  return new Promise(resolve => {
    const done = (ok, text, error) =>
      resolve({ provider: seat, model: label, ok, text, ms: Date.now() - started, error });
    // ⚠️ NEVER pass BOTH --print and -p. `-p` IS the short alias for `--print`,
    // so `--print ... -p PROMPT` makes agy misparse the prompt as a COMMAND and
    // it tries to execute `agy --help` as a tool, which its own permission layer
    // then denies non-interactively:
    //   Error: permission check failed for command "agy --help": user denied…
    // That reads exactly like an auth/eligibility failure and is NOT one — it
    // cost a full debugging pass on 2026-08-20. Bisected: `-p` alone works,
    // `--print` alone works, `--output-format text --model X -p PROMPT` works;
    // only the --print + -p combination breaks.
    const cliArgs = ['--output-format', 'text'];
    if (model) cliArgs.push('--model', model);
    // agy REJECTS --effort on the Pro models ("--effort is not supported for
    // model 'Gemini 3.1 Pro'") — for Gemini the effort tier is part of the model
    // id instead (…-high / …-low). Claude seats carry it in the id too.
    if (effort && !/pro|claude|opus|sonnet/i.test(model)) cliArgs.push('--effort', effort);
    cliArgs.push('-p', prompt);
    // shell:false — no shell means no arg-escaping hazard, and the prompt can
    // contain quotes/newlines safely on Windows.
    const bin = fs.existsSync(AGY_BIN) ? AGY_BIN : 'agy';
    const child = spawn(bin, cliArgs, { shell: false, windowsHide: true });
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
      if (code === 0) return done(true, stripAnsi(out).trim());
      const detail = stripAnsi(err).slice(0, 300);
      // One retry, and ONLY for a network-shaped failure. A genuine refusal
      // must surface immediately — retrying it just hides a dead entitlement.
      if (!_retried && isTransientAgyError(detail)) {
        return resolve(runAgy(prompt, { seat, timeoutMs, model, effort, _retried: true }));
      }
      done(false, '', `exit ${code}: ${detail}`);
    });
    // prompt already passed via -p; close stdin so agy does not wait on it
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
  // ── agy-backed seats (Google student AI Pro plan, $0 marginal) ──────────
  // geminipro REVIVED 2026-08-20 on the student AI Pro plan. Serves Gemini 3.1
  // Pro via agy OAuth and TAKES OVER the Google LEAD slot from the flash-tier
  // `gemini` API seat — roster.js pre-registered exactly this swap ("defer to
  // geminipro if Antigravity ever clears"). One seat per lab is preserved:
  // `gemini` drops to WORKER rather than sitting alongside it in LEAD.
  geminipro: (prompt, env, opts) => runAgy(prompt, { seat: 'geminipro', model: AGY_PRO, ...opts }),
  // agyopus — Claude Opus 4.6 on the GOOGLE wallet, $0 marginal, ~7-10s.
  //
  // ⚠️ NOT A COUNCIL SEAT AND NOT A CONTROL. It was proposed as a "context
  // control" for the `claude` seat (same lab, but with no CLAUDE.md/memory
  // loaded, so a split would isolate context-effects from model-effects).
  // A 3/3 council REJECTED that on 2026-08-20 and was right: it varies TWO
  // variables at once — model version (Opus 5 -> 4.6) AND context (full ->
  // none) — so a disagreement is uninterpretable in the exact dimension the
  // seat existed to measure. A real ablation holds the model fixed.
  //
  // The honest version was then measured and is NOT free: `claude -p --bare`
  // (skips hooks/auto-memory/CLAUDE.md discovery) and CLAUDE_CONFIG_DIR both
  // force API-key auth — "Not logged in" on the OAuth sub — so a same-model
  // context strip costs metered spend. Design case and economic case both
  // failed; the control was not built. Do not re-invent it without first
  // running the back-test the council asked for: how many of the last 30 days
  // of verdicts would a context-free seat actually have flipped?
  //
  // What it IS: free Opus-class reasoning for one-off work and subagent
  // labour. Callable via `--to agyopus`; deliberately in NO roster, because a
  // second Anthropic model in LEAD would break one-seat-per-lab and its
  // agreement with `claude` would read as corroboration while being the same
  // lab twice.
  agyopus: (prompt, env, opts) => runAgy(prompt, { seat: 'agyopus', model: AGY_COLD, ...opts }),
  // agyflash — free Gemini 3.7 Flash on the OAuth wallet. Exists for WALLET
  // REDUNDANCY: the `gemini` API seat died for 5 days in Jul/Aug when its
  // AI-Studio project was suspended (403 on every model). This path survives
  // that class of outage because it bills a different wallet entirely.
  // ⚠️ NOT wired as automatic failover — silent failover would mask a dead key,
  // which is the exact silent-degradation failure the roster already warns
  // about. If the API seat dies we want the alarm, then a manual `--to agyflash`.
  agyflash: (prompt, env, opts) => runAgy(prompt, { seat: 'agyflash', model: AGY_FLASH, ...opts }),
  deepseek: (prompt, env, opts) =>
    runOpenAiCompat('deepseek', 'https://api.deepseek.com', 'DEEPSEEK_API_KEY', 'deepseek-chat', prompt, env, opts),
  cerebras: (prompt, env, opts) =>
    runOpenAiCompat('cerebras', 'https://api.cerebras.ai/v1', 'CEREBRAS_API_KEY', 'gpt-oss-120b', prompt, env, opts),
  // llama-3.3-70b-versatile was decommissioned by Groq (HTTP 404, found by
  // health probe 2026-08-17). qwen3.6-27b keeps this WORK seat on a model
  // family distinct from cerebras's gpt-oss. REVISIT-IF: Groq retires qwen3.6
  // — pick from /models, prefer a non-gpt-oss family for seat diversity.
  groq: (prompt, env, opts) =>
    runOpenAiCompat('groq', 'https://api.groq.com/openai/v1', 'GROQ_API_KEY', 'qwen/qwen3.6-27b', prompt, env, opts),
  // xAI Grok 4.5 — 500k ctx, $2.00/$6.00 per M (the priciest seat; economical
  // ONLY while xAI's data-sharing free credits are active). Seat id is 'xai',
  // not 'grok', to keep it one typo away from 'groq' (a different vendor).
  xai: (prompt, env, opts) =>
    runOpenAiCompat('xai', 'https://api.x.ai/v1', 'XAI_API_KEY', 'grok-4.5', prompt, env, opts),
  grok: (prompt, env, opts) =>
    runOpenAiCompat('xai', 'https://api.x.ai/v1', 'XAI_API_KEY', 'grok-4.5', prompt, env, opts),
};

module.exports = { loadEnv, parseCodexOutput, stripAnsi, SEATS };
