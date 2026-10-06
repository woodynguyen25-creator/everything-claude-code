/**
 * Council v2 (2026-10-05) — changes taken from the research pass, each with its source:
 *  - P(success) on every verdict: forced probability beats a neutral option (Mind the Gap,
 *    arXiv 2601.21975); Gemini answered MODIFY on 90% of its verdicts.
 *  - Anonymised answers wherever one model reads another's: models defer to identifiable
 *    peers (Choi et al., arXiv 2510.07517); Karpathy's llm-council anonymises too.
 *  - Selector instead of blender, forbidden to add facts: judge-selection 0.81 vs blended
 *    synthesis 0.18 (arXiv 2603.20324); our haiku synth invented "missed calls answered in
 *    6 seconds" on 10/03.
 *  - Brier score per seat on resolved decisions (ForecastBench, arXiv 2409.19839).
 *
 * Run: node tests/council/council-v2.test.js
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { extractProbability } = require('../../scripts/council/dispatch');
const { anonymize, selectorPrompt } = require('../../scripts/council/council');
const scores = require('../../scripts/council/scores');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${e.message}`); failed++; }
}

console.log('\n=== probability on the verdict ===');
test('reads "P(success): 72%" from the tail', () => {
  assert.equal(extractProbability('analysis...\nVERDICT: GO — ship it\nP(success): 72%'), 0.72);
});
test('reads "P(success)=0.4"; a bare "P: 15" is NOT accepted (it let p-values through — review 10/05)', () => {
  assert.equal(extractProbability('x\nP(success)=0.4'), 0.4);
  assert.equal(extractProbability('x\nVERDICT: NO-GO — y\nP: 15'), null);
});
test('no probability line → null, never a default', () => {
  assert.equal(extractProbability('VERDICT: MODIFY — change X'), null);
});
test('a probability quoted mid-answer is ignored (tail only)', () => {
  const long = 'P(success): 99%\n' + Array.from({ length: 12 }, (_, i) => `line ${i}`).join('\n') + '\nVERDICT: GO — fine';
  assert.equal(extractProbability(long), null);
});
test('out-of-range values are rejected', () => {
  assert.equal(extractProbability('P(success): 140%'), null);
});
// Review 10/05 (council-v2 reviewer): these returned the WRONG number before the fix.
test('a p-value in the tail never beats the P(success) commitment (last match wins, success required)', () => {
  assert.equal(extractProbability('p: 0.05 significance\nVERDICT: GO — x\nP(success): 40%'), 0.4);
  assert.equal(extractProbability('Overall p = 0.03 so\nVERDICT: GO — x'), null);
});
test('markdown bold around the label or the number still parses', () => {
  assert.equal(extractProbability('VERDICT: GO — x\n**P(success):** 72%'), 0.72);
  assert.equal(extractProbability('VERDICT: GO — x\n**P(success): ~65%**'), 0.65);
});
test('a range takes no single number (ambiguous → null)', () => {
  assert.equal(extractProbability('P(success): 70-75%'), null);
});

console.log('\n=== anonymised answers ===');
const results = [
  { ok: true, provider: 'claude', model: 'claude-opus-5-5', text: 'Answer from the first seat' },
  { ok: true, provider: 'codex', model: 'gpt-6-astra', text: 'Answer from the second seat' },
  { ok: false, provider: 'gemini', model: 'g', text: '' },
  { ok: true, provider: 'xai', model: 'grok-4.6', text: 'Answer from the third seat' },
];
test('blocks carry letters, never provider or model names', () => {
  const { blocks } = anonymize(results, 'seed-1');
  for (const leak of ['claude', 'CLAUDE', 'codex', 'CODEX', 'xai', 'XAI', 'grok', 'gpt-6', 'opus']) {
    assert.ok(!blocks.includes(leak), `leaked "${leak}"`);
  }
  assert.match(blocks, /Answer A/);
  assert.match(blocks, /Answer C/);
  assert.doesNotMatch(blocks, /Answer D/);   // the failed seat is excluded
});
test('model and lab names INSIDE answer text are scrubbed too', () => {
  const r = [{ ok: true, provider: 'claude', model: 'm', text: 'As Claude (Opus 5.5) I think Grok and GPT-6 from OpenAI are wrong; Gemini agrees with Anthropic.' },
             { ok: true, provider: 'xai', model: 'm', text: 'I am Grok.' }];
  const { blocks } = anonymize(r, 's');
  for (const leak of ['Claude', 'Opus', 'Grok', 'GPT-6', 'OpenAI', 'Gemini', 'Anthropic']) assert.ok(!blocks.includes(leak), `leaked ${leak}`);
});
test('the key maps every letter back to its seat', () => {
  const { key } = anonymize(results, 'seed-1');
  assert.deepEqual(Object.values(key).sort(), ['claude', 'codex', 'xai']);
});
test('order is shuffled by the seed (no fixed seat-to-letter mapping) and deterministic per seed', () => {
  const a = anonymize(results, 'seed-1').key, a2 = anonymize(results, 'seed-1').key;
  assert.deepEqual(a, a2);
  const orders = new Set(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'].map(s => anonymize(results, s).key.A));
  assert.ok(orders.size > 1, 'letter A was the same seat for every seed');
});

console.log('\n=== selector prompt ===');
test('the selector must pick one answer and may not add facts', () => {
  const p = selectorPrompt('Should we X?', 'Answer A: ...');
  assert.match(p, /BEST: [A-Z]|BEST:/);
  assert.match(p, /do not add|no new facts|must not add/i);
  assert.match(p, /DISAGREE/i);
});

console.log('\n=== per-seat Brier scores ===');
const tmp = path.join(os.tmpdir(), `council-v2-${process.pid}.jsonl`);
const rows = [
  { ts: '2026-10-01T00:00:00Z', provider: 'claude', tag: 'deal-a', kind: 'convene', verdict: 'GO', prob: 0.8 },
  { ts: '2026-10-01T00:00:00Z', provider: 'gemini', tag: 'deal-a', kind: 'convene', verdict: 'MODIFY', prob: 0.5 },
  { ts: '2026-10-01T00:00:00Z', provider: 'claude', tag: 'deal-b', kind: 'convene', verdict: 'GO', prob: 0.9 },
  { ts: '2026-10-01T00:00:00Z', provider: 'claude', tag: 'unresolved', kind: 'convene', verdict: 'GO', prob: 0.9 },
];
fs.writeFileSync(tmp, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
test('resolve appends an outcome row for a tag', () => {
  scores.resolve(tmp, 'deal-a', 1);
  scores.resolve(tmp, 'deal-b', 0);
  const last = fs.readFileSync(tmp, 'utf8').trim().split('\n').map(JSON.parse).filter(r => r.kind === 'resolution');
  assert.equal(last.length, 2);
  assert.equal(last[0].outcome, 1);
});
test('Brier per seat over resolved tags only; MODIFY with p=0.5 scores as the coin-flip it is', () => {
  const s = scores.brierBySeat(tmp);
  // claude: (0.8-1)^2=0.04, (0.9-0)^2=0.81 → mean 0.425 over 2 (unresolved tag ignored)
  assert.equal(s.claude.n, 2);
  assert.ok(Math.abs(s.claude.brier - 0.425) < 1e-9, String(s.claude.brier));
  assert.equal(s.gemini.n, 1);
  assert.ok(Math.abs(s.gemini.brier - 0.25) < 1e-9);
});
test('a seat with no probability on a resolved tag is counted as missing, not scored', () => {
  fs.appendFileSync(tmp, JSON.stringify({ ts: '2026-10-01T00:00:00Z', provider: 'xai', tag: 'deal-a', kind: 'convene', verdict: 'GO' }) + '\n');
  const s = scores.brierBySeat(tmp);
  assert.equal(s.xai.n, 0);
  assert.equal(s.xai.missing, 1);
});
test('the latest resolution for a tag wins (a correction overrides)', () => {
  scores.resolve(tmp, 'deal-b', 1);
  const s = scores.brierBySeat(tmp);
  // claude: (0.8-1)^2=0.04, (0.9-1)^2=0.01 → 0.025
  assert.ok(Math.abs(s.claude.brier - 0.025) < 1e-9, String(s.claude.brier));
});
test('a debate tag counts each seat ONCE (final round only), not once per round', () => {
  const t2 = path.join(os.tmpdir(), `council-v2-r-${process.pid}.jsonl`);
  fs.writeFileSync(t2, [
    { provider: 'claude', tag: 'deb', kind: 'convene', round: 1, verdict: 'GO', prob: 0.9 },
    { provider: 'claude', tag: 'deb', kind: 'debate', round: 2, verdict: 'NO-GO', prob: 0.2 },
    { kind: 'resolution', provider: 'operator', tag: 'deb', outcome: 0 },
  ].map(r => JSON.stringify(r)).join('\n') + '\n');
  const s = scores.brierBySeat(t2);
  assert.equal(s.claude.n, 1);
  assert.ok(Math.abs(s.claude.brier - 0.04) < 1e-9, String(s.claude.brier));   // (0.2-0)^2
  fs.rmSync(t2, { force: true });
});
test('a tag named like an Object prototype key is not treated as resolved', () => {
  const t3 = path.join(os.tmpdir(), `council-v2-p-${process.pid}.jsonl`);
  fs.writeFileSync(t3, JSON.stringify({ provider: 'claude', tag: 'constructor', kind: 'convene', verdict: 'GO', prob: 0.5 }) + '\n');
  assert.equal(scores.brierBySeat(t3).claude, undefined);
  fs.rmSync(t3, { force: true });
});
test('resolve refuses a tag the ledger never convened (typo guard) and a bad outcome', () => {
  assert.throws(() => scores.resolve(tmp, 'no-such-tag', 1), /no convene rows/);
  assert.throws(() => scores.resolve(tmp, 'deal-a', NaN), /0 or 1/);
});
test('resolution rows are excluded from timing/health rollups (not a fake failing "operator" seat)', () => {
  const { NON_TIMING_KINDS } = require('../../scripts/council/ledger');
  assert.ok(NON_TIMING_KINDS.has('resolution'));
  const dash = fs.readFileSync(path.join(__dirname, '../../dashboard/lib/council-ledger-data.ts'), 'utf8');
  assert.match(dash, /'resolution'/);
});
fs.rmSync(tmp, { force: true });

console.log(`\n=== Test Results ===\nPassed: ${passed}\nFailed: ${failed}\nTotal:  ${passed + failed}`);
process.exit(failed ? 1 : 0);
