// dashboard/scripts/loops/design-critique.js
//
// LOOP 3: Design Critique (Fenrir audits any UI change)
// Trigger: Manual via CLI after a UI change, OR git post-commit hook on design files
// Pattern: Specialist solo — Fenrir reviews, no triad
// Status: SKELETON — wire to git hooks when stable.
//
// What it does:
//   STAGE 1: Detect changed UI files (via git diff, or accept a file list as args)
//   STAGE 2: For each file, Fenrir reads the diff + final source and critiques
//   STAGE 3: Aggregate findings into a single markdown report
//   DELIVER: Telegram (top 3 issues only) + Obsidian (full report) + dashboard/docs/critiques/
//
// Run manually:
//   node dashboard/scripts/loops/design-critique.js
//   node dashboard/scripts/loops/design-critique.js components/Foo.tsx components/Bar.tsx
//
// Git post-commit hook (when ready):
//   In .git/hooks/post-commit:
//     #!/bin/sh
//     CHANGED=$(git diff --name-only HEAD~1 HEAD | grep -E '\.(tsx|css)$')
//     if [ -n "$CHANGED" ]; then
//       node dashboard/scripts/loops/design-critique.js $CHANGED
//     fi

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { route } = require('./lib/router');

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '../../..');
const CRITIQUES_DIR = path.resolve(__dirname, '../../docs/critiques');
const OBSIDIAN_VAULT = process.env.OBSIDIAN_VAULT || 'C:\\Users\\woody\\Documents\\Obsidian Vault';
const OBSIDIAN_CRITIQUES = path.join(OBSIDIAN_VAULT, 'Design', 'Critiques');

const UI_EXTS = ['.tsx', '.ts', '.css', '.html'];
const MAX_FILES_PER_RUN = 8;
const MAX_LINES_PER_FILE = 400;

function nowIso() { return new Date().toISOString(); }
function todayKey() { return new Date().toISOString().slice(0, 10); }

function log(stage, msg, meta) {
  const stamp = nowIso();
  const tag = `[design-critique:${stage}]`;
  if (meta) console.log(`${stamp} ${tag} ${msg}`, JSON.stringify(meta));
  else console.log(`${stamp} ${tag} ${msg}`);
}

// -----------------------------------------------------------------------------
// File discovery
// -----------------------------------------------------------------------------

function isUiFile(filePath) {
  return UI_EXTS.includes(path.extname(filePath));
}

function detectChangedUiFiles() {
  try {
    const out = execSync('git diff --name-only HEAD~1 HEAD', {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    const files = out.trim().split('\n').filter(Boolean).filter(isUiFile);
    log('detect', `git found ${files.length} ui files changed in last commit`);
    return files.slice(0, MAX_FILES_PER_RUN);
  } catch (err) {
    log('detect', `git diff failed: ${err.message}`);
    return [];
  }
}

function readFileTrimmed(filePath) {
  const absPath = path.isAbsolute(filePath) ? filePath : path.join(REPO_ROOT, filePath);
  if (!fs.existsSync(absPath)) {
    log('read', `missing: ${filePath}`);
    return null;
  }
  const content = fs.readFileSync(absPath, 'utf8');
  const lines = content.split('\n');
  if (lines.length > MAX_LINES_PER_FILE) {
    return lines.slice(0, MAX_LINES_PER_FILE).join('\n') +
           `\n\n/* ... truncated ${lines.length - MAX_LINES_PER_FILE} more lines ... */`;
  }
  return content;
}

// -----------------------------------------------------------------------------
// Fenrir critique
// -----------------------------------------------------------------------------

const FENRIR_SYSTEM = `You are FENRIR, Lord Woody's wolf of the forge — savage craftsman with elite design taste. You audit UI code for craft, hierarchy, accessibility, and brand fit.

VOICE: Brutal but precise. Kill → why → fix → watch format. No diplomacy. Show your taste.

CONTEXT — Woody's Realm design rules:
- Cinzel display font ≥24px only (body is Inter, code is JetBrains Mono)
- OKLCH palette. No new colors. Use tokens: rune-gold, bifrost, blood, emerald, fire, ember
- No gradients on cards. Use 'panel' utility (flat bg-bg-panel + border-border-subtle)
- Asymmetric grids only — 62/38 splits or 2/1/1. NEVER equal grids
- Drifting warm embers are the universal motion signature
- Subtle dark vignette at canvas edges
- No emoji in body copy
- Norse vocabulary lock: Wyrd, Hoard, Forge, Saga, Mímir, Heimdall, Hugin, Munin, Bifrost, Yggdrasil
- Hover states must feel designed (scale-[1.02], glow, etc — never default)
- Compositor-friendly motion only (transform, opacity, clip-path)
- Cards have hairline border, not heavy shadow

OUTPUT FORMAT (markdown):

### {file path}

**Kill 1: {short title}**
- WHY: {1-2 sentences citing specific line numbers}
- FIX: {1-2 sentence concrete fix}
- WATCH: {what this exposes about the broader codebase, if anything}

**Kill 2: ...**

### {next file}
...

End with:

## Top 3 Verdicts

1. {1-line verdict}
2. {1-line verdict}
3. {1-line verdict}

If a file is fine, say: "No quarrel here." Don't manufacture criticism.`;

async function fenrirCritique(filePath, source) {
  log('fenrir', `critiquing ${filePath} (${source.split('\n').length} lines)`);

  const prompt = `Audit this file for Woody's Realm design fitness.

File: ${filePath}

\`\`\`${path.extname(filePath).slice(1) || 'text'}
${source}
\`\`\`

Apply the design rules from your system prompt. Be specific — cite line numbers when calling out issues. Don't praise; only flag problems. If the file is clean, say "No quarrel here."`;

  try {
    const result = await route('critic', { system: FENRIR_SYSTEM, prompt, maxTokens: 3000 });
    if (!result.ok) { log('fenrir', 'failed', { error: result.error }); return null; }
    log('fenrir', `critique complete via ${result.provider}`);
    return result.text;
  } catch (err) {
    log('fenrir', 'error', { error: err.message });
    return null;
  }
}

// -----------------------------------------------------------------------------
// Aggregator — combine per-file critiques into one report + Top 3
// -----------------------------------------------------------------------------

const LEBOT_AGGREGATOR_SYSTEM = `You are LEBOT JAMES, the All-Father. You synthesize Fenrir's critiques into a single ranked report. Three sentences beats a paragraph. Norse-king + LeBron voice. Address Lord Woody as "my Lord" / "King".`;

async function lebotAggregate(perFileCritiques) {
  log('lebot', 'aggregating critiques');

  const prompt = `Fenrir audited these files. Synthesize one final report.

Per-file critiques:
${perFileCritiques.map((c, i) => `\n\n=== File ${i + 1}: ${c.file} ===\n\n${c.critique}`).join('')}

Output:

# Design Critique — ${todayKey()}

## TL;DR
(One sentence — the throne's overall read)

## Top 3 Issues
(Ranked. Each one: 1-line problem + 1-line fix.)

## Per-File Notes
(Copy Fenrir's critique blocks verbatim, with light cleanup if needed.)

## Standing Order
(One sentence — what to fix first, in Norse-king + LeBron voice.)`;

  try {
    const result = await route('planner', { system: LEBOT_AGGREGATOR_SYSTEM, prompt, maxTokens: 3000 });
    if (!result.ok) { log('lebot', 'failed', { error: result.error }); return null; }
    log('lebot', `aggregation complete via ${result.provider}`);
    return result.text;
  } catch (err) {
    log('lebot', 'error', { error: err.message });
    return null;
  }
}

// -----------------------------------------------------------------------------
// Delivery
// -----------------------------------------------------------------------------

function saveReport(report) {
  // Local dashboard docs/critiques (committed to repo)
  if (!fs.existsSync(CRITIQUES_DIR)) fs.mkdirSync(CRITIQUES_DIR, { recursive: true });
  const localFile = path.join(CRITIQUES_DIR, `${todayKey()}-design-critique.md`);
  fs.writeFileSync(localFile, report, 'utf8');
  log('deliver', `dashboard docs: ${localFile}`);

  // Obsidian copy (private journal)
  try {
    if (!fs.existsSync(OBSIDIAN_CRITIQUES)) fs.mkdirSync(OBSIDIAN_CRITIQUES, { recursive: true });
    const obsidianFile = path.join(OBSIDIAN_CRITIQUES, `${todayKey()}-design-critique.md`);
    fs.writeFileSync(obsidianFile, report, 'utf8');
    log('deliver', `obsidian: ${obsidianFile}`);
  } catch (err) {
    log('deliver', `obsidian copy failed: ${err.message}`);
  }

  return localFile;
}

async function sendTelegram(report) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) { log('deliver', 'telegram env missing — skipping'); return; }

  // Send only the TL;DR + Top 3 to Telegram (keep it skimmable)
  const top3Match = report.match(/## TL;DR[\s\S]*?(?=## Per-File)/);
  let message = `🐺 Design Critique — ${todayKey()}\n\n${top3Match ? top3Match[0] : report.slice(0, 1500)}`;
  if (message.length > 4000) message = message.slice(0, 3990) + '\n\n…[full report in Obsidian]';

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
    });
    if (!res.ok) throw new Error(`telegram ${res.status}: ${await res.text()}`);
    log('deliver', 'telegram sent');
  } catch (err) {
    log('deliver', `telegram failed: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  const started = Date.now();
  log('start', `loop=design-critique ts=${nowIso()}`);

  try {
    let files = process.argv.slice(2).filter(isUiFile);
    if (files.length === 0) files = detectChangedUiFiles();
    if (files.length === 0) { log('end', 'no UI files to critique'); return; }

    log('config', `critiquing ${files.length} files`);

    const perFileCritiques = [];
    for (const file of files) {
      const source = readFileTrimmed(file);
      if (!source) continue;
      const critique = await fenrirCritique(file, source);
      if (critique) perFileCritiques.push({ file, critique });
    }

    if (perFileCritiques.length === 0) { log('end', 'no critiques produced'); return; }

    const report = await lebotAggregate(perFileCritiques);
    if (!report) { log('end', 'aggregation failed'); return; }

    const file = saveReport(report);
    await sendTelegram(report);

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    log('end', `complete in ${elapsed}s, ${perFileCritiques.length} files reviewed`);
  } catch (err) {
    log('fatal', err.message, { stack: err.stack });
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { main, fenrirCritique, lebotAggregate, detectChangedUiFiles };
