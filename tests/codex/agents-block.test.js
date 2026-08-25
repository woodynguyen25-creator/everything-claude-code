/**
 * Tests for scripts/codex/sync-codex-agents.js — the AIOS block in ~/.codex/AGENTS.md.
 *
 * Run with: node tests/codex/agents-block.test.js
 *
 * WHY THIS FILE EXISTS
 * On 2026-08-24 the Codex side of the stack was measured against the Claude side:
 * ~/.codex/AGENTS.md (the only always-loaded file) had ZERO mention of the council,
 * and the Codex copy of the council skill was five weeks stale. Sol could not summon
 * the council the way Claude does because nothing it loads told it how.
 *
 * The block is generated from roster.js. These tests hold the generator to the
 * roster and hold the installed file to the generator, so the block cannot rot the
 * way three hand-written rosters before it did.
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const { SEATS, LEAD_SEATS, WORKER_SEATS, VISION_SEATS, SEARCH_SEATS } = require('../../scripts/council/roster');
const { buildBlock, apply, BEGIN, END, ANCHOR, TARGET } = require('../../scripts/codex/sync-codex-agents');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (err) { console.log(`  ✗ ${name}`); console.log(`    ${err.message}`); failed++; }
}

console.log('\n=== Codex AGENTS.md block: generator ===\n');
const block = buildBlock();

test('the block carries the council command with the flags that exist', () => {
  assert.ok(block.includes('council.js'), 'council.js path missing');
  for (const flag of ['--image', '--research', '--private', '--trading', '--decide', '--rounds 2']) {
    assert.ok(block.includes(flag), `flag ${flag} missing from the block`);
  }
});

test('every LEAD and WORKER seat appears with the model roster.js declares', () => {
  for (const id of [...LEAD_SEATS, ...WORKER_SEATS]) {
    const s = SEATS.find(x => x.id === id);
    assert.ok(block.includes(`\`${id}\`=${s.model}`), `seat ${id} (${s.model}) missing`);
  }
});

test('the block names the sighted seats and the search seat', () => {
  for (const id of VISION_SEATS) assert.ok(block.includes(`\`${id}\``), `sighted seat ${id} missing`);
  for (const id of SEARCH_SEATS) assert.ok(block.includes(`\`${id}\``), `search seat ${id} missing`);
});

test('the block keeps the evaluate-only trading rule and bans the level-correlating MCP tool', () => {
  assert.match(block, /EVALUATES only/);
  assert.match(block, /NEVER the MCP `price_correlation`/);
});

test('the block stays small enough to live in an always-loaded file', () => {
  assert.ok(block.length < 4000, `block is ${block.length} bytes; AGENTS.md is loaded every turn — keep it under 4KB`);
});

console.log('\n=== Codex AGENTS.md block: apply ===\n');

test('a file with no block gets it inserted directly after the OMX autonomy directive', () => {
  const src = `<!-- AUTONOMY DIRECTIVE -->\nGO.\n${ANCHOR}<!-- omx:generated:agents-md -->\n\n# oh-my-codex\n`;
  const res = apply(src, block);
  assert.equal(res.status, 'missing');
  assert.ok(res.next.indexOf(BEGIN) > res.next.indexOf(ANCHOR), 'block must follow the anchor');
  assert.ok(res.next.indexOf(BEGIN) < res.next.indexOf('# oh-my-codex'), 'block must precede the OMX body');
  assert.ok(res.next.includes('<!-- omx:generated:agents-md -->'), 'OMX marker must survive');
});

test('a file with no anchor gets the block prepended, never dropped', () => {
  const res = apply('# some other AGENTS.md\n', block);
  assert.equal(res.status, 'missing');
  assert.ok(res.next.startsWith(BEGIN));
});

test('a STALE block is rewritten in place and the rest of the file is untouched', () => {
  const src = `head\n${BEGIN}\nold roster: Grok-4.5 lead, no gemini seat\n${END}\ntail\n`;
  const res = apply(src, block);
  assert.equal(res.status, 'stale');
  assert.ok(res.next.startsWith('head\n'));
  assert.ok(res.next.endsWith('\ntail\n'));
  assert.ok(!res.next.includes('Grok-4.5 lead'));
  assert.equal(apply(res.next, block).status, 'current');
});

test('a half-present marker pair is reported, not silently overwritten', () => {
  assert.equal(apply(`x\n${BEGIN}\ny\n`, block).status, 'broken-markers');
});

console.log('\n=== Codex AGENTS.md block: the installed file ===\n');

test('the installed ~/.codex/AGENTS.md carries the current block', () => {
  if (!fs.existsSync(TARGET)) { console.log('    (no ~/.codex/AGENTS.md on this machine — nothing to check)'); return; }
  const res = apply(fs.readFileSync(TARGET, 'utf8'), block);
  assert.equal(res.status, 'current', `${TARGET} is ${res.status} — run: node scripts/codex/sync-codex-agents.js`);
});

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);
process.exit(failed > 0 ? 1 : 0);
