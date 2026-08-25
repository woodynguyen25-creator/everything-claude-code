/**
 * Tests for scripts/council/sync-skill-doc.js — DOC-VS-ROSTER DRIFT.
 *
 * Run with: node tests/council/skill-doc.test.js
 *
 * WHY THIS FILE EXISTS
 * On 2026-08-23 the council gained the ability to read images. Woody told another
 * session so, and that session said no, it cannot — and it was right to, given what
 * it had read. The skill doc a session loads still described an early-August roster:
 * "Grok-4.5 lead", cerebras alive, groq on a decommissioned llama id, no gemini seat,
 * no haiku seat, and none of --private / --research / --decide / --image.
 *
 * That is the THIRD hand-maintained copy of seat placement to rot, in a file whose
 * source of truth opens by calling itself "the SINGLE SOURCE OF TRUTH for seat
 * placement". Updating the doc by hand had already been done twice and bought about
 * three weeks each time, so the doc no longer states the roster: it generates it.
 *
 * These tests hold the generated block against roster.js. They are the difference
 * between "we fixed the doc" and "the doc cannot silently go wrong again" — a
 * capability nobody can verify is exactly how the original bug shipped.
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  SEATS, LEAD_SEATS, WORKER_SEATS, BENCHED_SEATS, VISION_SEATS, SEARCH_SEATS,
} = require('../../scripts/council/roster');
const { buildBlock, apply, mirrorStatus, BEGIN, END, TARGETS, MIRRORS } = require('../../scripts/council/sync-skill-doc');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

console.log('\n=== Council skill doc: the generated block ===\n');

const block = buildBlock();

test('every seat in every tier appears in the generated block', () => {
  for (const id of [...LEAD_SEATS, ...WORKER_SEATS, ...BENCHED_SEATS]) {
    assert.ok(block.includes(`\`${id}\``), `seat "${id}" is missing from the generated roster block`);
  }
});

test('every seat is listed with the model roster.js currently declares', () => {
  // The 8/23 doc advertised "llama-3.3-70b" months after Groq decommissioned it and
  // "Grok-4.5" after the 4.6 upgrade. A model id in prose is a model id that rots.
  for (const seat of SEATS) {
    if (![...LEAD_SEATS, ...WORKER_SEATS, ...BENCHED_SEATS].includes(seat.id)) continue;
    assert.ok(block.includes(seat.model), `seat "${seat.id}" model "${seat.model}" is not in the block`);
  }
});

test('the block names exactly the seats that can see, and exactly those that cannot', () => {
  for (const id of VISION_SEATS) {
    assert.ok(block.includes(`\`${id}\``), `sighted seat "${id}" missing`);
  }
  const blind = SEATS.filter(s => !s.vision).map(s => s.id);
  const blindLine = block.split('\n').find(l => l.includes('**Blind**'));
  assert.ok(blindLine, 'the block must state which seats are blind');
  for (const id of blind) {
    assert.ok(blindLine.includes(`\`${id}\``), `blind seat "${id}" must be named on the blind line`);
  }
  for (const id of VISION_SEATS) {
    assert.ok(!blindLine.includes(`\`${id}\``), `sighted seat "${id}" must NOT appear on the blind line`);
  }
});

test('the block names the search-capable seat', () => {
  const searchLine = block.split('\n').find(l => l.includes('Live web'));
  assert.ok(searchLine, 'the block must state which seat can search');
  for (const id of SEARCH_SEATS) assert.ok(searchLine.includes(`\`${id}\``), `search seat "${id}" missing`);
});

test('a benched seat is never presented as a live default', () => {
  // cerebras spent weeks in the old doc as a working worker while returning HTTP 402
  // on every call. Benched seats belong under the BENCHED heading, nowhere else.
  const benchedSection = block.slice(block.indexOf('**BENCHED'));
  for (const id of BENCHED_SEATS) {
    assert.ok(benchedSection.includes(`\`${id}\``), `benched seat "${id}" must appear under BENCHED`);
  }
  const leadSection = block.slice(block.indexOf('**LEAD'), block.indexOf('**WORKER'));
  for (const id of BENCHED_SEATS) {
    assert.ok(!leadSection.includes(`\`${id}\``), `benched seat "${id}" must not appear in the LEAD table`);
  }
});

console.log('\n=== Council skill doc: drift detection ===\n');

test('a doc containing the current block reports "current"', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'council-doc-'));
  const f = path.join(dir, 'SKILL.md');
  fs.writeFileSync(f, `# doc\n\n${block}\n\ntail\n`);
  assert.equal(apply(f, block).status, 'current');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a doc with a STALE block is detected, not silently accepted', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'council-doc-'));
  const f = path.join(dir, 'SKILL.md');
  fs.writeFileSync(f, `# doc\n\n${BEGIN}\nGrok-4.5 lead, cerebras alive, no gemini seat\n${END}\n`);
  const res = apply(f, block);
  assert.equal(res.status, 'stale');
  assert.ok(res.next.includes('grok-4.6'), 'the rewrite must carry the current model id');
  assert.ok(!res.next.includes('Grok-4.5 lead'), 'the rewrite must remove the stale claim');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a doc with no markers is reported, not quietly skipped', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'council-doc-'));
  const f = path.join(dir, 'SKILL.md');
  fs.writeFileSync(f, '# doc with no generated block\n');
  assert.equal(apply(f, block).status, 'no-markers');
  fs.rmSync(dir, { recursive: true, force: true });
});

console.log('\n=== Council skill doc: the installed copies are in sync ===\n');

test('every skill doc that exists on this machine is up to date with roster.js', () => {
  // THIS is the assertion that would have caught the original bug: it fails the
  // suite the moment roster.js changes and the doc a session reads does not.
  //
  // The target lives in the USER skills directory, deliberately outside this public
  // repo (see sync-skill-doc.js for why). So it is absent in CI and on any other
  // machine, and absence must NOT fail — a green CI run here means "nothing stale
  // was found", not "the doc was verified". The invariants above cover the
  // generator itself and DO run everywhere.
  const present = TARGETS.filter(f => fs.existsSync(f));
  if (present.length === 0) {
    console.log('    (no installed council skill doc on this machine — nothing to check)');
    return;
  }
  for (const f of present) {
    const res = apply(f, block);
    assert.equal(res.status, 'current',
      `${f} is ${res.status} — run: node scripts/council/sync-skill-doc.js`);
  }
});

test('an installed skill doc says in its frontmatter that the seats can see', () => {
  // The description field is what the retrieval hook scores and injects. If it does
  // not mention images, a session asking "can the council see this screenshot" never
  // gets the card that would tell it yes — which is precisely how this whole bug
  // was reported: the capability shipped, the description did not.
  for (const f of TARGETS.filter(x => fs.existsSync(x))) {
    const src = fs.readFileSync(f, 'utf8');
    const fm = src.slice(0, src.indexOf('---', 4));
    assert.match(fm, /image/i, `${f}: frontmatter description must mention image capability`);
  }
});

console.log('\n=== Council skill doc: the Codex mirror ===\n');

test('a mirror that matches its source reports "current"; a drifted one reports "stale" with the source as the fix', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'council-mirror-'));
  const from = path.join(dir, 'claude', 'council', 'SKILL.md');
  const to = path.join(dir, 'codex', 'skills', 'council', 'SKILL.md');
  fs.mkdirSync(path.dirname(from), { recursive: true });
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(from, `# doc\n${block}\n`);
  fs.writeFileSync(to, '# the 2026-07-16 copy: no --image, no --research, old privacy default\n');
  const res = mirrorStatus(from, to);
  assert.equal(res.status, 'stale');
  assert.equal(res.next, fs.readFileSync(from, 'utf8'), 'the fix must be the byte-exact source doc');
  fs.writeFileSync(to, res.next);
  assert.equal(mirrorStatus(from, to).status, 'current');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a machine with no ~/.codex/skills is "absent", never a failure', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'council-mirror-'));
  const from = path.join(dir, 'SKILL.md');
  fs.writeFileSync(from, '# doc\n');
  assert.equal(mirrorStatus(from, path.join(dir, 'no-such-codex', 'skills', 'council', 'SKILL.md')).status, 'absent');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('the installed Codex council skill is a byte-exact mirror of the Claude one', () => {
  // The Codex copy sat 5 weeks behind (2026-07-16 → 2026-08-24) because the compat
  // sync never overwrites. Sol answered council questions from a roster that had no
  // eyes, no search, and the inverted privacy default. This is the assertion that
  // turns that into a test failure the same day.
  const present = MIRRORS.map(m => mirrorStatus(m.from, m.to)).filter(r => r.status !== 'absent');
  if (present.length === 0) {
    console.log('    (no ~/.codex on this machine — nothing to mirror)');
    return;
  }
  for (const r of present) {
    assert.equal(r.status, 'current', `${r.to} is ${r.status} — run: node scripts/council/sync-skill-doc.js`);
  }
});

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);
process.exit(failed > 0 ? 1 : 0);
