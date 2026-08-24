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
  AGENT_SEATS, API_SEATS,
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

test('every TRAINS-ON-INPUT seat is enrolled in the --private drop list', () => {
  // POLICY CHANGED 2026-08-23 (Woody: "I don't consider any of the work I do here
  // truly private"). This test used to assert the opposite — that no such seat
  // could hold an active tier at all — which is why it is REWRITTEN rather than
  // deleted: the guarantee moved, it did not disappear.
  //
  // Old guarantee: these seats are never dispatched without an explicit --public.
  // New guarantee: these seats are always dispatched EXCEPT under --private, and
  // --private must catch every one of them. The failure mode that would hurt is a
  // seat that trains on input but is invisible to the privacy filter, so a client
  // convene marked --private would still ship to it. Deriving the list from
  // dataTerms makes that structurally impossible; this test proves the derivation
  // is actually wired, not just declared.
  const { TRAINS_ON_INPUT_SEATS } = require('../../scripts/council/roster');
  for (const s of SEATS) {
    if (s.dataTerms !== 'TRAINS-ON-INPUT') continue;
    assert.ok(
      TRAINS_ON_INPUT_SEATS.includes(s.id),
      `${s.id} trains on input but --private would not drop it — a client convene would leak`,
    );
  }
  // And nothing else may be in there: over-dropping silently shrinks the roster.
  for (const id of TRAINS_ON_INPUT_SEATS) {
    assert.equal(SEAT_BY_ID[id].dataTerms, 'TRAINS-ON-INPUT', `${id} is dropped by --private for no stated reason`);
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

test('every seat declares toolAccess as agent or api', () => {
  // Recorded 2026-08-21 after a brief told the whole LEAD roster it had filesystem
  // access. `xai` is a raw HTTPS call: it burned a dispatch on a 3.5s stub that
  // narrated a repo inspection it could not perform. The capability existed only
  // inside providers.js's implementation, so nothing could have caught the mismatch.
  for (const s of SEATS) {
    assert.ok(['agent', 'api'].includes(s.toolAccess), `${s.id} has toolAccess="${s.toolAccess}"`);
  }
});

test('AGENT_SEATS and API_SEATS partition the roster exactly', () => {
  assert.equal(AGENT_SEATS.length + API_SEATS.length, SEATS.length, 'every seat lands in exactly one bucket');
  for (const id of AGENT_SEATS) assert.ok(!API_SEATS.includes(id), `${id} is in both buckets`);
});

test('at least one ACTIVE seat can actually verify a claim', () => {
  // The council's single most valuable output (8/21 audit) came from the one seat
  // that checked the brief against the disk instead of answering it as given. A
  // roster of pure API seats cannot do that at all — it can only reason from what
  // the orchestrator asserted, which is how a stale brief propagates into every
  // seat at once and comes back looking like consensus.
  const active = [...new Set([...LEAD_SEATS, ...WORKER_SEATS])];
  const canVerify = active.filter(id => AGENT_SEATS.includes(id));
  assert.ok(canVerify.length > 0, 'no active seat can check anything — every answer would be premise-bound');
});

test('the Google seat is a STANDING lead member, and the fourth lab', () => {
  // Woody's ruling 2026-08-23: "I don't consider any of the work I do here truly
  // private. I want to fully utilise the strongest model we get from Gemini in
  // the Council." Standing membership is the whole point — the previous opt-in
  // produced 13 agy dispatches in a month, one of which fed a real decision.
  assert.ok(LEAD_SEATS.includes('gemini'), 'gemini must be a standing LEAD seat, not opt-in');
  assert.equal(SEAT_BY_ID.gemini.lab, 'google');
  assert.equal(LEAD_SEATS.length, 4, 'four labs decide: anthropic, openai, xai, google');
  // The decorrelation invariant must survive the promotion — this is the reason
  // a SECOND Google seat can never join LEAD, however free it is.
  const labs = LEAD_SEATS.map(id => SEAT_BY_ID[id].lab);
  assert.equal(new Set(labs).size, labs.length, `LEAD doubles a lab: ${labs.join(', ')}`);
});

test('agyopus is free Opus-class LABOUR, never a LEAD vote', () => {
  // Promoted BENCH -> WORKER 2026-08-23: Opus 4.6 on Google's wallet is the
  // biggest capability the ruling unlocked. But the 2026-08-20 council rejected
  // it as a LEAD seat 3/3 and that still binds — its agreement with `claude`
  // would read as corroboration while being the same lab twice. Workers execute
  // a fixed spec and never vote, which is why the same lab is fine THERE.
  assert.ok(WORKER_SEATS.includes('agyopus'), 'free Opus-class labour should be usable');
  assert.ok(!LEAD_SEATS.includes('agyopus'), 'a second Anthropic seat in LEAD fakes corroboration');
  assert.equal(SEAT_BY_ID.agyopus.lab, SEAT_BY_ID.claude.lab, 'the whole hazard is that these share a lab');
});

test('no two seats a --public convene can dispatch run the IDENTICAL model', () => {
  // Added 2026-08-22 with the Google-seat consolidation. When 3.7-flash-high won
  // the LEAD bake-off it was ALREADY the agyflash worker model, so a --public
  // convene would have dispatched the same weights twice under two seat names.
  // Harmless for voting (workers execute a spec, they never vote) but it fakes
  // breadth: the transcript reads as two Google seats consulted when one model
  // answered twice, and that is the same false-consensus failure the whole
  // decorrelation doctrine exists to prevent. agyflash dropped to 3.6-flash-high.
  // Nothing checked this — the seat universe was checked for orphan IDS, never
  // for duplicate MODELS.
  const dispatchable = [...new Set([...LEAD_SEATS, ...WORKER_SEATS])];
  const seen = new Map();
  for (const id of dispatchable) {
    const model = SEAT_BY_ID[id].model;
    if (seen.has(model)) {
      assert.fail(`seats "${seen.get(model)}" and "${id}" both run ${model} — one model, two seat names, fake breadth`);
    }
    seen.set(model, id);
  }
});

test('--trading implies --private, and --private drops every training seat', () => {
  // REGRESSION, and it was live for about ten minutes on 2026-08-23. The parser
  // wrote `args.lensSet = 'trading'` while the privacy rule read `args.trading`,
  // so `--trading` implied NOTHING: a live convene seated the Google seat on a
  // trading question, which is the one category explicitly carved out because a
  // broker position is not Woody's alone to donate. Nothing could have caught it
  // — council.js exported nothing, so testing it meant billing real dispatches.
  // The fix was a dedicated flag plus making the policy an exported function.
  const { applyPrivacyPolicy } = require('../../scripts/council/council');
  const quiet = () => {};
  const all = [...LEAD_SEATS, ...WORKER_SEATS];

  const trading = applyPrivacyPolicy({ to: [...all], trading: true }, quiet);
  assert.equal(trading.privateContent, true, '--trading must imply --private');
  assert.equal(trading.to.some(id => SEAT_BY_ID[id].dataTerms === 'TRAINS-ON-INPUT'), false,
    'a trading convene must not seat any training path');
  assert.ok(trading.to.includes('claude'), 'verified-private seats stay');

  // An explicit --to is SHRUNK, not honoured verbatim — the safe direction.
  const explicit = applyPrivacyPolicy({ to: ['gemini', 'haiku'], privateContent: true }, quiet);
  assert.deepEqual(explicit.to, ['haiku'], '--private overrides a hand-picked roster');

  // And the default path must NOT strip anything, or the flip did nothing.
  const ordinary = applyPrivacyPolicy({ to: [...all] }, quiet);
  assert.ok(ordinary.to.includes('gemini'), 'ordinary work keeps the Google seat');
  assert.equal(ordinary.to.length, all.length, 'nothing dropped without --private');
});

test('the research lens follows CAPABILITY, never seat order', () => {
  // The EVIDENCE lens tells a seat it can search the live web. Handing that to a
  // prompt-bound seat is the 2026-08-21 xai bug again — a brief asserting a
  // capability the seat does not have, which yields confident fiction instead of
  // an error. So the searcher is found from the roster, and every other seat is
  // told explicitly that it cannot search and must not cite.
  const { assignLenses } = require('../../scripts/council/council');
  const { SEARCH_SEATS } = require('../../scripts/council/roster');
  assert.deepEqual(SEARCH_SEATS, ['xai'], 'xai is currently the only seat that can retrieve');

  // xai deliberately LAST, so a positional table would give EVIDENCE to claude.
  const seats = ['claude', 'gemini', 'xai'];
  const { lens, names, searchers } = assignLenses(seats, 'research');
  assert.deepEqual(searchers, ['xai']);
  assert.equal(names[2], 'EVIDENCE', 'the searcher gets EVIDENCE wherever it sits in the list');
  assert.notEqual(names[0], 'EVIDENCE', 'a prompt-bound seat must never be told it can search');
  assert.match(lens[2], /ONLY seat with live web/);
  for (const i of [0, 1]) assert.match(lens[i], /NO search access/, `${seats[i]} must be told it cannot search`);

  // Positional sets keep their ordering — BULL on seat 0 was itself a bug fix.
  const t = assignLenses(['xai', 'claude', 'codex'], 'trading');
  assert.equal(t.names[0], 'BULL', 'trading stays positional');
  assert.deepEqual(t.searchers, [], 'non-research sets never enable search');
});

test('providers, roster, and pricing agree on the seat universe (no orphan aliases)', () => {
  // Found 2026-08-21 by exactly this audit: a `grok` alias lived in providers.js
  // SEATS with no roster entry and no PRICING entry. Consequences of an id
  // without a seat record: budget.isMetered('grok') was false, so `--to grok`
  // BYPASSED the pre-dispatch budget gate while billing xAI for real — and the
  // alias sat one letter from 'groq', the exact typo hazard the xai seat's id
  // was chosen to prevent. Every gate keyed on seat records fails open for an
  // unrecorded id, so the seat universe must be closed: one id, three records.
  const { SEATS: RUNNERS } = require('../../scripts/council/providers');
  const { PRICING } = require('../../scripts/council/budget');
  const runnerIds = Object.keys(RUNNERS);
  const rosterIds = SEATS.map(s => s.id);
  for (const id of runnerIds) {
    assert.ok(rosterIds.includes(id), `runner "${id}" has no roster entry — gates keyed on the roster fail open for it`);
    assert.ok(id in PRICING, `runner "${id}" has no PRICING entry — budget treats unknown ids as subscription ($0)`);
  }
  for (const id of rosterIds) {
    assert.ok(runnerIds.includes(id), `roster seat "${id}" has no runner — it would throw on dispatch`);
  }
});

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);
process.exit(failed > 0 ? 1 : 0);
