/**
 * Tests for scripts/council/roster.js — ROSTER INTEGRITY.
 *
 * Run with: node tests/council/roster.test.js
 *
 * WHY THIS FILE EXISTS
 * roster.js opens by declaring itself "the SINGLE SOURCE OF TRUTH for seat
 * placement", and then documents four separate times that truth silently rotted —
 * cerebras' primary alias 404'd, cerebrasFast pointed at a model that never
 * existed on the key, groqGemma was decommissioned, and the groq seat advertised
 * a model that had been gone for three days. Every one was found by hand.
 *
 * `health.js --models` checks ids against the provider catalogue. Nothing checked
 * the roster against ITSELF. Found 2026-08-21: council.js hardcoded
 * SYNTH_FALLBACK_CHAIN = ['deepseek', 'xai', 'cerebras'] — and cerebras had been
 * BENCHED on HTTP 402 Payment Required, i.e. the last-resort synthesiser was a
 * seat guaranteed to fail. The chain was a second, private copy of seat placement
 * living outside the file that claims to own it.
 *
 * These tests hold the invariants that no seat list may contradict the tiers.
 */
'use strict';

const assert = require('node:assert/strict');

const {
  SEATS, SEAT_BY_ID, LEAD_SEATS, WORKER_SEATS, BENCHED_SEATS, SYNTH_CHAIN,
} = require('../../scripts/council/roster');

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

console.log('\nroster integrity:\n');

test('every seat id is unique', () => {
  const ids = SEATS.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length, `duplicate seat id in ${ids.join(', ')}`);
});

test('every seat declares at least one tier', () => {
  for (const s of SEATS) {
    assert.ok(Array.isArray(s.tiers) && s.tiers.length > 0, `${s.id} has no tier`);
  }
});

test('a BENCHED seat is never also LEAD or WORKER', () => {
  // A seat cannot be both "deliberately out of every roster" and dispatched by
  // default. If this ever passes silently, `--workers` starts billing a seat the
  // roster believes is retired.
  for (const id of BENCHED_SEATS) {
    assert.ok(!LEAD_SEATS.includes(id), `${id} is BENCH and LEAD at once`);
    assert.ok(!WORKER_SEATS.includes(id), `${id} is BENCH and WORKER at once`);
  }
});

test('SYNTH_CHAIN is exported from the roster, not hardcoded elsewhere', () => {
  assert.ok(Array.isArray(SYNTH_CHAIN), 'roster must own the synthesis preference order');
});

test('SYNTH_CHAIN contains NO benched seat', () => {
  // The bug this file was written for: cerebras sat at the end of the chain while
  // benched on HTTP 402, so the last-resort synthesiser could never answer and the
  // failure surfaced as a payment error rather than "no synth seat available".
  for (const id of SYNTH_CHAIN) {
    assert.ok(!BENCHED_SEATS.includes(id), `${id} is benched but still in the synthesis chain`);
  }
});

test('SYNTH_CHAIN is non-empty (filtering must never silently disable synthesis)', () => {
  // Deriving the chain by filtering introduces a new way to fail: bench enough
  // seats and synthesis disappears with no error. Fail loudly here instead.
  assert.ok(SYNTH_CHAIN.length > 0, 'every synthesis candidate is benched — synthesis would silently vanish');
});

test('every SYNTH_CHAIN entry is a real, known seat', () => {
  for (const id of SYNTH_CHAIN) {
    assert.ok(SEAT_BY_ID[id], `synthesis chain names unknown seat "${id}"`);
  }
});

test('every seat carries machine-readable dataTerms', () => {
  // 'UNVERIFIED' is an acceptable value; ABSENT is not. A missing field reads as
  // "no concern known" when it actually means "nobody looked".
  const allowed = new Set(['verified-private', 'TRAINS-ON-INPUT', 'UNVERIFIED']);
  for (const s of SEATS) {
    assert.ok(allowed.has(s.dataTerms), `${s.id} has dataTerms="${s.dataTerms}" — must be one of ${[...allowed].join('/')}`);
  }
});

test('no seat that TRAINS-ON-INPUT is in an active tier', () => {
  // The 8/21 privacy finding: council prompts carry trading positions and client
  // detail, and the free-tier gemini seat shipped them to a tier Google states is
  // used for product improvement. Benching it was the fix; this keeps it benched.
  for (const s of SEATS) {
    if (s.dataTerms !== 'TRAINS-ON-INPUT') continue;
    assert.ok(!LEAD_SEATS.includes(s.id), `${s.id} trains on input but holds a LEAD seat`);
    assert.ok(!WORKER_SEATS.includes(s.id), `${s.id} trains on input but holds a WORKER seat`);
  }
});

test('LEAD tier keeps one seat per lab (decorrelation invariant)', () => {
  // roster.js: "Prefer one seat per LAB — same-lab models share training data and
  // fail the same way." Two seats from one lab agreeing reads as corroboration
  // while being the same lab twice.
  const labs = LEAD_SEATS.map(id => SEAT_BY_ID[id].lab);
  const dupes = labs.filter((l, i) => labs.indexOf(l) !== i);
  assert.equal(dupes.length, 0, `LEAD tier has ${dupes.join(', ')} twice — agreement between them is not independent evidence`);
});

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);
process.exit(failed > 0 ? 1 : 0);
