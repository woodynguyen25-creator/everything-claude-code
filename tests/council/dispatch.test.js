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
    // Verdict buried EARLY in a long answer — must not count under strict.
    // (Strict scope widened 3→5 lines on 2026-08-21 after a real verdict with a
    // 3-line source footer was dropped, so this fixture keeps 6 lines after it.)
    verdictMid: async () => ({ provider: 'verdictMid', model: 'f', ok: true, ms: 1, text: 'VERDICT: GO — early hedge\nCaveat one applies.\nCaveat two applies.\nCaveat three applies.\nCaveat four applies.\nCaveat five applies.\nNo commitment here.' }),
    verdictFooter: async () => ({ provider: 'verdictFooter', model: 'f', ok: true, ms: 1, text: 'Analysis paragraph.\n\nVERDICT: NO-GO — cap fails open\nSources: budget.js:191\nSee also ledger.js:79\nReviewed at HEAD f6ffe10b' }),
    verdictGood: async () => ({ provider: 'verdictGood', model: 'f', ok: true, ms: 1, text: 'All checks pass.\nVERDICT: GOOD' }),
    verdictModify: async () => ({ provider: 'verdictModify', model: 'f', ok: true, ms: 1, text: 'Needs one change.\nVERDICT: MODIFY — rename the flag' }),
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

  await test('a verdict followed by a short source footer STILL parses (codex regression)', async () => {
    const L = tmpLedger();
    const r = await dispatch('verdictFooter', 'q', {}, {}, { verdicts: true, strictVerdict: true, ledgerPath: L }, fakeSeats());
    assert.equal(r.verdict, 'NO-GO', 'three footer lines must not swallow a real verdict');
    fs.unlinkSync(L);
  });

  await test('VERDICT: GOOD does NOT parse as GO (word-boundary anchor)', async () => {
    // codex probe 2026-08-21: the unanchored regex read "VERDICT: GOOD" as GO.
    const L = tmpLedger();
    const r = await dispatch('verdictGood', 'q', {}, {}, { verdicts: true, strictVerdict: true, ledgerPath: L }, fakeSeats());
    assert.equal(r.verdict, null);
    fs.unlinkSync(L);
  });

  await test('--binary ENFORCES: MODIFY parses as NO VERDICT in binary mode', async () => {
    // codex: "my probe returned MODIFY under strict extraction" — the flag changed
    // prompt wording only. Now a binary-mode MODIFY lands in the read-their-answers
    // bucket instead of silently rejoining the ternary cohort.
    const L = tmpLedger();
    const rB = await dispatch('verdictModify', 'q', {}, {}, { verdicts: true, strictVerdict: true, binaryVerdict: true, ledgerPath: L }, fakeSeats());
    assert.equal(rB.verdict, null, 'binary mode refuses MODIFY');
    const rT = await dispatch('verdictModify', 'q', {}, {}, { verdicts: true, strictVerdict: true, ledgerPath: L }, fakeSeats());
    assert.equal(rT.verdict, 'MODIFY', 'ternary mode keeps it');
    fs.unlinkSync(L);
  });

  await test('decisionMode lands in the ledger row (cohorts must be separable)', async () => {
    const L = tmpLedger();
    await dispatch('verdictEnd', 'q', {}, {}, { verdicts: true, strictVerdict: true, decisionMode: 'binary', ledgerPath: L }, fakeSeats());
    assert.equal(readRecent(5, L)[0].decisionMode, 'binary');
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
    assert.equal(isRetryable({ ok: false, provider: 'geminipro', error: 'data-terms: geminipro TRAINS ON INPUT' }), false, 'privacy refusal is deterministic');
    assert.equal(isRetryable({ ok: false, provider: 'xai', error: 'budget: monthly cap reached' }), false, 'budget refusal is deterministic');
    // agy's internal retry was removed (it collapsed two physical attempts into
    // one ledger row — codex finding, live again once --public re-enabled the
    // seats). runAgy now TAGS the failure class; the boundary owns the policy.
    assert.equal(isRetryable({ ok: false, provider: 'geminipro', error: 'exit 1 [agy-transient]: Eligibility check failed: EOF' }), true, 'network blip is worth one retry — and BOTH rows now land');
    assert.equal(isRetryable({ ok: false, provider: 'geminipro', error: 'exit 1 [agy-refusal]: not eligible for Antigravity' }), false, 'a dead entitlement must surface, not be retried into hiding');
  });

  await test('unknown seat throws (a typo must not silently dispatch nothing)', async () => {
    await assert.rejects(() => dispatch('nope', 'q', {}, {}, {}, fakeSeats()), /unknown seat/);
  });

  await test('DEGENERATE output is flagged as a FAILURE, not an answer', async () => {
    // Live failure 2026-08-21: grok-4.6 returned 21,876 chars of ONE SENTENCE
    // repeated 151 times ("I'll verify the tree first, then red-team…") — no
    // content, no verdict — and the system counted it ok=true because text was
    // non-empty. A repetition loop must never hold a quorum seat.
    const L = tmpLedger();
    const blob = "I'll verify the tree first, then red-team the hardening claims. ".repeat(150);
    const seats = { loopy: async () => ({ provider: 'loopy', model: 'f', ok: true, ms: 1, text: blob }) };
    const r = await dispatch('loopy', 'q', {}, {}, { ledgerPath: L }, seats);
    assert.equal(r.ok, false, 'a repetition loop is not an answer');
    assert.match(r.error, /degenerate/i);
    const rows = readRecent(10, L);
    assert.equal(rows[0].ok, false, 'the row records the failure');
    fs.unlinkSync(L);
  });

  await test('a NORMAL long answer is not misflagged as degenerate', async () => {
    const L = tmpLedger();
    // Realistic long-form: varied sentences, some legitimately repeated structure.
    const para = i => `Finding ${i}: the module handles case ${i} by checking invariant ${i * 7} and returns code ${i % 5}. `;
    const text = Array.from({ length: 120 }, (_, i) => para(i)).join('');
    const seats = { longy: async () => ({ provider: 'longy', model: 'f', ok: true, ms: 1, text }) };
    const r = await dispatch('longy', 'q', {}, {}, { ledgerPath: L }, seats);
    assert.equal(r.ok, true, 'varied long output must pass');
    fs.unlinkSync(L);
  });

  await test('short answers are never degeneracy-checked (PONG must survive)', async () => {
    const L = tmpLedger();
    const seats = { pong: async () => ({ provider: 'pong', model: 'f', ok: true, ms: 1, text: 'PONG' }) };
    const r = await dispatch('pong', 'q', {}, {}, { ledgerPath: L }, seats);
    assert.equal(r.ok, true);
    fs.unlinkSync(L);
  });

  await test('DATA-TERMS GATE: a TRAINS-ON-INPUT seat is refused by default — before any network call', async () => {
    // The Antigravity/free-Gemini finding (2026-08-21): those paths train on
    // input and allow human review, the opt-out toggle is unconfirmed by Google
    // and may not cover the CLI at all. The bench kept them out of ROSTERS, but
    // --to could still route a sensitive prompt straight into them. The gate
    // moves the rule onto the boundary: default-deny, because an unmarked prompt
    // must be presumed sensitive (fail closed on privacy exactly like budget
    // fails closed on spend). Uses the REAL seats map — the refusal fires before
    // the runner, so no network call and no bill.
    const L = tmpLedger();
    const r = await dispatch('gemini', 'my AMZU position is...', {}, { timeoutMs: 5 }, { ledgerPath: L });
    assert.equal(r.ok, false);
    assert.match(r.error, /trains on input|data-terms/i);
    assert.equal(readRecent(5, L).length, 0, 'no physical attempt happened, so no ledger row');
    assert.equal(fs.existsSync(L), false, 'the ledger file was never even created');
  });

  await test('DATA-TERMS GATE: meta.publicContent unlocks the seat class (pure check)', () => {
    // Public-content work (this repo is public-adjacent, generic research) has
    // nothing to protect from training, so the free agy/gemini capacity becomes
    // usable there — that is the whole point of the gate over a blanket bench.
    const { dataTermsRefusal } = require('../../scripts/council/dispatch');
    assert.ok(dataTermsRefusal('gemini', {}), 'default: refused');
    assert.ok(dataTermsRefusal('geminipro', {}), 'agy seats refused by default');
    assert.equal(dataTermsRefusal('gemini', { publicContent: true }), null, '--public unlocks');
    assert.equal(dataTermsRefusal('claude', {}), null, 'verified-private seats never gated');
    assert.equal(dataTermsRefusal('deepseek', {}), null, 'UNVERIFIED seats stay allowed (roster would break; health warns instead)');
    assert.equal(dataTermsRefusal('not-a-seat', {}), null, 'unknown seats are not this gate\'s problem');
  });

  await test('agy classifier: the REAL EOF error string classifies as transient', () => {
    // Pins a bug eslint caught 2026-08-21: a heredoc edit turned the \b word
    // boundaries into literal BACKSPACE chars (0x08), so the pattern matched
    // nothing real and EOF-class transients classified as refusals — never
    // retried. The earlier test missed it by feeding PRE-TAGGED strings to the
    // downstream policy; this one exercises the upstream classifier with the
    // verbatim error from the 2026-08-20 incident that benched geminipro.
    const { isTransientAgyError } = require('../../scripts/council/providers');
    assert.equal(isTransientAgyError('Eligibility check failed: Get https://www.googleapis.com/oauth2/v2/userinfo: EOF'), true, 'the documented real-world transient MUST classify as transient');
    assert.equal(isTransientAgyError('dial tcp 142.250.0.1:443: i/o timeout'), true);
    assert.equal(isTransientAgyError('account not eligible for Antigravity'), false, 'a refusal must never be retried into hiding');
    assert.equal(isTransientAgyError('model not found'), false, 'unknown errors default to refusal (fail loud)');
  });

  console.log('\n=== Test Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
