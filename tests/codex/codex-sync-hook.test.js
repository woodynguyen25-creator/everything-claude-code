/**
 * Tests for scripts/codex/codex-sync-hook.js — the SessionStart hook that keeps Codex's
 * brief in line with Claude's.
 *
 * Run with: node tests/codex/codex-sync-hook.test.js
 *
 * WHY THIS FILE EXISTS
 * The drift checks built on 2026-08-25 were correct and nobody ran them. On 2026-09-11
 * CLAUDE.md §6 changed ("Decision forks" -> "Close with RECAP -> CALLS") and interactive
 * Astra kept the retired rule for six days. The hook runs the generators on every session
 * start. These tests pin the two things that make it a guard rather than a second quiet
 * detector: it SAYS what it changed, and it SAYS when it failed.
 */
'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOOK = path.resolve(__dirname, '..', '..', 'scripts', 'codex', 'codex-sync-hook.js');
const { summarize, GENERATORS } = require(HOOK);

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (err) { console.log(`  ✗ ${name}`); console.log(`    ${err.message}`); failed++; }
}

const ok = (name, out) => ({ name, code: 0, out, err: '' });

console.log('\n=== codex-sync hook: what the session is told ===\n');

test('silence when every generator found Codex already current', () => {
  const msg = summarize([
    ok('doctrine', '[sync-codex-doctrine] config.toml: already current\n[sync-codex-doctrine] AGENTS.md: already current'),
    ok('capability block', '[sync-codex-agents] C:\\x\\AGENTS.md: already current'),
    ok('council skill doc', '[sync-skill-doc] done — 0 file(s) written'),
    ok('skills mirror', '[refresh-codex-skills] identical 1527 · refreshed 0 · installed 0 · codex-newer (untouched) 4'),
  ]);
  assert.equal(msg, '');
});

test('the 2026-09-11 case: a CLAUDE.md edit is reported as a fixed drift, by name', () => {
  const msg = summarize([
    ok('doctrine', '[sync-codex-doctrine] config.toml: UPDATED — 8900 chars\n[sync-codex-doctrine] AGENTS.md: doctrine block UPDATED (8700 bytes)'),
    ok('capability block', 'already current'),
  ]);
  assert.match(msg, /brought in line: doctrine/);
  assert.match(msg, /open keeps the old copy until it restarts/, 'must say an open Codex session is still stale');
});

test('new or refreshed skills are counted, a no-op mirror is not', () => {
  const msg = summarize([ok('skills mirror', '[refresh-codex-skills] identical 1523 · refreshed 2 · installed 4 · codex-newer (untouched) 4')]);
  assert.match(msg, /skills mirror \(\+4 new, 2 refreshed\)/);
});

test('the council doc mirror counts as a change', () => {
  assert.match(summarize([ok('council skill doc', '[sync-skill-doc] C:\\x: MIRRORED from C:\\y')]), /council skill doc/);
});

test('a FAILED generator is reported loudly — a quiet failure is the bug this hook exists for', () => {
  const msg = summarize([
    { name: 'doctrine', code: 1, out: '', err: '[sync-codex-doctrine] no developer_instructions field in config.toml — add one' },
  ]);
  assert.match(msg, /SYNC FAILED/);
  assert.match(msg, /doctrine \(exit 1: \[sync-codex-doctrine\] no developer_instructions/);
});

test('a generator that never finished is reported, not treated as clean', () => {
  const msg = summarize([{ name: 'skills mirror', code: null, out: '', err: 'timeout after 15000ms' }]);
  assert.match(msg, /SYNC FAILED/);
  assert.match(msg, /did not finish/);
});

test('change and failure in the same run are both reported', () => {
  const msg = summarize([
    ok('doctrine', 'AGENTS.md: doctrine block UPDATED'),
    { name: 'capability block', code: 1, out: '', err: 'one marker without the other' },
  ]);
  assert.match(msg, /brought in line: doctrine/);
  assert.match(msg, /SYNC FAILED/);
});

test('it runs all four generators, and every one of them exists', () => {
  assert.equal(GENERATORS.length, 4);
  const repo = path.resolve(__dirname, '..', '..');
  for (const g of GENERATORS) assert.ok(fs.existsSync(path.join(repo, g.script)), `${g.script} missing`);
});

console.log('\n=== codex-sync hook: as a process ===\n');

test('on a machine with no ~/.codex it exits 0 and prints nothing', () => {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-sync-nohome-'));
  const r = spawnSync(process.execPath, [HOOK], {
    input: '{"hook_event_name":"SessionStart"}',
    env: { ...process.env, USERPROFILE: fakeHome, HOME: fakeHome },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('garbage on stdin never stops a session from starting', () => {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-sync-garbage-'));
  const r = spawnSync(process.execPath, [HOOK], {
    input: 'not json at all',
    env: { ...process.env, USERPROFILE: fakeHome, HOME: fakeHome },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0);
});

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);
process.exit(failed > 0 ? 1 : 0);
