/**
 * Tests for scripts/codex/sync-codex-doctrine.js — Sol's doctrine vs CLAUDE.md.
 *
 * Run with: node tests/codex/doctrine.test.js
 *
 * WHY THIS FILE EXISTS
 * Measured 2026-08-25: Codex's `developer_instructions` announced itself as
 * "ported from Claude CLAUDE.md 2026-07-16". CLAUDE.md had been REWRITTEN
 * 2026-08-06. Sol was missing the External-value gate — the file's own
 * "most-violated, newest rule" — plus skill routing, the build pipeline, the
 * research budget and REVISIT-IF, while still obeying a "3-10 numbered questions"
 * quota the rewrite had cut to 1-3.
 *
 * Nothing detected that for 19 days, because a hand-ported doctrine has no owner
 * once it is pasted. These tests give it one.
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  buildInstructions, apply, translationBlock, BEGIN, END, CLAUDE_MD, CONFIG,
  buildMarkdownBlock, applyMarkdown, MD_BEGIN, MD_END, MD_ANCHOR, AGENTS,
} = require('../../scripts/codex/sync-codex-doctrine');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (err) { console.log(`  ✗ ${name}`); console.log(`    ${err.message}`); failed++; }
}

const haveCanon = fs.existsSync(CLAUDE_MD);
if (!haveCanon) {
  console.log('\n(no ~/.claude/CLAUDE.md on this machine — generator tests skipped)\n');
}

console.log('\n=== Codex doctrine: the canon is embedded, not paraphrased ===\n');

if (haveCanon) {
  const canon = fs.readFileSync(CLAUDE_MD, 'utf8').trim();
  const built = buildInstructions();

  test('CLAUDE.md appears VERBATIM — a paraphrase is what rotted three rosters and the doctrine', () => {
    assert.ok(built.includes(canon), 'the canon must be embedded byte-for-byte');
  });

  test('every top-level CLAUDE.md section reaches Sol', () => {
    const headings = canon.split('\n').filter(l => l.startsWith('## '));
    assert.ok(headings.length >= 5, `expected the rewritten CLAUDE.md structure, saw ${headings.length} sections`);
    for (const h of headings) assert.ok(built.includes(h), `section "${h}" missing`);
  });

  test('the rules the 2026-07-16 port was missing are present', () => {
    // Each of these was verified ABSENT from Sol's doctrine on 2026-08-25.
    for (const rule of ['External-value gate', 'REVISIT-IF', 'skills-active.tsv']) {
      assert.ok(built.includes(rule), `"${rule}" — a post-rewrite rule — is missing`);
    }
  });

  test('the translation block is OUTSIDE the canon markers, so it can never read as canon', () => {
    const canonBlock = built.slice(built.indexOf(BEGIN), built.indexOf(END));
    assert.ok(!canonBlock.includes('CODEX TRANSLATION'), 'translation must not sit inside the canon block');
    assert.ok(built.indexOf('CODEX TRANSLATION') > built.indexOf(END), 'translation must follow the canon');
  });

  test('the translation covers the Claude-only mechanisms the canon names', () => {
    const t = translationBlock();
    for (const m of ['$name', 'Stop hook', 'MEMORY.md', 'skill-scout']) {
      assert.ok(t.includes(m), `translation does not cover "${m}"`);
    }
  });

  test('Sol is told it is NOT trying to be Claude — decorrelation is the point', () => {
    assert.match(built, /EXECUTOR/);
    assert.match(built, /NEVER grade your own work/);
    assert.match(built, /correlated clones/);
  });

  test('the sandbox honesty rule survives the port', () => {
    assert.match(built, /UNVERIFIED/);
    assert.match(built, /EPERM/);
  });
}

console.log('\n=== Codex doctrine: apply ===\n');

test('a config whose field already matches reports "current"', () => {
  const src = 'a = 1\ndeveloper_instructions = "X"\nb = 2\n';
  assert.equal(apply(src, 'X').status, 'current');
});

test('a STALE field is replaced and the rest of the TOML is untouched', () => {
  const src = 'model = "gpt-5.6-sol"\ndeveloper_instructions = "the July port"\nservice_tier = "default"\n';
  const res = apply(src, 'the August canon\nwith a newline and a "quote"');
  assert.equal(res.status, 'stale');
  assert.ok(res.next.includes('model = "gpt-5.6-sol"'), 'sibling keys must survive');
  assert.ok(res.next.includes('service_tier = "default"'), 'sibling keys must survive');
  assert.ok(!res.next.includes('the July port'), 'stale doctrine must be gone');
  const TOML = require('@iarna/toml');
  assert.equal(TOML.parse(res.next).developer_instructions, 'the August canon\nwith a newline and a "quote"');
});

test('a config with no developer_instructions is reported, not silently skipped', () => {
  assert.equal(apply('model = "x"\n', 'Y').status, 'no-field');
});

console.log('\n=== Codex doctrine: the AGENTS.md channel (what the DESKTOP APP reads) ===\n');

if (haveCanon) {
  const canonText = fs.readFileSync(CLAUDE_MD, 'utf8').trim();

  test('the markdown block embeds the canon verbatim too', () => {
    // Measured 2026-08-25 by asking the SAME question on both surfaces:
    //   `codex exec` CLI  -> "External-value gate" FOUND in active instructions
    //   Codex desktop app -> NOT FOUND
    // config.toml `developer_instructions` is a CLI-only channel. A doctrine that
    // lives only there is invisible on the surface Woody actually types into, and
    // no number of restarts fixes a wrong channel.
    assert.ok(buildMarkdownBlock().includes(canonText), 'the AGENTS.md block must carry CLAUDE.md byte-for-byte');
  });

  test('the markdown block lands after the capability block and before the OMX body', () => {
    const src = `head\n${MD_ANCHOR}\n\n<!-- omx:generated:agents-md -->\n# oh-my-codex\n`;
    const res = applyMarkdown(src, buildMarkdownBlock());
    assert.equal(res.status, 'missing');
    assert.ok(res.next.indexOf(MD_BEGIN) > res.next.indexOf(MD_ANCHOR), 'must follow the capability block');
    assert.ok(res.next.indexOf(MD_BEGIN) < res.next.indexOf('# oh-my-codex'), 'must precede the OMX body');
  });

  test('a stale markdown block is rewritten; a half-marker pair is reported', () => {
    const b = buildMarkdownBlock();
    const res = applyMarkdown(`x\n${MD_BEGIN}\nthe July doctrine\n${MD_END}\ny\n`, b);
    assert.equal(res.status, 'stale');
    assert.ok(!res.next.includes('the July doctrine'));
    assert.equal(applyMarkdown(res.next, b).status, 'current');
    assert.equal(applyMarkdown(`x\n${MD_BEGIN}\ny\n`, b).status, 'broken-markers');
  });

  test('the installed AGENTS.md carries the current doctrine block', () => {
    if (!fs.existsSync(AGENTS)) { console.log('    (no ~/.codex/AGENTS.md here — nothing to check)'); return; }
    const res = applyMarkdown(fs.readFileSync(AGENTS, 'utf8'), buildMarkdownBlock());
    assert.equal(res.status, 'current', `AGENTS.md doctrine is ${res.status} — run: node scripts/codex/sync-codex-doctrine.js`);
  });
}

console.log('\n=== Codex doctrine: the installed config ===\n');

test('the installed Codex config carries the current canon', () => {
  if (!haveCanon || !fs.existsSync(CONFIG)) {
    console.log('    (no Codex config or no CLAUDE.md on this machine — nothing to check)');
    return;
  }
  const res = apply(fs.readFileSync(CONFIG, 'utf8'), buildInstructions());
  assert.equal(res.status, 'current', `Sol's doctrine is ${res.status} — run: node scripts/codex/sync-codex-doctrine.js`);
});

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);
process.exit(failed > 0 ? 1 : 0);
