#!/usr/bin/env node
/**
 * Refresh ~/.codex/skills from ~/.claude/skills — the step the compat sync never does.
 *
 * WHY THIS EXISTS
 * codex-compat/manifest.json sets overwriteExistingCodexSkills=false, so
 * sync-claude-portable.js installs a skill ONCE and never touches it again. Measured
 * 2026-08-24: 1,368 identical · 30 STALE (Claude copy newer) · 123 MISSING. The stale
 * set included council, brainstorming, writing-plans, systematic-debugging,
 * test-driven-development, verification-before-completion — the whole build pipeline
 * Sol is told to follow, frozen at 2026-07-16.
 *
 * Rules (deliberately simple — see [[capability-propagation]]):
 *   identical            → skip
 *   Claude copy newer    → overwrite the Codex copy (whole skill dir)
 *   Codex copy newer     → REPORT, never overwrite (Sol-side edits survive) — --force to override
 *   missing in Codex     → install, unless the NAME marks it Claude-runtime-bound
 *
 * Usage:
 *   node scripts/codex/refresh-codex-skills.js            # apply
 *   node scripts/codex/refresh-codex-skills.js --dry-run  # report only
 *   node scripts/codex/refresh-codex-skills.js --force    # also overwrite codex-newer copies
 */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOME = process.env.USERPROFILE || os.homedir();
const CLAUDE = path.join(HOME, '.claude', 'skills');
const CODEX = path.join(HOME, '.codex', 'skills');

// Skills that only make sense inside the Claude Code runtime. A name match here means
// "do not install"; an existing Codex copy is still refreshed (someone put it there).
const RUNTIME_BOUND = /^(claude-code-|claude-in-chrome|claude-settings-|claude-monitor$|hookify|statusline)/i;

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const force = args.has('--force');

function read(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } }
function mtime(p) { try { return fs.statSync(p).mtimeMs; } catch { return 0; } }

/**
 * Directories that are never part of a skill's instructions and must not be mirrored.
 *
 * 2026-09-17: 13,442 of the 20,949 files under ~/.codex/skills (64%) were dependency trees
 * this script had copied wholesale on 2026-08-24 — markov-regime/.venv (9,113 files),
 * impeccable/node_modules (2,256), notebooklm/.venv (2,017). Codex walks that tree on every
 * launch and reports "skills scan reached its traversal limit"; that error is what forced the
 * council's Astra seat onto a private CODEX_HOME on 2026-09-11.
 *
 * Venvs can be skipped because both skills that carry one rebuild it on first use
 * (notebooklm's scripts/run.py "creates .venv if needed"; markov-regime runs under `uv run`).
 * NOTE, measured the same day: a copied venv is NOT dead on Windows — .venv\Scripts\python.exe
 * resolves its environment relative to itself and ran fine from a moved location. The reason to
 * skip is that the mirror does not need it, not that it would fail. Accepted cost: if Codex ever
 * runs one of those skills, the rebuild puts those files back into its scan path.
 *
 * node_modules is deliberately NOT skipped. Unlike a venv it is relocatable, and a mirrored
 * skill can execute from it: impeccable's detector dynamic-imports puppeteer, so dropping its
 * node_modules would have broken `$impeccable` inside Codex. That was caught on the same day,
 * before the parked copy was lost. The 11,130 venv files were the bulk of the problem anyway.
 */
const SKIP_DIRS = new Set(['.venv', 'venv', 'site-packages', '__pycache__', '.git', '.pytest_cache', '.mypy_cache']);

/** cpSync filter: copy everything except dependency / cache / VCS directories. */
function copyFilter(src) {
  return !path.normalize(src).split(path.sep).some(part => SKIP_DIRS.has(part));
}

function copySkill(name) {
  if (dryRun) return;
  const dst = path.join(CODEX, name);
  fs.rmSync(dst, { recursive: true, force: true });
  fs.cpSync(path.join(CLAUDE, name), dst, { recursive: true, filter: copyFilter });
}

function main() {
  if (!fs.existsSync(CLAUDE)) { console.error(`[refresh-codex-skills] no ${CLAUDE}`); process.exit(1); }
  if (!fs.existsSync(CODEX)) { console.error(`[refresh-codex-skills] no ${CODEX} — Codex not installed here`); process.exit(1); }

  const out = { identical: 0, refreshed: [], installed: [], codexNewer: [], runtimeBound: [] };
  for (const name of fs.readdirSync(CLAUDE).sort()) {
    const a = path.join(CLAUDE, name, 'SKILL.md');
    const srcDoc = read(a);
    if (srcDoc === null) continue; // not a skill dir
    const b = path.join(CODEX, name, 'SKILL.md');
    const dstDoc = read(b);

    if (dstDoc === null) {
      if (RUNTIME_BOUND.test(name)) { out.runtimeBound.push(name); continue; }
      copySkill(name); out.installed.push(name); continue;
    }
    if (dstDoc === srcDoc) { out.identical += 1; continue; }
    if (mtime(a) >= mtime(b) || force) { copySkill(name); out.refreshed.push(name); continue; }
    out.codexNewer.push(name);
  }

  const tag = dryRun ? 'DRY-RUN ' : '';
  console.log(`[refresh-codex-skills] ${tag}identical ${out.identical} · refreshed ${out.refreshed.length} · installed ${out.installed.length} · codex-newer (untouched) ${out.codexNewer.length} · runtime-bound (skipped) ${out.runtimeBound.length}`);
  if (out.refreshed.length) console.log(`  refreshed: ${out.refreshed.join(', ')}`);
  if (out.installed.length) console.log(`  installed: ${out.installed.join(', ')}`);
  if (out.codexNewer.length) console.log(`  codex-newer, NOT overwritten (use --force): ${out.codexNewer.join(', ')}`);
  if (out.runtimeBound.length) console.log(`  runtime-bound, not installed: ${out.runtimeBound.join(', ')}`);
  return out;
}

if (require.main === module) main();
module.exports = { main, RUNTIME_BOUND, SKIP_DIRS, copyFilter };
