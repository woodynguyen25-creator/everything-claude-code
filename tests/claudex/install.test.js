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

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);
process.exit(failed > 0 ? 1 : 0);
