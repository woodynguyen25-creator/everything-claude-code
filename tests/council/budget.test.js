/**
 * Tests for scripts/council/budget.js
 *
 * Run with: node tests/council/budget.test.js
 *
 * Every expected figure below is hand-computed from the vendor rate card rather
 * than captured from the implementation, so these fail if the pricing table drifts
 * — which is the whole point of a spend cap.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const budget = require('../../scripts/council/budget');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function tmpLedger(rows) {
  const f = path.join(os.tmpdir(), `budget-test-${Date.now()}-${Math.floor(process.hrtime()[1])}.jsonl`);
  fs.writeFileSync(f, rows.join('\n') + '\n', 'utf8');
  return f;
}

function isoThisMonth() {
  const n = new Date();
  return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, '0')}-01T00:00:00.000Z`;
}

function runTests() {
  let passed = 0;
  let failed = 0;
  console.log('\nbudget.js:\n');

  if (test('prices a metered seat from provider-reported usage', () => {
    // Deliberately UNDER the 200k prompt cliff so this asserts the base rate.
    // (First draft used 1M in / 1M out and expected $8 — wrong, because 1M is
    // above the threshold and bills at the doubled rate. The test caught the
    // author's arithmetic, which is what a rate-card test is for.)
    const c = budget.costOf('xai', { usage: { prompt_tokens: 100_000, completion_tokens: 100_000 } });
    // 0.1M in @ $2 = $0.20 + 0.1M out @ $6 = $0.60 => $0.80
    assert.ok(Math.abs(c.usd - 0.8) < 1e-9, `expected 0.80, got ${c.usd}`);
    assert.strictEqual(c.estimated, false);
  })) passed++; else failed++;

  if (test('DOUBLES the rate above the 200k prompt threshold', () => {
    const under = budget.costOf('xai', { usage: { prompt_tokens: 199_999, completion_tokens: 0 } });
    const over = budget.costOf('xai', { usage: { prompt_tokens: 200_000, completion_tokens: 0 } });
    assert.ok(Math.abs(under.usd - (199_999 / 1e6) * 2) < 1e-9, 'under-threshold uses base rate');
    assert.ok(Math.abs(over.usd - (200_000 / 1e6) * 4) < 1e-9, 'at threshold uses doubled rate');
    // The cliff must more than double for one extra token, not scale smoothly.
    assert.ok(over.usd > under.usd * 1.9, 'crossing the threshold roughly doubles cost');
  })) passed++; else failed++;

  if (test('returns null for subscription-metered seats (not $0-because-unknown)', () => {
    for (const seat of ['claude', 'codex', 'geminipro', 'agyflash', 'agyopus']) {
      assert.strictEqual(budget.costOf(seat, { usage: { prompt_tokens: 9e6, completion_tokens: 9e6 } }), null, seat);
      assert.strictEqual(budget.isMetered(seat), false, seat);
    }
  })) passed++; else failed++;

  if (test('falls back to a char estimate and MARKS it estimated', () => {
    const c = budget.costOf('xai', { promptChars: 4000, outputChars: 400 });
    assert.strictEqual(c.estimated, true);
    assert.strictEqual(c.inTok, 1000);
    assert.strictEqual(c.outTok, 100);
  })) passed++; else failed++;

  if (test('sums month-to-date spend from recorded usd', () => {
    const f = tmpLedger([
      JSON.stringify({ ts: isoThisMonth(), provider: 'xai', usd: 1.25 }),
      JSON.stringify({ ts: isoThisMonth(), provider: 'xai', usd: 0.75 }),
      JSON.stringify({ ts: '2001-01-01T00:00:00.000Z', provider: 'xai', usd: 99 }), // other month
    ]);
    const m = budget.monthToDate(f);
    assert.ok(Math.abs(m.usd - 2.0) < 1e-9, `expected 2.00, got ${m.usd}`);
    assert.strictEqual(m.rows, 2);
    fs.unlinkSync(f);
  })) passed++; else failed++;

  if (test('FAILS CLOSED: an unparseable row is counted, not silently skipped', () => {
    const f = tmpLedger([
      JSON.stringify({ ts: isoThisMonth(), provider: 'xai', usd: 1 }),
      '{ this is not json',
    ]);
    const m = budget.monthToDate(f);
    assert.strictEqual(m.unparseable, 1, 'corrupt row must be surfaced, not ignored');
    fs.unlinkSync(f);
  })) passed++; else failed++;

  if (test('re-prices legacy rows that predate cost accounting', () => {
    // Without this, all pre-8/21 history reads as free and the cap starts from a
    // false zero — the exact blind spot that made a $15 charge unexplainable.
    const f = tmpLedger([
      JSON.stringify({ ts: isoThisMonth(), provider: 'xai', promptChars: 4000, outputChars: 4000 }),
    ]);
    const m = budget.monthToDate(f);
    assert.ok(m.usd > 0, 'legacy row must contribute something');
    assert.strictEqual(m.estimatedRows, 1);
    fs.unlinkSync(f);
  })) passed++; else failed++;

  if (test('gate blocks metered seats over cap but KEEPS subscription seats', () => {
    const f = tmpLedger([JSON.stringify({ ts: isoThisMonth(), provider: 'xai', usd: 500 })]);
    const g = budget.gate(['claude', 'codex', 'xai', 'deepseek'], f, { cap: 10 });
    assert.strictEqual(g.over, true);
    assert.deepStrictEqual(g.allowed, ['claude', 'codex'], 'free seats survive the cap');
    assert.deepStrictEqual(g.blocked.sort(), ['deepseek', 'xai'], 'metered seats blocked');
    fs.unlinkSync(f);
  })) passed++; else failed++;

  if (test('gate allows everything under cap, and --force overrides', () => {
    const under = tmpLedger([JSON.stringify({ ts: isoThisMonth(), provider: 'xai', usd: 0.01 })]);
    assert.strictEqual(budget.gate(['xai'], under, { cap: 10 }).blocked.length, 0);
    fs.unlinkSync(under);

    const over = tmpLedger([JSON.stringify({ ts: isoThisMonth(), provider: 'xai', usd: 500 })]);
    assert.strictEqual(budget.gate(['xai'], over, { cap: 10, force: true }).blocked.length, 0, 'force bypasses');
    fs.unlinkSync(over);
  })) passed++; else failed++;

  if (test('a missing ledger is a real zero, not a fail-closed block', () => {
    const m = budget.monthToDate(path.join(os.tmpdir(), 'definitely-does-not-exist-budget.jsonl'));
    assert.strictEqual(m.usd, 0);
    assert.strictEqual(m.unparseable, 0);
  })) passed++; else failed++;

  console.log('\n=== Test Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
