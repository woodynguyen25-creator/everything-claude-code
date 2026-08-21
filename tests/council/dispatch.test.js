/**
 * Tests for scripts/council/dispatch.js — the dispatch boundary.
 *
 * Run with: node tests/council/dispatch.test.js
 *
 * Contract under test: every PHYSICAL provider attempt produces exactly one
 * ledger row. The codex review (2026-08-21, VERDICT: NO-GO) proved the previous
 * design lost three classes of billed calls — retry first-attempts (64 of them
 * historically), preflight PONGs, and failed synthesis fallbacks — and that all
 * council analytics silently assumed the complete ledger they did not have.
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { dispatch, dispatchWithRetry, extractVerdict, isRetryable } = require('../../scripts/council/dispatch');
const { readRecent } = require('../../scripts/council/ledger');

let passed = 0;
let failed = 0;

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => { console.log(`  ✓ ${name}`); passed++; })
    .catch(err => { console.log(`  ✗ ${name}`); console.log(`    Error: ${err.message}`); failed++; });
}

function tmpLedger() {
  return path.join(os.tmpdir(), `dispatch-test-${Date.now()}-${process.hrtime()[1]}.jsonl`);
}

/** Fake seat runners so no real provider is billed by the suite. */
function fakeSeats() {
  let xaiCalls = 0;
  return {
    ok: async () => ({ provider: 'ok', model: 'fake-1', ok: true, text: 'answer', ms: 5 }),
    flaky: async () => {
      xaiCalls += 1;
      return xaiCalls === 1
        ? { provider: 'flaky', model: 'fake-1', ok: false, text: '', ms: 3, error: 'HTTP 500' }
        : { provider: 'flaky', model: 'fake-1', ok: true, text: 'second time lucky', ms: 4 };
    },
    codex: async () => ({ provider: 'codex', model: 'fake-sol', ok: false, text: '', ms: 9, error: 'timeout after 1ms' }),
    thrower: async () => { throw new Error('socket exploded'); },
    verdictMid: async () => ({ provider: 'verdictMid', model: 'f', ok: true, ms: 1, text: 'VERDICT: GO — early hedge\nBut actually there are many caveats.\nStill thinking.\nNo commitment here.' }),
    verdictEnd: async () => ({ provider: 'verdictEnd', model: 'f', ok: true, ms: 1, text: 'Reasoning first.\n\nVERDICT: NO-GO — the cap fails open' }),
  };
}

async function main() {
  console.log('\ndispatch boundary:\n');

  await test('one physical call => exactly one ledger row, with kind', async () => {
    const L = tmpLedger();
    const r = await dispatch('ok', 'question?', {}, {}, { tag: 't1', kind: 'convene', round: 1, ledgerPath: L }, fakeSeats());
    assert.equal(r.ok, true);
    const rows = readRecent(10, L);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].kind, 'convene');
    assert.equal(rows[0].round, 1);
    assert.equal(rows[0].tag, 't1');
    fs.unlinkSync(L);
  });

  await test('REGRESSION: a retried call logs BOTH attempts (64 were historically invisible)', async () => {
    const L = tmpLedger();
    const r = await dispatchWithRetry('flaky', 'q', {}, {}, { tag: 'rt', ledgerPath: L }, fakeSeats());
    assert.equal(r.ok, true, 'retry succeeded');
    const rows = readRecent(10, L);
    assert.equal(rows.length, 2, 'the BILLED first attempt must have its own row');
    assert.equal(rows[0].ok, false, 'first row is the failure');
    assert.equal(rows[0].retried, undefined);
    assert.equal(rows[1].ok, true);
    assert.equal(rows[1].retried, true, 'second row marked as the retry');
    fs.unlinkSync(L);
  });

  await test('codex is never retried — one failure, one row', async () => {
    const L = tmpLedger();
    const r = await dispatchWithRetry('codex', 'q', {}, {}, { tag: 'cx', ledgerPath: L }, fakeSeats());
    assert.equal(r.ok, false);
    assert.equal(readRecent(10, L).length, 1);
    fs.unlinkSync(L);
  });

  await test('a THROWING runner still gets a row (the provider may have billed before the throw)', async () => {
    const L = tmpLedger();
    const r = await dispatch('thrower', 'q', {}, {}, { tag: 'boom', ledgerPath: L }, fakeSeats());
    assert.equal(r.ok, false);
    assert.match(r.error, /socket exploded/);
    const rows = readRecent(10, L);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].ok, false);
    fs.unlinkSync(L);
  });

  await test('STRICT verdict: a mid-answer VERDICT line does not count in --decide', async () => {
    const L = tmpLedger();
    const r = await dispatch('verdictMid', 'q', {}, {}, { verdicts: true, strictVerdict: true, ledgerPath: L }, fakeSeats());
    assert.equal(r.verdict, null, 'a verdict that does not commit the CONCLUSION is no verdict');
    fs.unlinkSync(L);
  });

  await test('STRICT verdict: a final-line VERDICT parses, and lands in the row', async () => {
    const L = tmpLedger();
    const r = await dispatch('verdictEnd', 'q', {}, {}, { verdicts: true, strictVerdict: true, ledgerPath: L }, fakeSeats());
    assert.equal(r.verdict, 'NO-GO');
    assert.equal(readRecent(10, L)[0].verdict, 'NO-GO');
    fs.unlinkSync(L);
  });

  await test('LOOSE verdict (organic capture) still reads a mid-answer line', () => {
    assert.equal(extractVerdict('VERDICT: GO — early\nmore text\nmore text\nmore text'), 'GO');
    assert.equal(extractVerdict('nothing here'), null);
    assert.equal(extractVerdict('VERDICT: NOGO — normalized'), 'NO-GO');
  });

  await test('isRetryable: transient yes, codex no, missing key no', () => {
    assert.equal(isRetryable({ ok: false, provider: 'xai', error: 'HTTP 500' }), true);
    assert.equal(isRetryable({ ok: false, provider: 'codex', error: 'timeout after 1ms' }), false);
    assert.equal(isRetryable({ ok: false, provider: 'groq', error: 'GROQ_API_KEY missing' }), false);
    assert.equal(isRetryable({ ok: true, provider: 'xai' }), false);
  });

  await test('unknown seat throws (a typo must not silently dispatch nothing)', async () => {
    await assert.rejects(() => dispatch('nope', 'q', {}, {}, {}, fakeSeats()), /unknown seat/);
  });

  console.log('\n=== Test Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
