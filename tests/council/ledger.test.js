/**
 * Tests for scripts/council/ledger.js + providers.js pure helpers
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { buildEntry, appendEntries, readRecent, summarize } = require('../../scripts/council/ledger');
const { parseCodexOutput, stripAnsi } = require('../../scripts/council/providers');

// buildEntry shapes a provider result into a ledger row
{
  const entry = buildEntry(
    { provider: 'gemini', model: 'gemini-2.5-flash', ok: true, text: 'hello', ms: 1234 },
    { tag: 'test', promptChars: 42 },
  );
  assert.equal(entry.provider, 'gemini');
  assert.equal(entry.ok, true);
  assert.equal(entry.ms, 1234);
  assert.equal(entry.outputChars, 5);
  assert.equal(entry.promptChars, 42);
  assert.equal(entry.tag, 'test');
  assert.ok(entry.ts.includes('T'), 'ts is ISO');
  assert.equal(entry.error, undefined);
}

// failed results keep the error string
{
  const entry = buildEntry({ provider: 'codex', model: 'gpt-5.5-codex', ok: false, text: '', ms: 9, error: 'timeout' });
  assert.equal(entry.ok, false);
  assert.equal(entry.error, 'timeout');
  assert.equal(entry.outputChars, 0);
}

// appendEntries + readRecent round-trip through a temp ledger
{
  const tmp = path.join(os.tmpdir(), `council-ledger-test-${Date.now()}.jsonl`);
  const a = buildEntry({ provider: 'deepseek', model: 'deepseek-chat', ok: true, text: 'x'.repeat(10), ms: 50 }, { tag: 'rt' });
  const b = buildEntry({ provider: 'groq', model: 'llama-3.3-70b-versatile', ok: false, text: '', ms: 5, error: 'HTTP 429' });
  appendEntries([a, b], tmp);
  const back = readRecent(10, tmp);
  assert.equal(back.length, 2);
  assert.equal(back[0].provider, 'deepseek');
  assert.equal(back[1].error, 'HTTP 429');
  const limited = readRecent(1, tmp);
  assert.equal(limited.length, 1);
  assert.equal(limited[0].provider, 'groq');
  fs.unlinkSync(tmp);
}

// readRecent on a missing file returns []
{
  assert.deepEqual(readRecent(5, path.join(os.tmpdir(), 'council-no-such-ledger.jsonl')), []);
}

// summarize groups today's entries per provider
{
  const today = new Date().toISOString();
  const entries = [
    { ts: today, provider: 'codex', ok: true, ms: 100, outputChars: 10 },
    { ts: today, provider: 'codex', ok: false, ms: 50, outputChars: 0 },
    { ts: '2020-01-01T00:00:00.000Z', provider: 'codex', ok: true, ms: 999, outputChars: 999 },
  ];
  const sum = summarize(entries);
  assert.equal(sum.codex.calls, 2);
  assert.equal(sum.codex.ok, 1);
  assert.equal(sum.codex.ms, 150);
}

// parseCodexOutput extracts the message after the final "tokens used" line
{
  const fake = 'codex\nthinking...\ntokens used\n44,052\nPONG';
  const parsed = parseCodexOutput(fake);
  assert.ok(parsed.includes('PONG'));
  assert.ok(!parsed.includes('thinking'), 'pre-marker noise stripped');
}

// stripAnsi removes ESC[..m color codes
{
  const esc = String.fromCharCode(27);
  assert.equal(stripAnsi(`${esc}[35mhi${esc}[0m`), 'hi');
}

console.log('✓ council ledger tests passed');
