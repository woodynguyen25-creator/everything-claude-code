/**
 * Tests for ledger DURABILITY — scripts/council/ledger.js
 *
 * Run with: node tests/council/ledger-durability.test.js
 *
 * WHY THIS FILE EXISTS
 * The council accumulated every ledger row in an in-memory array and appended the
 * whole batch ONCE, at the very end of main(). Every dispatch bills the moment it
 * returns, so any death before that final append — a thrown seat, Ctrl-C, an
 * `process.exit(2)`, a crash in the debate round — billed real money and recorded
 * NOTHING.
 *
 * That is not merely lossy accounting. budget.js computes month-to-date spend by
 * SUMMING these rows, so a crashed run makes MTD read LOW, which makes the cap
 * fire LATE — and the runs most likely to crash (retry storms, long --rounds runs
 * on huge prompts) are exactly the runaway spend the cap exists to catch. The
 * ceiling was blindest in precisely the case it was built for.
 *
 * Fix: write each row as it is produced. These tests hold that line.
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ledger = require('../../scripts/council/ledger');
const { buildEntry, appendEntry, appendEntries, readRecent } = ledger;

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    failed++;
  }
}

function tmpPath(label) {
  return path.join(os.tmpdir(), `council-durability-${label}-${Date.now()}-${process.hrtime()[1]}.jsonl`);
}

console.log('\nledger durability:\n');

test('appendEntry is exported (a single row must be writable on its own)', () => {
  assert.equal(typeof appendEntry, 'function', 'ledger must expose appendEntry');
});

test('appendEntry writes ONE row and readRecent sees it immediately', () => {
  const f = tmpPath('single');
  const e = buildEntry({ provider: 'xai', model: 'grok-4.6', ok: true, text: 'hello', ms: 12 }, { tag: 'durab' });
  appendEntry(e, f);
  const back = readRecent(10, f);
  assert.equal(back.length, 1);
  assert.equal(back[0].provider, 'xai');
  assert.equal(back[0].tag, 'durab');
  fs.unlinkSync(f);
});

test('appendEntry appends rather than truncating a ledger that already has history', () => {
  const f = tmpPath('append');
  appendEntries([buildEntry({ provider: 'groq', model: 'q', ok: true, text: 'a', ms: 1 }, { tag: 'old' })], f);
  appendEntry(buildEntry({ provider: 'xai', model: 'grok-4.6', ok: true, text: 'b', ms: 2 }, { tag: 'new' }), f);
  const back = readRecent(10, f);
  assert.equal(back.length, 2, 'prior history must survive a single-row append');
  assert.equal(back[0].tag, 'old');
  assert.equal(back[1].tag, 'new');
  fs.unlinkSync(f);
});

test('rows written before a CRASH survive the crash (the whole point)', () => {
  // Simulates a council run: two seats answer — and therefore BILL — and then the
  // run dies before it could ever reach an end-of-run batch append. Under the old
  // batch-at-the-end model this ledger ends up EMPTY and the spend is invisible.
  const f = tmpPath('crash');
  const modulePath = path.resolve(__dirname, '..', '..', 'scripts', 'council', 'ledger.js');
  const src = [
    `const { buildEntry, appendEntry } = require(${JSON.stringify(modulePath)});`,
    `const L = ${JSON.stringify(f)};`,
    `appendEntry(buildEntry({provider:'xai',model:'grok-4.6',ok:true,text:'a',ms:1}, {tag:'crash', promptChars: 400}), L);`,
    `appendEntry(buildEntry({provider:'deepseek',model:'deepseek-chat',ok:true,text:'b',ms:2}, {tag:'crash', promptChars: 400}), L);`,
    `throw new Error('seat exploded mid-run');`,
  ].join('\n');

  const res = spawnSync(process.execPath, ['-e', src], { encoding: 'utf8' });
  assert.notEqual(res.status, 0, 'the child must actually have died');

  const back = readRecent(10, f);
  assert.equal(back.length, 2, 'both billed dispatches must be on disk despite the crash');
  assert.equal(back[0].provider, 'xai');
  assert.equal(back[1].provider, 'deepseek');
  fs.unlinkSync(f);
});

test('spend recorded before a crash still counts toward the monthly cap', () => {
  // The durability guarantee is only worth anything if budget.js can read it —
  // otherwise the rows survive but the ceiling still starts from a false zero.
  const budget = require('../../scripts/council/budget');
  const f = tmpPath('budget');
  // 300k prompt tokens is ABOVE xAI's 200k cliff, so this bills the doubled rate:
  // 0.3M * $4 = $1.20. Hand-computed from the rate card, not read off the module.
  const e = buildEntry(
    { provider: 'xai', model: 'grok-4.6', ok: true, text: 'x', ms: 1, usage: { prompt_tokens: 300_000, completion_tokens: 0 } },
    { tag: 'spend' },
  );
  appendEntry(e, f);
  const mtd = budget.monthToDate(f);
  assert.ok(Math.abs(mtd.usd - 1.2) < 1e-9, `expected 1.20 from the crashed run, got ${mtd.usd}`);
  assert.equal(mtd.rows, 1);
  fs.unlinkSync(f);
});

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);
process.exit(failed > 0 ? 1 : 0);
