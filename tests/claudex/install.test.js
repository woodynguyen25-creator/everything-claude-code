/**
 * Tests for scripts/claudex/install.js — the local-rules block in the vendored claudex skills.
 *
 * Run with: node tests/claudex/install.test.js
 *
 * WHY THIS FILE EXISTS
 * The local block is the only thing that tells a model to launch claudex through
 * runner_local.py instead of the upstream runner — which, run directly here, would hand a
 * "read-only" Codex reviewer the Robinhood trading MCP. An upstream `git pull` overwrites it.
 * These tests pin the block's content and hold the installed copy to it.
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  applyBlock, launcherBlock, routeBlock, check, BEGIN, END, LAUNCHER,
} = require('../../scripts/claudex/install');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (err) { console.log(`  ✗ ${name}`); console.log(`    ${err.message}`); failed++; }
}

console.log('\n=== claudex install: the local block ===\n');

test('the launcher block points at runner_local.py and says why', () => {
  const b = launcherBlock();
  assert.ok(b.includes(LAUNCHER), 'must name the launcher path');
  assert.match(b, /never launch `runner\.py` directly/);
  assert.match(b, /no MCP servers/);
  assert.match(b, /Robinhood/);
  assert.match(b, /plan cap/);
  assert.match(b, /EPERM/);
});

test('the route block sends read-only handoffs through the council and forbids bare codex', () => {
  const b = routeBlock();
  assert.match(b, /council\.js/);
  assert.match(b, /--to codex/);
  assert.match(b, /Never call `codex` directly/);
});

test('inserted after YAML frontmatter, so the skill still parses', () => {
  const src = '---\nname: x\ndescription: "y"\n---\n\n# Title\nbody\n';
  const r = applyBlock(src, launcherBlock());
  assert.equal(r.status, 'missing');
  assert.ok(r.next.startsWith('---\nname: x\ndescription: "y"\n---\n'), 'frontmatter must stay first');
  assert.ok(r.next.indexOf(BEGIN) < r.next.indexOf('# Title'));
});

test('a file without frontmatter gets the block at the top', () => {
  const r = applyBlock('# CLI runtime\n\ntext\n', launcherBlock());
  assert.ok(r.next.startsWith(`\n${BEGIN}`));
});

test('re-applying is a no-op; a stale block is replaced, not duplicated', () => {
  const once = applyBlock('---\nname: x\n---\nbody\n', launcherBlock()).next;
  assert.equal(applyBlock(once, launcherBlock()).status, 'current');
  const stale = once.replace(/never launch/, 'maybe launch');
  const fixed = applyBlock(stale, launcherBlock());
  assert.equal(fixed.status, 'stale');
  assert.equal(fixed.next.split(BEGIN).length - 1, 1, 'exactly one block');
  assert.equal(fixed.next, once);
});

test('a half-present marker pair is reported, never silently rewritten', () => {
  assert.equal(applyBlock(`x\n${BEGIN}\ny\n`, launcherBlock()).status, 'broken-markers');
  assert.equal(applyBlock(`x\n${END}\ny\n`, launcherBlock()).status, 'broken-markers');
});

console.log('\n=== claudex install: the installed copy ===\n');

test('if claudex is installed here, every local block is current and the launcher exists', () => {
  const r = check();
  if (!r.installed) { console.log('    (claudex not installed on this machine — nothing to check)'); return; }
  assert.deepEqual(r.problems, [], r.problems.join('; '));
  assert.ok(fs.existsSync(LAUNCHER));
});

/**
 * 2026-09-17, from an independent review: install() called rmSync(recursive) on each skill dir
 * and re-copied the vendor drop. Anything hand-added inside those four directories — a note, a
 * local variant, an artifact — was deleted with no backup and no diff, on a command documented
 * as a routine "refresh". The park step only fired when a DIFFERENT skill owned the name.
 *
 * These run the real installer in a throwaway HOME, so the destructive path is exercised for
 * real rather than reasoned about.
 */
console.log('\n=== claudex install: a refresh never eats work it did not write ===\n');

const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const INSTALLER = path.resolve(__dirname, '..', '..', 'scripts', 'claudex', 'install.js');
const SKILL_NAMES = ['claudex-loop', 'claudex-route', 'codex-review', 'codex-build'];

function fakeSource(root) {
  for (const name of SKILL_NAMES) {
    const dir = path.join(root, 'skills', name);
    fs.mkdirSync(path.join(dir, 'references'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\n---\n\nclaudex-loop vendored body\n`);
    fs.writeFileSync(path.join(dir, 'references', 'runtime.md'), '# runtime\n\nclaudex-loop\n');
  }
  return root;
}

function runInstaller(home, args) {
  return spawnSync(process.execPath, [INSTALLER, ...args], {
    encoding: 'utf8', env: { ...process.env, USERPROFILE: home, HOME: home },
  });
}

function sandbox() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'claudex-home-'));
  const src = fakeSource(fs.mkdtempSync(path.join(os.tmpdir(), 'claudex-src-')));
  const first = runInstaller(home, ['--from', src]);
  assert.equal(first.status, 0, `first install failed: ${first.stderr}`);
  return { home, src };
}

test('a hand-added file inside a vendored skill survives the next refresh', () => {
  const { home, src } = sandbox();
  const mine = path.join(home, '.claude', 'skills', 'claudex-loop', 'MY-NOTES.md');
  fs.writeFileSync(mine, 'my own notes — not upstream\n');

  const again = runInstaller(home, ['--from', src]);
  assert.equal(again.status, 0, again.stderr);

  const parked = path.join(home, '.claude', 'skills-parked');
  const hits = (fs.existsSync(parked) ? fs.readdirSync(parked) : [])
    .map(d => path.join(parked, d, 'MY-NOTES.md'))
    .filter(p => fs.existsSync(p));
  assert.ok(fs.existsSync(mine) || hits.length,
    'the file was deleted outright — it must be kept or parked where it can be recovered');
  if (hits.length) {
    assert.equal(fs.readFileSync(hits[0], 'utf8'), 'my own notes — not upstream\n');
    assert.match(again.stdout, /parked/i, 'and the refresh must say it moved something');
  }
});

test('an ordinary refresh with nothing extra does NOT park anything', () => {
  const { home, src } = sandbox();
  const again = runInstaller(home, ['--from', src]);
  assert.equal(again.status, 0, again.stderr);
  const parked = path.join(home, '.claude', 'skills-parked');
  assert.equal(fs.existsSync(parked) ? fs.readdirSync(parked).length : 0, 0,
    'parking must be the exception, not every run');
});

test('--check on a real installed tree detects a drifted local block (exit 1)', () => {
  const { home, src } = sandbox();
  const skill = path.join(home, '.claude', 'skills', 'claudex-loop', 'SKILL.md');
  fs.writeFileSync(skill, fs.readFileSync(skill, 'utf8').replace(/runner_local\.py/g, 'runner.py'));
  const r = runInstaller(home, ['--check', '--from', src]);
  assert.equal(r.status, 1, 'a drifted block must fail the check, not pass it');
  assert.match(`${r.stderr}${r.stdout}`, /DRIFT/);
});

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);
process.exit(failed > 0 ? 1 : 0);
