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

/**
 * ── IMAGE ATTACHMENTS ───────────────────────────────────────────────────────
 * Every runner below took a plain string until 2026-08-23, so an attached image
 * did not exist: the council was blind. Each transport carries pictures its own
 * way and there is no common shape, so the seat-capability map lives in roster.js
 * (`vision`) and the MECHANICS live here.
 *
 * Two rules, both learned the hard way in this file:
 *  1. NEVER silently drop an image. A transport that cannot carry one returns an
 *     ERROR, so the operator sees a failed seat instead of a fluent answer about
 *     a screenshot nobody looked at. Silent degradation is how the xai
 *     false-capability bug shipped.
 *  2. Read and encode ONCE per convene, not once per seat. Five seats sharing a
 *     3MB screenshot should not mean five reads and five base64 passes.
 */
const IMAGE_MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp',
};

/** Hard ceiling per image. Above this, providers start returning opaque 400s. */
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

/**
 * Validate + read + base64 a list of paths ONCE. Throws with an operator-readable
 * message — callers validate at ARG-PARSE time so a bad path fails before any
 * seat is dispatched, never halfway through a convene that already cost money.
 */
function loadImages(paths = []) {
  return paths.map(raw => {
    const file = path.resolve(String(raw));
    if (!fs.existsSync(file)) throw new Error(`image not found: ${file}`);
    const ext = path.extname(file).toLowerCase();
    const mime = IMAGE_MIME[ext];
    if (!mime) throw new Error(`unsupported image type "${ext || '(none)'}" for ${file} — use ${Object.keys(IMAGE_MIME).join(', ')}`);
    const buf = fs.readFileSync(file);
    if (buf.length > MAX_IMAGE_BYTES) {
      throw new Error(`image too large: ${file} is ${(buf.length / 1048576).toFixed(1)}MB, limit ${MAX_IMAGE_BYTES / 1048576}MB`);
    }
    return { file, mime, b64: buf.toString('base64'), bytes: buf.length };
  });
}

/** OpenAI-style content parts (chat/completions: DeepSeek-shape image_url). */
function imagePartsOpenAi(images) {
  return images.map(i => ({ type: 'image_url', image_url: { url: `data:${i.mime};base64,${i.b64}` } }));
}

/**
 * Prompt suffix for CLI agents that read images off DISK rather than accepting
 * them inline (the claude/haiku seats). The wording is deliberately imperative:
 * a soft "you may look at" gets skipped often enough to matter, and a seat that
 * skips the image still answers, which is the failure mode we are avoiding.
 */
function imagePromptSuffix(images) {
  if (!images.length) return '';
  const list = images.map(i => `  - ${i.file}`).join('\n');
  return `\n\n[ATTACHED IMAGES — ${images.length}]\n`
    + 'Read each of these files before answering. They are part of the question, not background:\n'
    + list
    + '\nIf you cannot open one, say so explicitly instead of describing it.';
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

// The npm `codex` command is a .cmd shim that just runs `node …/codex/bin/codex.js`.
// Spawning that JS entry directly (shell:false) removes the shell layer entirely:
// no DEP0190 deprecation warning on every convene, no cmd.exe quoting semantics.
// Falls back to the shim via shell:true if the npm layout ever changes.
const CODEX_JS = path.join(
  process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming'),
  'npm', 'node_modules', '@openai', 'codex', 'bin', 'codex.js',
);

// 2026-09-11: the npm package was REMOVED by the Codex desktop app's own migration (~10:12 CDT),
// which silently killed this seat — both paths above failed and the council reported a dead
// Astra as "FAILED: exit 1". The working CLI is now the NATIVE exe under
// %LOCALAPPDATA%\OpenAI\Codex\bin\<hash>\codex.exe. The <hash> dir changes on every desktop
// update, so it is globbed (newest mtime wins), never pinned. Order: native exe → npm codex.js
// → PATH shim. Same argv works on all three (verified: `codex.exe exec --skip-git-repo-check
// --model gpt-6-astra -c model_reasoning_effort=high -i x.png -` → ASTRA_OK).
function resolveCodexLauncher(codexArgs) {
  const binDir = path.join(
    process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local'),
    'OpenAI', 'Codex', 'bin',
  );
  try {
    const exes = fs.readdirSync(binDir)
      .map(d => path.join(binDir, d, 'codex.exe'))
      .filter(p => fs.existsSync(p))
      .map(p => ({ p, mtime: fs.statSync(p).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    if (exes.length) return { file: exes[0].p, args: codexArgs, shell: false, via: 'native' };
  } catch { /* bin dir absent -> fall through to the npm layout */ }
  if (fs.existsSync(CODEX_JS)) return { file: process.execPath, args: [CODEX_JS, ...codexArgs], shell: false, via: 'npm' };
  return { file: 'codex', args: codexArgs, shell: true, via: 'shim' }; // args are fixed strings
}

/** OpenAI frontier via local codex CLI; prompt over stdin to avoid Windows quoting issues. */
// Promoted gpt-5.6-sol -> gpt-6-astra 2026-09-05 (Astra requires codex-cli >=0.153;
// 0.147 returned 400 "requires a newer version of Codex". Probed clean on 0.153.4).
// Sol remains the default in ~/.codex/config.toml for interactive sessions — this
// pin governs the COUNCIL seat only. Must match roster.js's codex seat `model`.
const CODEX_MODEL = 'gpt-6-astra';

// Private CODEX_HOME for council runs (see the comment at the spawn site). auth.json is re-copied
// on every convene so a rotated token never goes stale here; config is regenerated so drift in
// ~/.codex/config.toml (effort creeping to xhigh, plugin hooks, the 5KB doctrine copy) cannot reach
// the seat. Returns null on any failure -> caller falls back to the real CODEX_HOME and the seat
// may die on the skills scan, which the council reports as FAILED rather than hiding.
//
// project_doc_max_bytes = 0 (2026-09-17). The private home stripped skills, plugins and hooks, but
// `codex exec` still runs with cwd = this repo, so it loaded the REPO's AGENTS.md on every call:
// 14KB of ECC contributor conventions plus a claude-mem dump dated 2026-05-21. Measured with the
// same one-line prompt, same seat, same launcher:
//     as-is ............ 10,873 tokens
//     project doc off ..  2,311 tokens   (-79%)
// The council convenes before every trade analysis (standing order 2026-09-09), so that 8.5k
// tax compounded on every one — and it bought nothing: the packet carries the question, the seat
// is an AGENT that can open AGENTS.md itself when a question is actually about this repo, and the
// council's value is decorrelation, which a shared house-conventions preamble works against.
const COUNCIL_CODEX_CONFIG =
  `model = "${CODEX_MODEL}"\n` +
  'model_reasoning_effort = "high"\n' +
  'service_tier = "fast"\n' +
  'project_doc_max_bytes = 0\n';

/**
 * Why a codex run failed, in words the council banner can show.
 *
 * 2026-09-17: the ChatGPT plan's Codex allowance ran out mid-trading-day. codex prints
 *   "ERROR: You've hit your usage limit. Upgrade to Pro (...), visit ... or try again at 2:20 PM."
 * but only AFTER a ~250-char session header on stderr, and the old handler kept the first 300
 * chars — then the degraded-quorum banner kept the first 100 of those. The seat would have
 * been reported as a generic "exit 1" with no reason and no return time, on the day the
 * council is standing-ordered to review every trade. The plan cap is not a seat outage: it
 * has a known end, and it takes the interactive session down too, so it gets its own name.
 */
const USAGE_LIMIT = 'USAGE-LIMIT';
// A seat that cannot be isolated does not run. Named like USAGE-LIMIT/SANDBOX-BLOCKED so the
// convene banner can explain the drop instead of printing a bare failure.
const ISOLATION_FAILED = 'ISOLATION-FAILED';
function codexFailureReason(stderr, stdout, code) {
  const text = stripAnsi(`${stderr || ''}\n${stdout || ''}`);
  if (/hit your usage limit/i.test(text)) {
    const when = (text.match(/try again at ([^\r\n]+?)\.?[ \t]*$/im) || [])[1];
    return `${USAGE_LIMIT}: ChatGPT plan cap reached — Astra back ${when ? `at ${when.trim()}` : 'after the plan window resets'}`;
  }
  return `exit ${code}: ${stripAnsi(String(stderr || '')).slice(0, 300)}`;
}

/**
 * The seat's private CODEX_HOME. Returns {dir} or {error} — never a bare null.
 *
 * 2026-09-17: this used to return null on any failure and the caller then ran with the real
 * ~/.codex "as a fallback". That is fail-OPEN on the one property the private home exists to
 * hold: the real home carries 15 MCP servers (Robinhood TRADING among them) and a 1,950-skill
 * scan. A degraded seat is fine; a seat quietly wired to the trading MCP is not. The reason
 * now travels back so the refusal can name it.
 */
function councilCodexHome() {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  if (!home) return { error: 'no USERPROFILE/HOME in this environment' };
  const src = path.join(home, '.codex');
  const dst = path.join(home, '.codex-council');
  try {
    fs.mkdirSync(dst, { recursive: true });
    fs.copyFileSync(path.join(src, 'auth.json'), path.join(dst, 'auth.json'));
    fs.writeFileSync(path.join(dst, 'config.toml'), COUNCIL_CODEX_CONFIG);
    return { dir: dst };
  } catch (err) {
    return { error: err.message };
  }
}

function runCodex(prompt, { timeoutMs = 900_000, effort = 'high', images = [] } = {}) {
  const started = Date.now();
  return new Promise(resolve => {
    const done = (ok, text, error) =>
      resolve({ provider: 'codex', model: CODEX_MODEL, ok, text, ms: Date.now() - started, error });
    // Fixed args + shell:true (Windows .cmd shim); user prompt only ever flows via stdin.
    // NOTE: 'gpt-5.5-codex' 400s on ChatGPT-account codex; bare model ids ('gpt-5.6-sol', 'gpt-6-astra') are the valid form.
    // Pin effort=high explicitly so the council seat stays fast + predictable regardless of
    // whatever ~/.codex/config.toml drifts to (it had crept to 'xhigh' = the timeout cause, 2026-07-26).
    // `-i/--image` is codex's NATIVE attachment flag (verified 2026-08-23:
    // `codex exec -i probe.png -` returned the probe codeword and both shape
    // counts). The prompt still goes over stdin — passing it as an argv arg with
    // stdin piped makes codex read stdin instead and report "No prompt provided".
    const imageArgs = images.flatMap(i => ['-i', i.file]);
    const codexArgs = ['exec', '--skip-git-repo-check', '--model', CODEX_MODEL, '-c', `model_reasoning_effort=${effort}`, ...imageArgs, '-'];
    const launcher = resolveCodexLauncher(codexArgs);
    // 2026-09-11: ~/.codex/skills holds 1,950 mirrored skills. codex scans them on EVERY exec and
    // dies with "skills scan reached its traversal limit" on any real packet (a one-line probe
    // survived but burned 50k tokens on the scan + the doctrine copy in config.toml). Council
    // runs therefore get a private CODEX_HOME holding only auth + a 3-line config: no skills dir,
    // no plugins, no notify hooks. Probed 9/11 with the real 88-line system packet: 0 traversal
    // errors (it then hit the ChatGPT usage cap, which is a different, honestly-reported failure).
    // REVISIT-IF: codex grows a `skills.enabled=false` key (0.153.1 exec --help: none).
    const codexHome = councilCodexHome();
    if (!codexHome.dir) {
      return done(false, '', `${ISOLATION_FAILED}: could not build the seat's private CODEX_HOME ` +
        `(${codexHome.error}). Refusing to run Astra against the real ~/.codex — it carries the ` +
        'Robinhood trading MCP and a 1,950-skill scan. The seat drops out of this convene; ' +
        'fix ~/.codex/auth.json (or `codex login`) and re-run.');
    }
    const env = { ...process.env, CODEX_HOME: codexHome.dir };
    const child = spawn(launcher.file, launcher.args, { shell: launcher.shell, windowsHide: true, env });
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
      else done(false, '', codexFailureReason(err, out, code));
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/**
 * ── runGemini (Gemini REST on an AI-Studio API key) — REMOVED 2026-08-22 ──────
 *
 * The `gemini` seat moved off the free-tier API key onto the agy CLI, so this
 * runner had no caller. Deleted rather than left as dead code that lint has to
 * be told to ignore; it is intact in git at rev 6f050fef if it is ever needed.
 *
 * WHEN IT WOULD BE NEEDED — this matters, so it is recorded here rather than
 * only in the commit log. Every Google path on the consumer AI Pro plan (API
 * free tier AND agy) trains on input, which is why the Google seat is default-
 * denied and only votes under --public. Attaching BILLING to an AI-Studio
 * project flips ai.google.dev's "Used to improve our products" from Yes to No
 * for that project, and a paid key also lifts the 429 that blocks every pro id.
 * That combination — a verified-private Google seat that can see trading and
 * client prompts like claude and codex do — is the ONLY route to real parity,
 * and restoring this runner is the first step of it.
 */

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
const AGY_PRO   = 'gemini-3.1-pro-high';        // geminipro  — hand-summon deep seat
const AGY_COLD  = 'claude-opus-4-6-thinking';   // agyopus    — free Opus-class labour
const AGY_FLASH = 'gemini-3.7-flash-high';      // gemini     — THE Google LEAD seat
const AGY_FLASH_PREV = 'gemini-3.6-flash-high'; // agyflash   — free worker seat

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
  // ⚠ REPAIRED 2026-08-21, caught by eslint no-control-regex: a heredoc edit
  // halved a double-backslash-b into a literal BACKSPACE (0x08), so the pattern
  // was <BS>EOF<BS> - which matches nothing real. EOF-class transients therefore
  // classified as REFUSALS and were never retried: the precise misread this
  // function exists to prevent, reintroduced invisibly (terminals HIDE
  // backspaces on display; only cat -A and the linter showed it). The word
  // boundary is now built with a RegExp constructor so no source-editing tool
  // can halve it again, and the test suite feeds the REAL error string.
  const transient = new RegExp(String.raw`\bEOF\b|context canceled|connection reset|i/o timeout|deadline exceeded|TLS|dial tcp|no such host|temporarily`, 'i');
  return transient.test(msg);
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
function runAgy(prompt, { seat = 'geminipro', timeoutMs = 300_000, model = AGY_PRO, effort = '', images = [] } = {}) {
  const started = Date.now();
  // agy CANNOT carry an image: `agy --help` exposes no image flag, and asking it
  // to open a path non-interactively dies with
  //   permission check failed for read_file … user denied permission
  // (measured 2026-08-23). The fix is NOT --dangerously-skip-permissions.
  // Fail loudly rather than answering blind — see the roster's vision docblock.
  if (images.length) {
    return Promise.resolve({
      provider: seat, model: model || AGY_PRO, ok: false, text: '', ms: 0,
      error: `[vision] seat "${seat}" runs on the agy CLI, which cannot receive images. Route Gemini vision through the gemini seat (Gemini API) instead.`,
    });
  }
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
      // INTERNAL RETRY REMOVED 2026-08-21 (codex-seat finding, promoted from
      // deferred to live the day --public made these seats usable again): the
      // recursion collapsed two PHYSICAL attempts into one dispatch result, so
      // the first attempt never got a ledger row — the exact hole the dispatch
      // boundary exists to close. Retry policy now lives in dispatch.js
      // dispatchWithRetry, which logs BOTH attempts. The transient-vs-refusal
      // classification stays here (isTransientAgyError, exported) because only
      // this file knows agy's error shapes; a REAL refusal is marked
      // non-retryable so a dead entitlement still surfaces immediately.
      const kind = isTransientAgyError(detail) ? 'transient' : 'refusal';
      done(false, '', `exit ${code} [agy-${kind}]: ${detail}`);
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

function runClaude(prompt, { timeoutMs = 300_000, model = 'claude-opus-5', seat = 'claude', images = [] } = {}) {
  // claude.exe has no --image flag (checked 2026-08-23), but in -p mode it still
  // has its Read tool, which renders images visually. So the attachment is an
  // absolute path in the prompt. Verified 3/3 on the probe for BOTH claude-opus-5
  // and claude-haiku-4-5 — the worker seat can see too.
  prompt = images.length ? prompt + imagePromptSuffix(images) : prompt;
  const started = Date.now();
  return new Promise(resolve => {
    const done = (ok, text, error) =>
      resolve({ provider: seat, model, ok, text, ms: Date.now() - started, error });
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

/**
 * xAI Agent Tools API — the ONLY path to live web + X search, as of 2026-08-23.
 *
 * NOT a variant of the chat runner: different endpoint (`/v1/responses`), different
 * request key (`input`, not `messages`) and a different response shape (an `output`
 * array of reasoning/tool-call/message items rather than `choices`).
 *
 * HOW THIS SHAPE WAS FOUND, because the first three guesses were wrong and the
 * errors are worth keeping: `search_parameters` (the documented Live Search field)
 * returns **HTTP 410 — "Live search is deprecated. Please switch to the Agent Tools
 * API"**. `tools:[{type:'web_search'}]` on chat/completions returns 422 naming
 * `live_search` as the accepted variant — and `live_search` ALSO returns 410. The
 * feature is simply gone from chat/completions. Only /v1/responses serves it.
 *
 * ⚠ COST. Measured on the first real call: **$0.14 for one question** — 28x the
 * $5/1k-calls rate this was originally priced at, and a tenth of the council's
 * entire monthly spend. Two reasons the per-call model was wrong: the tool count
 * varies (9 invocations on that one question, not 1), and the dominant cost is not
 * the tools at all — it is the ~67k INPUT tokens the search results inject back
 * into context. So this runner does not estimate: xAI returns
 * `usage.cost_in_usd_ticks`, and that authoritative figure is passed straight
 * through to the ledger. Ticks are 1e10 per USD (verified 2026-08-18 in the news
 * layer, where reading them as 1e9 made an audit read 10x high).
 */
async function runXaiResponses(prompt, env, { timeoutMs = 300_000, model = 'grok-4.6', images = [] } = {}) {
  const started = Date.now();
  const key = env.XAI_API_KEY;
  if (!key) return { provider: 'xai', model, ok: false, text: '', ms: 0, error: 'XAI_API_KEY missing' };
  try {
    const res = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model,
        // /v1/responses uses `input_image`, NOT the chat endpoint's `image_url`.
        // Both were verified 3/3 on the probe (2026-08-23); this endpoint is the
        // one that also carries the search tools, so a --research convene can
        // look at a chart AND check today's web in the same call.
        input: [{
          role: 'user',
          content: images.length
            ? [{ type: 'input_text', text: prompt },
               ...images.map(i => ({ type: 'input_image', image_url: `data:${i.mime};base64,${i.b64}` }))]
            : prompt,
        }],
        tools: [{ type: 'web_search' }, { type: 'x_search' }],
      }),
    });
    const raw = await res.text();
    if (!res.ok) {
      // Include the body. `HTTP 410` alone cost a live convene and three probe
      // rounds to diagnose; the body said exactly what to do in one line.
      return { provider: 'xai', model, ok: false, text: '', ms: Date.now() - started, error: `HTTP ${res.status}: ${raw.slice(0, 200)}` };
    }
    const data = JSON.parse(raw);
    const text = (data.output || [])
      .filter(o => o.type === 'message')
      .flatMap(o => (o.content || []).map(c => c.text || ''))
      .join('')
      .trim();
    const u = data.usage || {};
    const tools = u.server_side_tool_usage_details || {};
    return {
      provider: 'xai',
      model,
      ok: Boolean(text),
      text,
      ms: Date.now() - started,
      usage: u,
      searched: true,
      // Provider-reported dollars. Never recomputed locally — see the cost note.
      providerUsd: typeof u.cost_in_usd_ticks === 'number' ? u.cost_in_usd_ticks / 1e10 : undefined,
      searchCalls: (tools.web_search_calls || 0) + (tools.x_search_calls || 0),
      error: text ? undefined : 'empty response',
    };
  } catch (e) {
    return { provider: 'xai', model, ok: false, text: '', ms: Date.now() - started, error: e.message };
  }
}

/**
 * Gemini VISION via the AI-Studio REST key — a deliberately NARROW restoration of
 * the runGemini deleted on 2026-08-22.
 *
 * Why it had to come back: the `gemini` seat runs on the agy CLI, and agy simply
 * cannot carry a picture. `agy --help` exposes no image flag, and asking it to
 * open a path non-interactively dies with "permission check failed for read_file
 * … user denied permission" (measured 2026-08-23). The only lever that would
 * change that is --dangerously-skip-permissions, which is forbidden here and
 * would be a wildly disproportionate blast radius for wanting to show a model a
 * screenshot. So the Google seat keeps agy for text and borrows the API for
 * images. Same lab, same seat, different wire.
 *
 * Scope discipline — this is NOT the general-purpose seat coming back:
 *   - Used ONLY when images are attached; text convenes still go through agy,
 *     which is where the sub-metered $0 economics and the bake-off winner live.
 *   - The model is a FLASH id. Verified 2026-08-23 on this key: gemini-flash-latest
 *     and gemini-3-flash-preview both scored 3/3 on the probe. The Pro ids remain
 *     429/404 on the consumer plan — do not "upgrade" this to a Pro id, that is
 *     the exact mistake the deleted docblock warns about.
 *   - dataTerms are UNCHANGED (TRAINS-ON-INPUT): the free API tier trains on input
 *     just as agy does, so this opens NO new privacy hole and --private still
 *     drops the seat by the same derived rule.
 */
const GEMINI_VISION_MODEL = 'gemini-flash-latest';

async function runGeminiVision(prompt, env, { timeoutMs = 300_000, images = [], seat = 'gemini', model = GEMINI_VISION_MODEL } = {}) {
  const started = Date.now();
  const key = env.GEMINI_API_KEY;
  const label = `${model} (vision)`;
  if (!key) return { provider: seat, model: label, ok: false, text: '', ms: 0, error: 'GEMINI_API_KEY missing (needed for the Gemini vision path; agy cannot carry images)' };
  try {
    const parts = [{ text: prompt }, ...images.map(i => ({ inline_data: { mime_type: i.mime, data: i.b64 } }))];
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({ contents: [{ parts }] }),
    });
    const raw = await res.text();
    // Body included on purpose: a bare "HTTP 429" here reads as a dead key when it
    // is usually the free-tier minute quota, and that ambiguity cost a debugging
    // pass on the Pro ids in August.
    if (!res.ok) return { provider: seat, model: label, ok: false, text: '', ms: Date.now() - started, error: `HTTP ${res.status}: ${raw.slice(0, 200)}` };
    const data = JSON.parse(raw);
    const text = (data.candidates?.[0]?.content?.parts || []).map(pt => pt.text || '').join('').trim();
    return {
      provider: seat, model: label, ok: Boolean(text), text, ms: Date.now() - started,
      usage: data.usageMetadata, error: text ? undefined : 'empty response',
    };
  } catch (e) {
    return { provider: seat, model: label, ok: false, text: '', ms: Date.now() - started, error: e.message };
  }
}

/**
 * Shared OpenAI-compatible chat runner (DeepSeek, Cerebras, Groq, xAI).
 *
 * Search does NOT live here — it is gone from chat/completions (HTTP 410) and
 * moved to the Agent Tools API. See runXaiResponses above.
 */
async function runOpenAiCompat(provider, baseUrl, keyName, model, prompt, env, { timeoutMs = 120_000, images = [] } = {}) {
  const started = Date.now();
  const key = env[keyName];
  if (!key) return { provider, model, ok: false, text: '', ms: 0, error: `${keyName} missing` };
  try {
    // A string content field is text-only. Images require the ARRAY form, which
    // only some models on this shared runner accept — deepseek-chat answers
    // HTTP 400 "This model does not support image" (measured 2026-08-23), while
    // groq's qwen3.6-27b and xai's grok-4.6 both scored 3/3 on the probe. The
    // roster's `vision` flag is what decides who is handed one; this runner just
    // carries it. Never send an image to a seat the roster marks blind.
    const content = images.length
      ? [{ type: 'text', text: prompt }, ...imagePartsOpenAi(images)]
      : prompt;
    const payload = { model, messages: [{ role: 'user', content }], max_tokens: 4096 };
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { provider, model, ok: false, text: '', ms: Date.now() - started, error: `HTTP ${res.status}` };
    const data = await res.json();
    const text = stripThink(data?.choices?.[0]?.message?.content ?? '');
    // Provider-reported usage is the ONLY trustworthy basis for cost: the old
    // chars/4 estimate billed a ~6-token prompt as 510 tokens on grok, and it
    // cannot see reasoning tokens at all. Passed through for budget.js.
    return { provider, model, ok: Boolean(text), text, ms: Date.now() - started, usage: data && data.usage, error: text ? undefined : 'empty response' };
  } catch (e) {
    return { provider, model, ok: false, text: '', ms: Date.now() - started, error: e.message };
  }
}

/**
 * Strip leaked chain-of-thought blocks. Groq's qwen3.6-27b emits raw <think>…</think>
 * into the message body (known since the 2026-08-17 seat swap), and reasoning models
 * generally can leak it. Left in, it pollutes every council transcript and inflates the
 * char-based token estimates the ledger uses. An UNCLOSED <think> means the model never
 * finished thinking, so drop the remainder rather than pass a half-thought off as an answer.
 */
function stripThink(text = '') {
  return String(text)
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/i, '')
    .trim();
}

const SEATS = {
  claude: (prompt, env, opts) => runClaude(prompt, opts),
  // haiku — the CLAUDE-SUBAGENT worker seat (added 2026-08-21, Woody's call:
  // "we can just summon sub-agents from Claude to be our workers"). Same
  // claude.exe, same Max sub, $0 marginal — a FREE worker on a wallet already
  // paid for. Probed before adding: PONG in 10.5s, exit 0. Worker tier only:
  // correlation with the claude LEAD seat is fine there (workers execute, they
  // don't vote), and one-seat-per-lab is a LEAD-tier invariant.
  haiku: (prompt, env, opts) => runClaude(prompt, { ...opts, model: 'claude-haiku-4-5-20251001', seat: 'haiku' }),
  codex: (prompt, env, opts) => runCodex(prompt, opts),
  // ── agy-backed seats (Google student AI Pro plan, $0 marginal) ──────────
  // gemini — THE Google seat (Woody, 2026-08-22: "Gemini as his own seat, on the
  // best model, just how we have Opus 5 and GPT-5.6 Sol"). MOVED off the free-tier
  // AI Studio API key onto agy/3.7-flash-high, which won a measured 2x2 bake-off
  // against 3.1-pro-high (same 4/4 accuracy, 1.7-7.7x faster, no 97s tail). Full
  // evidence and the ledger-discontinuity warning live in roster.js.
  // Images bypass agy entirely — it cannot carry them (see runGeminiVision).
  // Text keeps the agy path, which is the bake-off winner and costs $0.
  gemini: (prompt, env, opts) => ((opts && opts.images && opts.images.length)
    ? runGeminiVision(prompt, env, { seat: 'gemini', ...opts })
    : runAgy(prompt, { seat: 'gemini', model: AGY_FLASH, ...opts })),
  // geminipro — Gemini 3.1 Pro via agy OAuth. REVIVED 2026-08-20 by the student
  // AI Pro plan, then BENCHED 2026-08-21: antigravity.google/terms says
  // Interactions train Google's ML AND "employees and contractors may access,
  // view, review" them, on every tier. See roster.js for the restore condition
  // (opt out in Antigravity settings, CONFIRM the toggle, flip dataTerms).
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
  // agyflash — free Gemini Flash worker on the OAuth wallet. Held 3.7-flash-high
  // until 2026-08-22, when that model won the frontier bake-off and moved to the
  // `gemini` LEAD seat; this seat dropped to 3.6-flash-high so the same weights
  // do not sit in two rosters at once. Workers execute a fixed spec and never
  // vote, so a generation back costs nothing here.
  agyflash: (prompt, env, opts) => runAgy(prompt, { seat: 'agyflash', model: AGY_FLASH_PREV, ...opts }),
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
  // xAI Grok 4.6 — 500k ctx, $2.00/$6.00 per M (the priciest seat; economical
  // ONLY while xAI's data-sharing free credits are active). Seat id is 'xai',
  // not 'grok', to keep it one typo away from 'groq' (a different vendor).
  xai: (prompt, env, opts) =>
    // --research routes this seat to the Agent Tools endpoint (live web + X) and
    // everything else to plain chat. Opt-in because one search call measured
    // **$0.14** against a whole-roster spend of ~$1.42/month.
    (opts && opts.liveSearch)
      ? runXaiResponses(prompt, env, opts)
      : runOpenAiCompat('xai', 'https://api.x.ai/v1', 'XAI_API_KEY', 'grok-4.6', prompt, env, opts),
  // The `grok` ALIAS was deleted 2026-08-21, found by a cross-file consistency
  // audit. It undid this seat's own naming rule twice over: the id is 'xai'
  // precisely so a typo cannot confuse it with 'groq' — and the alias put
  // 'grok' one letter from 'groq' again, routing the typo to the PRICIEST seat.
  // Worse, the alias had no roster or PRICING entry, so budget.isMetered('grok')
  // was false and `--to grok` bypassed the pre-dispatch budget gate entirely
  // while billing xAI for real. An alias is a seat id without a seat record;
  // every gate keyed on seat records fails open for it.
};

module.exports = {
  loadEnv, parseCodexOutput, stripAnsi, isTransientAgyError, SEATS, loadImages, MAX_IMAGE_BYTES, IMAGE_MIME,
  COUNCIL_CODEX_CONFIG, CODEX_MODEL, codexFailureReason, USAGE_LIMIT,
  councilCodexHome, runCodex, ISOLATION_FAILED,
};
