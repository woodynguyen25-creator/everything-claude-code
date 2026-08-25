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

function copySkill(name) {
  if (dryRun) return;
  const dst = path.join(CODEX, name);
  fs.rmSync(dst, { recursive: true, force: true });
  fs.cpSync(path.join(CLAUDE, name), dst, { recursive: true });
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
module.exports = { main, RUNTIME_BOUND };
