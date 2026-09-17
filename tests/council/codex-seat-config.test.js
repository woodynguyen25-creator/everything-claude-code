/**
 * Tests for the council's private Codex home config (scripts/council/providers.js).
 *
 * Run with: node tests/council/codex-seat-config.test.js
 *
 * WHY THIS FILE EXISTS
 * The council's codex/Astra seat runs `codex exec` from a private CODEX_HOME so that
 * nothing in Woody's interactive ~/.codex (1,950 skills, 27 plugins, 15 MCP servers,
 * a 47KB AGENTS.md) reaches it. On 2026-09-17 that isolation turned out to have one
 * hole: the seat still runs with cwd = this repo, so Codex loaded the REPO's AGENTS.md
 * on every call. Measured, one-line prompt, same launcher:
 *
 *   as-is ............ 10,873 tokens
 *   project doc off ..  2,311 tokens   (-79%)
 *
 * The council convenes before every trade analysis, so the leak compounded. These
 * tests hold the four settings that keep the seat lean, fast and predictable.
 */
'use strict';

const assert = require('node:assert/strict');
const TOML = require('@iarna/toml');

const {
  COUNCIL_CODEX_CONFIG, CODEX_MODEL, codexFailureReason, USAGE_LIMIT,
} = require('../../scripts/council/providers');
const { SEATS } = require('../../scripts/council/roster');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (err) { console.log(`  ✗ ${name}`); console.log(`    ${err.message}`); failed++; }
}

console.log('\n=== Council codex seat: private CODEX_HOME config ===\n');

const cfg = TOML.parse(COUNCIL_CODEX_CONFIG);

test('the config is valid TOML', () => {
  assert.equal(typeof cfg, 'object');
});

test('project AGENTS.md is disabled — the 79% token leak', () => {
  // Without this the seat reads 14KB of ECC contributor rules and a stale memory dump
  // before every council question. The seat can still open AGENTS.md on purpose.
  assert.equal(cfg.project_doc_max_bytes, 0);
});

test('the seat pins the same model roster.js declares for it', () => {
  const seat = SEATS.find(s => s.id === 'codex');
  assert.ok(seat, 'roster has a codex seat');
  assert.equal(cfg.model, seat.model, 'providers.js and roster.js must agree or the skill doc lies');
  assert.equal(cfg.model, CODEX_MODEL);
});

test('effort is pinned to high, never inherited', () => {
  // 2026-07-26: interactive config drifted to xhigh and caused 19 of 83 council timeouts.
  assert.equal(cfg.model_reasoning_effort, 'high');
});

test('the config carries nothing that would re-open the isolation', () => {
  // A private home is only private if it declares none of these. Any of them would pull
  // the interactive environment's weight back into every council call.
  for (const key of ['mcp_servers', 'plugins', 'hooks', 'developer_instructions', 'marketplaces', 'features']) {
    assert.equal(cfg[key], undefined, `council seat config must not set "${key}"`);
  }
});

console.log('\n=== Council codex seat: the ChatGPT plan cap ===\n');

// Verbatim stderr from a real `codex exec` on 2026-09-17 (ANSI stripped): the ~250-char session
// header comes FIRST, which is why the old `slice(0, 300)` could lose the reason entirely.
const REAL_CAP_STDERR = [
  'OpenAI Codex v0.153.1 (research preview)',
  '--------',
  'workdir: C:\\Github Repos\\everything-claude-code',
  'model: gpt-6-astra',
  'provider: openai',
  'approval: on-request',
  'sandbox: workspace-write [workdir, /tmp, $TMPDIR] (network access enabled)',
  'reasoning effort: high',
  'reasoning summaries: none',
  'session id: 01a0affc-8765-7a11-9322-1ea3c6fdcd10',
  '--------',
  'user',
  'Reply with exactly: OK',
  "\u001b[31mERROR:\u001b[0m You've hit your usage limit. Upgrade to Pro (https://chatgpt.com/explore/pro), visit https://chatgpt.com/codex/settings/usage to purchase more credits or try again at 2:20 PM.",
  "ERROR: You've hit your usage limit. Upgrade to Pro (https://chatgpt.com/explore/pro), visit https://chatgpt.com/codex/settings/usage to purchase more credits or try again at 2:20 PM.",
].join('\n');

test('the real plan-cap failure is named USAGE-LIMIT and carries the return time', () => {
  const reason = codexFailureReason(REAL_CAP_STDERR, '', 1);
  assert.ok(reason.startsWith(`${USAGE_LIMIT}:`), reason);
  assert.match(reason, /Astra back at 2:20 PM$/);
});

test('the reason survives the degraded-quorum banner, which keeps only 100 chars', () => {
  const shown = codexFailureReason(REAL_CAP_STDERR, '', 1).slice(0, 100);
  assert.match(shown, /2:20 PM/, `banner would show: ${shown}`);
});

test('the old handler really did lose it — this is the bug, not a hypothetical', () => {
  const old = `exit 1: ${REAL_CAP_STDERR.replace(/\u001b\[[0-9;]*m/g, '')}`.slice(0, 300).slice(0, 100);
  assert.ok(!/usage limit/i.test(old), 'if this ever passes, the header shrank and the test premise needs re-checking');
});

test('a cap message on stdout is caught too', () => {
  assert.ok(codexFailureReason('', "ERROR: You've hit your usage limit. ... try again at 9:05 AM.", 1).includes('at 9:05 AM'));
});

test('a cap message with no return time still names the cause', () => {
  const r = codexFailureReason("ERROR: You've hit your usage limit.", '', 1);
  assert.ok(r.startsWith(USAGE_LIMIT));
  assert.match(r, /after the plan window resets/);
});

test('an ordinary failure keeps the old exit-code form', () => {
  assert.equal(codexFailureReason('boom: model not found', '', 2), 'exit 2: boom: model not found');
});

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);
process.exit(failed > 0 ? 1 : 0);
