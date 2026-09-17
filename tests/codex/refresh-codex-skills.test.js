/**
 * Tests for the copy filter in scripts/codex/refresh-codex-skills.js.
 *
 * Run with: node tests/codex/refresh-codex-skills.test.js
 *
 * WHY THIS FILE EXISTS
 * On 2026-09-17, 64% of the files under ~/.codex/skills (13,442 of 20,949) turned out to be
 * dependency trees this script had mirrored wholesale — a 9,113-file Python .venv, a 2,256-file
 * node_modules. Codex walks that tree on every launch and hits "skills scan reached its
 * traversal limit", which is what knocked the council's Astra seat over on 2026-09-11.
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { copyFilter, SKIP_DIRS } = require('../../scripts/codex/refresh-codex-skills');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (err) { console.log(`  ✗ ${name}`); console.log(`    ${err.message}`); failed++; }
}

console.log('\n=== refresh-codex-skills: what gets mirrored ===\n');

const base = path.join('C:', 'Users', 'x', '.claude', 'skills', 'markov-regime');

test('the two Python venvs measured on 2026-09-17 are excluded', () => {
  assert.equal(copyFilter(path.join(base, '.venv')), false);
  assert.equal(copyFilter(path.join(base, '.venv', 'Lib', 'site-packages', 'numpy', 'core.py')), false);
  assert.equal(copyFilter(path.join('C:', 's', 'notebooklm', '.venv', 'pyvenv.cfg')), false);
});

test('node_modules is KEPT — it is relocatable and a mirrored skill runs from it', () => {
  // impeccable's detector dynamic-imports puppeteer from its own node_modules. Skipping it
  // was the first version of this filter and would have broken $impeccable inside Codex.
  assert.equal(copyFilter(path.join('C:', 's', 'impeccable', 'node_modules', 'puppeteer', 'index.js')), true);
});

test('caches and VCS metadata are excluded', () => {
  for (const d of ['__pycache__', '.git', '.pytest_cache', '.mypy_cache']) {
    assert.equal(copyFilter(path.join(base, d, 'x')), false, `${d} should be skipped`);
  }
});

test('the parts of a skill Codex actually needs are kept', () => {
  assert.equal(copyFilter(base), true);
  assert.equal(copyFilter(path.join(base, 'SKILL.md')), true);
  assert.equal(copyFilter(path.join(base, 'scripts', 'regime.py')), true);
  assert.equal(copyFilter(path.join(base, 'references', 'venv-notes.md')), true, 'a FILE mentioning venv is not a venv dir');
});

test('a directory merely named like a dependency dir is matched by exact segment only', () => {
  assert.equal(copyFilter(path.join(base, 'my_node_modules_notes')), true);
  assert.equal(copyFilter(path.join(base, 'venvs-explained')), true);
});

test('end to end: cpSync with the filter leaves the dependency tree behind', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-filter-'));
  const src = path.join(tmp, 'src', 'demo-skill');
  fs.mkdirSync(path.join(src, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(src, '.venv', 'Lib', 'site-packages'), { recursive: true });
  fs.mkdirSync(path.join(src, 'node_modules', 'pkg'), { recursive: true });
  fs.writeFileSync(path.join(src, 'SKILL.md'), '# demo');
  fs.writeFileSync(path.join(src, 'scripts', 'run.py'), 'print(1)');
  fs.writeFileSync(path.join(src, '.venv', 'Lib', 'site-packages', 'huge.py'), 'x');
  fs.writeFileSync(path.join(src, 'node_modules', 'pkg', 'index.js'), 'x');
  const dst = path.join(tmp, 'dst', 'demo-skill');
  fs.cpSync(src, dst, { recursive: true, filter: copyFilter });
  assert.ok(fs.existsSync(path.join(dst, 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(dst, 'scripts', 'run.py')));
  assert.ok(!fs.existsSync(path.join(dst, '.venv')), '.venv must not be mirrored');
  assert.ok(fs.existsSync(path.join(dst, 'node_modules', 'pkg', 'index.js')), 'node_modules must be mirrored');
});

test('the skip list holds venvs but not node_modules', () => {
  assert.ok(SKIP_DIRS.has('.venv'));
  assert.ok(!SKIP_DIRS.has('node_modules'));
});

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);
process.exit(failed > 0 ? 1 : 0);
