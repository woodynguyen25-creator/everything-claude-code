#!/usr/bin/env node
/**
 * Install claudex-loop (github.com/chaseai-yt/claudex-loop) into ~/.claude/skills with this
 * machine's local launch rules applied — idempotently, so an upstream update cannot silently
 * drop them.
 *
 * WHY AN INSTALLER AND NOT A HAND-COPY
 * The upstream runner, run as-is here, cannot find Codex (not on PATH since 2026-09-11) and
 * would give its "read-only" Codex reviewer the real ~/.codex — Robinhood trading MCP included.
 * scripts/claudex/runner_local.py fixes that, but only if the skill TELLS the model to use it.
 * A hand-edited SKILL.md loses that instruction on the first `git pull`; on 2026-09-17 a
 * hand-ported doctrine had already rotted for six days for exactly that reason. So the local
 * instruction is a marked block this script owns, and `--check` fails the suite when it is gone.
 *
 * Usage:
 *   node scripts/claudex/install.js            # install / refresh from ~/.claudex-loop-src
 *   node scripts/claudex/install.js --check    # exit 1 if the installed copy has drifted
 *   node scripts/claudex/install.js --from DIR # use another checkout
 *
 * Update upstream: git -C ~/.claudex-loop-src pull, read the diff, then re-run this.
 */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const HOME = process.env.USERPROFILE || os.homedir();
const REPO = path.resolve(__dirname, '..', '..');
const LAUNCHER = path.join(REPO, 'scripts', 'claudex', 'runner_local.py');
const DEFAULT_SRC = path.join(HOME, '.claudex-loop-src');
const DEST = path.join(HOME, '.claude', 'skills');
const PARKED = path.join(HOME, '.claude', 'skills-parked');
const SKILLS = ['claudex-loop', 'claudex-route', 'codex-review', 'codex-build'];

const BEGIN = '<!-- WOODY-LOCAL:START -->';
const END = '<!-- WOODY-LOCAL:END -->';

function launcherBlock() {
  return [
    BEGIN,
    '> **On Woody\'s machine, never launch `runner.py` directly.** Use the local launcher with the',
    '> exact same arguments:',
    '>',
    `> \`python "${LAUNCHER}" review --host claude --repo PROJECT --plan PLAN.md\``,
    '>',
    '> It (1) passes the Codex desktop app\'s native binary — `codex` is not on PATH; (2) runs Codex',
    '> under a private home with **no MCP servers** — the real `~/.codex` carries the Robinhood trading',
    '> MCP, which a read-only shell sandbox does not restrict; (3) names the ChatGPT plan cap with its',
    '> reset time — that allowance is shared with the council\'s Astra seat, so stop, do not retry; and',
    '> (4) ledgers the call in the council ledger (`kind: claudex`). From inside Codex, launching Claude is',
    '> blocked by the sandbox (spawn EPERM): ask Woody to approve running the command unsandboxed.',
    END,
  ].join('\n');
}

function routeBlock() {
  return [
    BEGIN,
    '> **On Woody\'s machine:** a one-off *read-only* handoff to Codex goes through the council, which',
    '> is ledgered, budget-gated and runs Codex without MCP:',
    '> `node "' + path.join(REPO, 'scripts', 'council', 'council.js') + '" "BRIEF" --to codex --tag route`.',
    '> A handoff that EDITS files goes through claudex-loop\'s launcher (`build` mode):',
    `> \`python "${LAUNCHER}" build ...\`. Never call \`codex\` directly — it is not on PATH, and the`,
    '> real `~/.codex` exposes the Robinhood trading MCP to the delegate.',
    END,
  ].join('\n');
}

/** Pure: insert or refresh the block right after YAML frontmatter (or at the top if none). */
function applyBlock(src, block) {
  const i = src.indexOf(BEGIN);
  const j = src.indexOf(END);
  if (i !== -1 && j !== -1) {
    const next = src.slice(0, i) + block + src.slice(j + END.length);
    return { status: next === src ? 'current' : 'stale', next };
  }
  if (i !== -1 || j !== -1) return { status: 'broken-markers', next: src };
  const fm = src.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  const at = fm ? fm[0].length : 0;
  return { status: 'missing', next: `${src.slice(0, at)}\n${block}\n\n${src.slice(at).replace(/^\n+/, '')}` };
}

/** Which installed files get which block. */
const PATCHES = [
  { rel: path.join('claudex-loop', 'SKILL.md'), block: launcherBlock },
  { rel: path.join('claudex-loop', 'references', 'runtime.md'), block: launcherBlock },
  { rel: path.join('claudex-route', 'SKILL.md'), block: routeBlock },
];

function sourceCommit(src) {
  try { return execFileSync('git', ['-C', src, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { return 'unknown'; }
}

function isOurs(skillDir) {
  const f = path.join(skillDir, 'SKILL.md');
  return fs.existsSync(f) && /claudex-loop/.test(fs.readFileSync(f, 'utf8'));
}

/** Every file under `dir`, as paths relative to it. */
function relFiles(dir, prefix = '') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory()
    ? relFiles(path.join(dir, e.name), path.join(prefix, e.name))
    : [path.join(prefix, e.name)]));
}

const GENERATED = new Set(['VENDORED.md']); // written by this installer, not by a human

/**
 * Files the installed copy has that this vendor drop does not. A refresh re-copies the drop
 * over the top, so these are exactly the files a blind rmSync would destroy — someone's notes,
 * a local variant, a saved artifact. Reported so install() can park instead of delete.
 */
function extraFiles(installed, source) {
  const shipped = new Set(relFiles(source));
  return relFiles(installed).filter(f => !shipped.has(f) && !GENERATED.has(f));
}

/** Move a directory aside under skills-parked/, without ever overwriting an earlier park. */
function park(dir, name, why) {
  fs.mkdirSync(PARKED, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  let dest = path.join(PARKED, `${name}-${stamp}`);
  for (let n = 2; fs.existsSync(dest); n++) dest = path.join(PARKED, `${name}-${stamp}-${n}`);
  fs.renameSync(dir, dest);
  console.log(`[claudex-install] parked ${name} -> ${dest} (${why})`);
  return dest;
}

function install(src) {
  const commit = sourceCommit(src);
  for (const name of SKILLS) {
    const from = path.join(src, 'skills', name);
    const to = path.join(DEST, name);
    if (!fs.existsSync(from)) throw new Error(`upstream skill missing: ${from}`);
    if (fs.existsSync(to)) {
      // Two reasons to move the old directory aside instead of deleting it:
      //  - a DIFFERENT skill owns the name (the old community `codex-review` stub); or
      //  - it holds files this drop does not ship, i.e. someone's own work. Deleting those on a
      //    command documented as a routine "refresh" is data loss with no diff and no undo
      //    (found in review, 2026-09-17).
      const extra = isOurs(to) ? extraFiles(to, from) : [];
      const why = !isOurs(to) ? 'a different skill owned this name'
        : extra.length ? `keeps ${extra.length} file(s) not in this drop: ${extra.slice(0, 5).join(', ')}`
          : null;
      if (why) park(to, name, why);
    }
    fs.rmSync(to, { recursive: true, force: true });
    fs.cpSync(from, to, { recursive: true });
  }
  for (const p of PATCHES) {
    const f = path.join(DEST, p.rel);
    const res = applyBlock(fs.readFileSync(f, 'utf8'), p.block());
    if (res.status === 'broken-markers') throw new Error(`${f}: one local marker without the other`);
    fs.writeFileSync(f, res.next);
  }
  fs.writeFileSync(path.join(DEST, 'claudex-loop', 'VENDORED.md'), [
    '# Vendored — do not edit by hand',
    '',
    `Source: https://github.com/chaseai-yt/claudex-loop @ ${commit}`,
    `Installed by: ${path.join(REPO, 'scripts', 'claudex', 'install.js')} on ${new Date().toISOString().slice(0, 10)}`,
    '',
    'The WOODY-LOCAL blocks in SKILL.md, references/runtime.md and ../claudex-route/SKILL.md are',
    'applied by that installer. Update: `git -C ~/.claudex-loop-src pull`, read the diff, re-run it.',
    '',
  ].join('\n'));
  console.log(`[claudex-install] installed ${SKILLS.join(', ')} @ ${commit}`);
}

function check() {
  const problems = [];
  if (!fs.existsSync(path.join(DEST, 'claudex-loop'))) return { installed: false, problems };
  for (const p of PATCHES) {
    const f = path.join(DEST, p.rel);
    if (!fs.existsSync(f)) { problems.push(`${p.rel}: missing`); continue; }
    const st = applyBlock(fs.readFileSync(f, 'utf8'), p.block()).status;
    if (st !== 'current') problems.push(`${p.rel}: local block ${st}`);
  }
  if (!fs.existsSync(LAUNCHER)) problems.push(`launcher missing: ${LAUNCHER}`);
  return { installed: true, problems };
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--check')) {
    const r = check();
    if (!r.installed) { console.log('[claudex-install] not installed on this machine — nothing to check'); return; }
    if (r.problems.length) {
      console.error(`[claudex-install] DRIFT — ${r.problems.join('; ')}. Run: node scripts/claudex/install.js`);
      process.exit(1);
    }
    console.log('[claudex-install] installed copy is current');
    return;
  }
  const fi = argv.indexOf('--from');
  install(fi !== -1 ? argv[fi + 1] : DEFAULT_SRC);
}

if (require.main === module) main();
module.exports = { applyBlock, launcherBlock, routeBlock, check, PATCHES, BEGIN, END, LAUNCHER, SKILLS };
