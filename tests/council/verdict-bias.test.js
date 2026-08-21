/**
 * Tests for scripts/council/verdict-bias.js
 *
 * Run with: node tests/council/verdict-bias.test.js
 *
 * WHY THIS FILE EXISTS
 * The 2026-08-21 council self-audit measured every machine-readable verdict in the
 * ledger and found the seats are not neutral instruments:
 *
 *     seat        GO  MODIFY  NO-GO    n
 *     xai          8      13     11   32     <- the only balanced seat
 *     codex        0      18      8   26     <- has NEVER approved anything
 *     claude       3      22      0   25     <- has NEVER blocked anything
 *
 * `claude` cannot say NO-GO and `codex` cannot say GO. So a lone claude GO is not
 * approval and a lone codex NO-GO is not a block — each is that seat doing the only
 * thing it has ever done. The council's whole value is DECORRELATED error, and a
 * verdict from a seat that structurally cannot cast the opposite one carries far
 * less information than the tally suggests.
 *
 * council.js already warns on unanimity, but it asks "was the question leading?" —
 * which misattributes SEAT CORRELATION to PROMPT-LEADING. Two different failure
 * modes, one alarm. This module supplies the missing half: what each seat's own
 * record says about the verdict it just cast.
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const bias = require('../../scripts/council/verdict-bias');

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

function ledgerOf(rows) {
  const f = path.join(os.tmpdir(), `verdict-bias-${Date.now()}-${process.hrtime()[1]}.jsonl`);
  fs.writeFileSync(f, rows.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  return f;
}

const row = (provider, verdict) => ({ ts: '2026-08-01T00:00:00.000Z', provider, verdict, ok: true });

console.log('\nverdict bias:\n');

test('distribution counts verdicts per seat and ignores rows without one', () => {
  const f = ledgerOf([
    row('claude', 'MODIFY'), row('claude', 'MODIFY'), row('claude', 'GO'),
    row('xai', 'NO-GO'),
    { ts: '2026-08-01T00:00:00.000Z', provider: 'claude', ok: true }, // no verdict
  ]);
  const d = bias.distribution(f);
  assert.equal(d.claude.n, 3);
  assert.equal(d.claude.MODIFY, 2);
  assert.equal(d.claude.GO, 1);
  assert.equal(d.claude['NO-GO'], 0);
  assert.equal(d.xai.n, 1);
  fs.unlinkSync(f);
});

test('a missing or unreadable ledger yields an empty distribution, not a throw', () => {
  // Bias annotation is an ADVISORY layer. It must never be the reason a convene
  // dies — a council that refuses to run because it cannot read its own history
  // is a worse outcome than a council that runs without the annotation.
  assert.deepEqual(bias.distribution(path.join(os.tmpdir(), 'nope-does-not-exist.jsonl')), {});
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verdict-bias-dir-'));
  assert.deepEqual(bias.distribution(dir), {});
  fs.rmdirSync(dir);
});

test('flags a seat that has NEVER cast the opposing verdict', () => {
  // claude: 22 MODIFY, 3 GO, 0 NO-GO. Its GO is weak evidence of approval because
  // it has never once disapproved.
  const d = { claude: { GO: 3, MODIFY: 22, 'NO-GO': 0, n: 25 } };
  const a = bias.assess('claude', 'GO', d);
  assert.equal(a.structural, true, 'GO from a seat that never says NO-GO is structural');
  assert.equal(a.opposing, 'NO-GO');
  assert.equal(a.opposingCount, 0);
  assert.match(a.note, /never/i);
});

test('flags the mirror case — a NO-GO from a seat that never approves', () => {
  const d = { codex: { GO: 0, MODIFY: 18, 'NO-GO': 8, n: 26 } };
  const a = bias.assess('codex', 'NO-GO', d);
  assert.equal(a.structural, true);
  assert.equal(a.opposing, 'GO');
  assert.equal(a.opposingCount, 0);
});

test('does NOT flag a seat that uses the full range', () => {
  // xai casts all three. Its verdicts are worth their face value.
  const d = { xai: { GO: 8, MODIFY: 13, 'NO-GO': 11, n: 32 } };
  assert.equal(bias.assess('xai', 'GO', d).structural, false);
  assert.equal(bias.assess('xai', 'NO-GO', d).structural, false);
});

test('MODIFY has no opposite, so it is never called structural', () => {
  const d = { claude: { GO: 3, MODIFY: 22, 'NO-GO': 0, n: 25 } };
  const a = bias.assess('claude', 'MODIFY', d);
  assert.equal(a.structural, false);
  assert.equal(a.opposing, null);
});

test('thin history is reported as THIN, never as clean', () => {
  // 2 verdicts is not evidence of a bias — but it is also not evidence of
  // balance, and silently returning "not structural" would let a brand-new seat
  // read as vetted. Unknown must not render as safe.
  const d = { deepseek: { GO: 0, MODIFY: 2, 'NO-GO': 0, n: 2 } };
  const a = bias.assess('deepseek', 'MODIFY', d);
  assert.equal(a.thin, true);
  assert.match(a.note, /too few|thin/i);
});

test('an unseen seat is THIN, not balanced', () => {
  const a = bias.assess('brand-new-seat', 'GO', {});
  assert.equal(a.thin, true);
  assert.equal(a.structural, false);
  assert.equal(a.n, 0);
});

test('unanimity is called STRUCTURAL when every seat is biased toward that verdict', () => {
  // The failure the alarm currently misses: claude and gemini have both never said
  // NO-GO, so their agreeing on GO is close to a foregone conclusion, and reading
  // it as consensus is reading the roster's shape as evidence.
  const d = {
    claude: { GO: 3, MODIFY: 22, 'NO-GO': 0, n: 25 },
    gemini: { GO: 1, MODIFY: 10, 'NO-GO': 0, n: 11 },
  };
  const u = bias.assessUnanimity([
    { provider: 'claude', verdict: 'GO' },
    { provider: 'gemini', verdict: 'GO' },
  ], d);
  assert.equal(u.unanimous, true);
  assert.equal(u.structuralCount, 2);
  assert.equal(u.allStructural, true);
});

test('unanimity among balanced seats is NOT called structural', () => {
  const d = {
    xai: { GO: 8, MODIFY: 13, 'NO-GO': 11, n: 32 },
    codex: { GO: 0, MODIFY: 18, 'NO-GO': 8, n: 26 },
  };
  // Both said NO-GO. xai is balanced; codex never approves, so it IS structural.
  const u = bias.assessUnanimity([
    { provider: 'xai', verdict: 'NO-GO' },
    { provider: 'codex', verdict: 'NO-GO' },
  ], d);
  assert.equal(u.unanimous, true);
  assert.equal(u.structuralCount, 1, 'only codex is structural here');
  assert.equal(u.allStructural, false, 'xai casting NO-GO is real information');
});

test('a split verdict is not unanimous regardless of bias', () => {
  const d = { claude: { GO: 3, MODIFY: 22, 'NO-GO': 0, n: 25 }, xai: { GO: 8, MODIFY: 13, 'NO-GO': 11, n: 32 } };
  const u = bias.assessUnanimity([
    { provider: 'claude', verdict: 'GO' },
    { provider: 'xai', verdict: 'NO-GO' },
  ], d);
  assert.equal(u.unanimous, false);
});

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);
process.exit(failed > 0 ? 1 : 0);
