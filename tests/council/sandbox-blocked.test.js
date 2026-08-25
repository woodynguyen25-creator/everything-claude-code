/**
 * Tests for the SANDBOX-BLOCKED seat classification in scripts/council/dispatch.js.
 *
 * Run with: node tests/council/sandbox-blocked.test.js
 *
 * WHY THIS FILE EXISTS
 * 2026-08-24, first council convened from INSIDE the Codex app's sandbox: groq
 * answered, haiku died as "threw: spawn EPERM", the run exited with an ordinary
 * degraded-quorum footer, and it was retried once — pointlessly, because Codex's
 * Windows sandbox denies every grandchild spawn (claude.exe, agy, node codex.js,
 * where.exe: 3/3 EPERM). A council with its CLI seats silently missing is not a
 * council; it must say what happened and what to do.
 */
'use strict';

const assert = require('node:assert/strict');
const { classifySeatError, isSandboxBlocked, isRetryable, SANDBOX_BLOCKED } = require('../../scripts/council/dispatch');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (err) { console.log(`  ✗ ${name}`); console.log(`    ${err.message}`); failed++; }
}

console.log('\n=== SANDBOX-BLOCKED classification ===\n');

test('a spawn EPERM (the shape dispatch() actually saw) is named SANDBOX-BLOCKED with the remedy', () => {
  const e = classifySeatError('threw: spawn EPERM');
  assert.ok(e.startsWith(`${SANDBOX_BLOCKED}:`), e);
  assert.match(e, /escalated/);
  assert.match(e, /spawn EPERM/, 'the original error text must survive for forensics');
});

test('a bare child.on(error) EPERM is also classified', () => {
  assert.ok(classifySeatError('spawn C:\\Users\\x\\.local\\bin\\claude.exe EPERM').startsWith(SANDBOX_BLOCKED));
});

test('classifying twice does not stack the prefix (the throw path AND the result path both classify)', () => {
  // Seen live 2026-08-24 in a Codex-sandboxed convene: "SANDBOX-BLOCKED: SANDBOX-BLOCKED: threw: spawn EPERM …".
  const once = classifySeatError('threw: spawn EPERM');
  assert.equal(classifySeatError(once), once);
  assert.equal(once.split(SANDBOX_BLOCKED).length - 1, 1, 'exactly one prefix');
});

test('ordinary failures are passed through untouched', () => {
  for (const m of ['HTTP 429', 'timeout after 300000ms', 'exit 1: bad model', 'data-terms: gemini', 'budget: cap reached', '']) {
    assert.equal(classifySeatError(m), m);
  }
});

test('a sandbox-blocked seat is NOT retried — the sandbox does not change its mind', () => {
  const r = { provider: 'haiku', ok: false, error: classifySeatError('threw: spawn EPERM') };
  assert.equal(isSandboxBlocked(r), true);
  assert.equal(isRetryable(r), false);
});

test('an HTTP 429 stays retryable, so the change did not widen the no-retry set', () => {
  assert.equal(isRetryable({ provider: 'groq', ok: false, error: 'HTTP 429' }), true);
});

test('a successful seat is never sandbox-blocked, whatever its text says', () => {
  assert.equal(isSandboxBlocked({ ok: true, text: 'spawn EPERM is a Windows error', error: undefined }), false);
});

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);
process.exit(failed > 0 ? 1 : 0);
