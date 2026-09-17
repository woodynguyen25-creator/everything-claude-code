#!/usr/bin/env node
/**
 * SessionStart hook — keep Codex's brief in line with Claude's, every session, without
 * anyone remembering to.
 *
 * WHY THIS EXISTS
 * The four generators below were built 2026-08-25 with `--check` modes and suite tests,
 * on the theory that drift would surface as a failing test. It did not: on 2026-09-11
 * Woody rewrote CLAUDE.md §6 ("Decision forks" -> "Close with RECAP -> CALLS, Woody reads
 * only the end"), nobody ran the suite, and for six days interactive Astra kept ending
 * replies with the numbered option menus he had explicitly retired. The check existed;
 * nothing ran it. A detector that needs a human to trigger it is a note, not a guard.
 *
 * So the generators now run in WRITE mode at the start of every Claude session. Each is
 * idempotent and ~100ms. The hook is silent when nothing changed, says exactly what it
 * fixed when something did, and says so loudly when a generator fails — a sync that
 * fails quietly is the same bug as no sync (see feedback_the_system_knew_and_didnt_say).
 *
 * Always exits 0: a broken sync must never block a session from starting.
 */
'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..', '..');
const TIMEOUT_MS = 15_000;

const GENERATORS = [
  { name: 'doctrine', script: 'scripts/codex/sync-codex-doctrine.js' },
  { name: 'capability block', script: 'scripts/codex/sync-codex-agents.js' },
  { name: 'council skill doc', script: 'scripts/council/sync-skill-doc.js' },
  { name: 'skills mirror', script: 'scripts/codex/refresh-codex-skills.js' },
];

function run(gen, env) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [path.join(REPO, gen.script)], { cwd: REPO, env, windowsHide: true });
    let out = '';
    let err = '';
    const timer = setTimeout(() => { child.kill(); resolve({ ...gen, code: null, out, err: `timeout after ${TIMEOUT_MS}ms` }); }, TIMEOUT_MS);
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.on('error', e => { clearTimeout(timer); resolve({ ...gen, code: null, out, err: e.message }); });
    child.on('close', code => { clearTimeout(timer); resolve({ ...gen, code, out, err }); });
  });
}

/**
 * Pure: turn generator results into what the session should be told.
 * Returns '' when nothing changed and nothing failed — silence is the normal case.
 */
function summarize(results) {
  const changed = [];
  const failed = [];
  for (const r of results) {
    if (r.code !== 0) {
      failed.push(`${r.name} (${r.code === null ? 'did not finish' : `exit ${r.code}`}: ${String(r.err || r.out).trim().split('\n')[0].slice(0, 140)})`);
      continue;
    }
    const text = String(r.out);
    if (/\b(UPDATED|INSERTED|MIRRORED)\b/.test(text)) changed.push(r.name);
    const m = text.match(/refreshed (\d+) · installed (\d+)/);
    if (m && (Number(m[1]) || Number(m[2]))) changed.push(`${r.name} (+${m[2]} new, ${m[1]} refreshed)`);
  }
  const lines = [];
  if (changed.length) {
    lines.push(`[codex-sync] Codex was behind Claude and has been brought in line: ${changed.join(', ')}. ` +
      'A Codex session already open keeps the old copy until it restarts.');
  }
  if (failed.length) {
    lines.push(`[codex-sync] ⚠ SYNC FAILED — Codex may be running a stale brief: ${failed.join('; ')}. ` +
      'Run the failing script by hand from the ECC repo to see why.');
  }
  return lines.join('\n');
}

async function main() {
  try { fs.readFileSync(0); } catch { /* stdin is optional */ }
  const home = process.env.USERPROFILE || os.homedir();
  if (!fs.existsSync(path.join(home, '.codex'))) return; // no Codex on this machine
  const results = await Promise.all(GENERATORS.map(g => run(g, process.env)));
  const message = summarize(results);
  if (!message) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: message },
  }));
}

if (require.main === module) {
  main().catch(() => {}).finally(() => process.exit(0));
}

module.exports = { summarize, GENERATORS };
