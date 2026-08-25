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
  const src = fs.readFileSync(CONFIG, 'utf8');
  const res = apply(src, wanted);
  if (res.status === 'current') { console.log('[sync-codex-doctrine] already current'); return; }
  if (res.status === 'no-field') {
    console.error('[sync-codex-doctrine] no developer_instructions field in config.toml — add one, then re-run');
    process.exit(1);
  }
  if (check) {
    console.error('[sync-codex-doctrine] STALE — Sol\'s doctrine does not match ~/.claude/CLAUDE.md. Run: node scripts/codex/sync-codex-doctrine.js');
    process.exit(1);
  }
  TOML.parse(res.next); // prove the write is valid BEFORE touching the file
  fs.copyFileSync(CONFIG, `${CONFIG}.bak-doctrine-${new Date().toISOString().slice(0, 10)}`);
  fs.writeFileSync(CONFIG, res.next);
  console.log(`[sync-codex-doctrine] UPDATED — developer_instructions now ${wanted.length} chars (canon ${fs.statSync(CLAUDE_MD).size} bytes)`);
}

if (require.main === module) main();
module.exports = { buildInstructions, apply, translationBlock, BEGIN, END, CLAUDE_MD, CONFIG };
