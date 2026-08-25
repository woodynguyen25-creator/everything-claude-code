#!/usr/bin/env node
/**
 * Port ~/.claude/CLAUDE.md into Codex's `developer_instructions` — VERBATIM, plus a
 * translation layer for the mechanisms that differ between the two runtimes.
 *
 * WHY THIS EXISTS
 * Measured 2026-08-25: Sol's doctrine still said "ported from Claude CLAUDE.md
 * 2026-07-16". CLAUDE.md was REWRITTEN 2026-08-06 after telemetry and a 4-seat
 * council. Sol was therefore missing the External-value gate (the file's own
 * "most-violated, newest rule"), the skill-routing rule, the build pipeline, the
 * research budget and REVISIT-IF — and was still being told to end every reply with
 * "3-10 numbered questions", a quota the rewrite deliberately cut to 1-3.
 *
 * That is the fourth prose copy of a volatile fact to rot (roster ×3, now doctrine).
 * So this does not paraphrase: paraphrasing is what rotted. It embeds CLAUDE.md
 * byte-for-byte and appends a SEPARATE translation block for the handful of
 * Claude-only mechanisms, so the canon has exactly one author and the translation
 * is visibly not part of it.
 *
 * Usage:
 *   node scripts/codex/sync-codex-doctrine.js          # write config.toml
 *   node scripts/codex/sync-codex-doctrine.js --check  # exit 1 if stale
 *   node scripts/codex/sync-codex-doctrine.js --print  # dump what would be written
 */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let TOML;
try {
  TOML = require('@iarna/toml');
} catch {
  console.error('[sync-codex-doctrine] missing dependency: @iarna/toml (npm i in the repo root)');
  process.exit(1);
}

const HOME = process.env.USERPROFILE || os.homedir();
const CLAUDE_MD = path.join(HOME, '.claude', 'CLAUDE.md');
const CONFIG = path.join(HOME, '.codex', 'config.toml');

/**
 * SECOND TARGET, and the one that actually reaches the desktop app.
 *
 * Measured 2026-08-25 by asking the SAME question on both surfaces:
 *   `codex exec` CLI  -> "External-value gate" FOUND in active instructions
 *   Codex desktop app -> NOT FOUND
 * `developer_instructions` in config.toml is honoured by the CLI and NOT by the app
 * session, so a doctrine that lives only there is invisible to the surface Woody
 * actually types into. Restarting does not fix it; the channel is wrong.
 *
 * AGENTS.md is the file both surfaces load every turn (the app's own preamble calls
 * it "your orchestration brain"), so the doctrine is written to BOTH: config.toml for
 * the CLI, a marked block here for the app. One generator, one canon, two channels.
 */
const AGENTS = path.join(HOME, '.codex', 'AGENTS.md');
const MD_BEGIN = '<!-- AIOS:DOCTRINE:START -->';
const MD_END = '<!-- AIOS:DOCTRINE:END -->';
const MD_ANCHOR = '<!-- AIOS:CAPABILITIES:END -->';

const BEGIN = '=== WOODY DOCTRINE';
const END = '=== END WOODY DOCTRINE ===';

/**
 * The Codex-side preamble. Hand-maintained ON PURPOSE — it describes Codex's own
 * orchestration surface, which CLAUDE.md knows nothing about.
 */
const PREAMBLE = 'You have oh-my-codex installed. AGENTS.md is your orchestration brain and the main orchestration surface. Use skill/keyword routing like $name plus spawned role-specialized subagents for specialized work. Codex native subagents are available via .codex/agents and may be used for independent parallel subtasks within a single session or team pane. Skills are loaded from installed SKILL.md files under .codex/skills, not from native agent TOMLs. Use workflow skills via $name when explicitly invoked or clearly routed by AGENTS.md. Treat installed prompts as narrower internal execution surfaces under AGENTS.md authority, even when user-facing docs prefer $name keywords.';

/**
 * Every rule in CLAUDE.md that names a Claude-only mechanism, mapped to the Codex
 * equivalent. Kept OUTSIDE the canon block so it can never be mistaken for canon,
 * and so a reader can see exactly which rules needed translating.
 */
function translationBlock() {
  return [
    '=== CODEX TRANSLATION (not canon — how to OBEY the canon above in this runtime) ===',
    'The doctrine above is Woody\'s CLAUDE.md, verbatim. It names Claude Code mechanisms. Here is what each one is HERE:',
    '- "Skill tool" / "load the skill" → `$name`. Skills live in ~/.codex/skills, mirrored from ~/.claude/skills.',
    '- "a UserPromptSubmit hook injects skill suggestions" → the SAME four scripts run on your prompts via ~/.codex/hooks.json (memory-router, skill-suggest, taste-gate, trade-gate). When their output says "load with the Skill tool", that means `$name`. Silence still means nothing matched.',
    '- "/skill-scout", "/grill-me", "/roast", "/watch" → `$skill-scout`, `$grill-me`, `$roast`, `$watch`.',
    '- "A Stop hook checks this independently" → your Stop hooks are OMX + claude-mem, NOT Claude\'s verify-evidence checker. You have LESS automatic enforcement of the evidence rule than Claude does, so apply §3 by hand and never assume a hook caught it.',
    '- Memory: `~/.claude/projects/C--Github-Repos-everything-claude-code/memory/` (read MEMORY.md first). This CURATED CANON OUTRANKS your auto-generated Codex memories. On conflict, prefer canon and say so.',
    '- The council CLI: see the AIOS capability block at the top of AGENTS.md for the command, the live roster and the sandbox caveat.',
    '',
    'ROLE — the one thing CLAUDE.md does not say, because it is about you:',
    'You are Sol, the EXECUTOR seat of Woody\'s multi-model stack. Claude (Opus/Fable) orchestrates, ideates and verifies. You are NOT trying to be Claude — a stack of correlated clones was killed on 2026-07-18 for producing fake agreement. Your value is being a genuinely different model. NEVER grade your own work: end significant builds by naming what needs independent cross-review.',
    'SANDBOX: your sandbox may block loopback network and DOES block spawning child processes (measured 3/3 EPERM 2026-08-24). A "verified" claim you reasoned to without a real probe is UNVERIFIED — label it. If a CLI seat or a probe dies on EPERM, ask Woody to re-run escalated rather than reporting a result you could not observe.',
    '=== END CODEX TRANSLATION ===',
  ].join('\n');
}

function buildInstructions() {
  const canon = fs.readFileSync(CLAUDE_MD, 'utf8').trim();
  return [
    PREAMBLE,
    '',
    `${BEGIN} — VERBATIM COPY of ~/.claude/CLAUDE.md. Generated by scripts/codex/sync-codex-doctrine.js; do not hand-edit, edit CLAUDE.md. ===`,
    canon,
    END,
    '',
    translationBlock(),
  ].join('\n');
}

/** The doctrine as a markdown block for AGENTS.md — same content, wrapped for the app. */
function buildMarkdownBlock() {
  return [
    MD_BEGIN,
    '<!-- Generated by scripts/codex/sync-codex-doctrine.js from ~/.claude/CLAUDE.md. Do not hand-edit; edit CLAUDE.md. -->',
    '<!-- This block exists because the DESKTOP APP does not load config.toml developer_instructions (measured 2026-08-25: CLI FOUND / app NOT FOUND). -->',
    '',
    '# Woody\'s operating doctrine — canon, obeyed in full',
    '',
    'The next section is `~/.claude/CLAUDE.md` VERBATIM. It is Woody\'s standing order to every',
    'agent in his stack, you included. Where it names a Claude Code mechanism, the translation',
    'below says what that is here. Follow it as written.',
    '',
    fs.readFileSync(CLAUDE_MD, 'utf8').trim(),
    '',
    '---',
    '',
    translationBlock(),
    MD_END,
  ].join('\n');
}

/** Insert or refresh the doctrine block in AGENTS.md, directly after the capability block. */
function applyMarkdown(src, block) {
  const i = src.indexOf(MD_BEGIN);
  const j = src.indexOf(MD_END);
  if (i !== -1 && j !== -1) {
    const next = src.slice(0, i) + block + src.slice(j + MD_END.length);
    return next === src ? { status: 'current' } : { status: 'stale', next };
  }
  if (i !== -1 || j !== -1) return { status: 'broken-markers' };
  const k = src.indexOf(MD_ANCHOR);
  const next = k !== -1
    ? src.slice(0, k + MD_ANCHOR.length) + '\n\n' + block + '\n' + src.slice(k + MD_ANCHOR.length)
    : block + '\n\n' + src;
  return { status: 'missing', next };
}

/** Text-level replace of the whole developer_instructions line, so the rest of the TOML is byte-identical. */
function apply(src, next) {
  const parsed = TOML.parse(src);
  if (parsed.developer_instructions === next) return { status: 'current' };
  const line = `developer_instructions = ${JSON.stringify(next)}`;
  const re = /^developer_instructions = .*$/m;
  if (!re.test(src)) return { status: 'no-field' };
  return { status: 'stale', next: src.replace(re, () => line) };
}

function main() {
  const check = process.argv.includes('--check');
  const wanted = buildInstructions();
  if (process.argv.includes('--print')) { console.log(wanted); return; }
  if (!fs.existsSync(CONFIG)) {
    console.log(`[sync-codex-doctrine] ${CONFIG} absent — Codex not installed here, nothing to do`);
    return;
  }
  let stale = 0;

  // 1. config.toml — the CLI channel.
  const src = fs.readFileSync(CONFIG, 'utf8');
  const res = apply(src, wanted);
  if (res.status === 'no-field') {
    console.error('[sync-codex-doctrine] no developer_instructions field in config.toml — add one, then re-run');
    process.exit(1);
  }
  if (res.status === 'current') {
    if (!check) console.log('[sync-codex-doctrine] config.toml: already current');
  } else if (check) {
    console.error('[sync-codex-doctrine] config.toml: STALE — run `node scripts/codex/sync-codex-doctrine.js`');
    stale += 1;
  } else {
    TOML.parse(res.next); // prove the write is valid BEFORE touching the file
    fs.copyFileSync(CONFIG, `${CONFIG}.bak-doctrine-${new Date().toISOString().slice(0, 10)}`);
    fs.writeFileSync(CONFIG, res.next);
    console.log(`[sync-codex-doctrine] config.toml: UPDATED — ${wanted.length} chars (canon ${fs.statSync(CLAUDE_MD).size} bytes)`);
  }

  // 2. AGENTS.md — the DESKTOP APP channel. Without this the doctrine is CLI-only.
  if (fs.existsSync(AGENTS)) {
    const mdBlock = buildMarkdownBlock();
    const mdRes = applyMarkdown(fs.readFileSync(AGENTS, 'utf8'), mdBlock);
    if (mdRes.status === 'broken-markers') {
      console.error(`[sync-codex-doctrine] ${AGENTS}: one doctrine marker without the other — repair by hand`);
      process.exit(1);
    } else if (mdRes.status === 'current') {
      if (!check) console.log('[sync-codex-doctrine] AGENTS.md: already current');
    } else if (check) {
      console.error(`[sync-codex-doctrine] AGENTS.md: ${mdRes.status.toUpperCase()} — run \`node scripts/codex/sync-codex-doctrine.js\``);
      stale += 1;
    } else {
      fs.copyFileSync(AGENTS, `${AGENTS}.bak-doctrine-${new Date().toISOString().slice(0, 10)}`);
      fs.writeFileSync(AGENTS, mdRes.next);
      console.log(`[sync-codex-doctrine] AGENTS.md: doctrine block ${mdRes.status === 'missing' ? 'INSERTED' : 'UPDATED'} (${mdBlock.length} bytes)`);
    }
  }

  if (check && stale) process.exit(1);
}

if (require.main === module) main();
module.exports = {
  buildInstructions, apply, translationBlock, BEGIN, END, CLAUDE_MD, CONFIG,
  buildMarkdownBlock, applyMarkdown, MD_BEGIN, MD_END, MD_ANCHOR, AGENTS,
};
