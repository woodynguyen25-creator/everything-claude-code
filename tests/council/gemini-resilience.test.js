/**
 * Gemini seat resilience (2026-09-22).
 *
 * Two live failures, both measured the day this file was written:
 *
 *  1. VISION — the Gemini API answered HTTP 503 "model overloaded" on 57 of 71
 *     image dispatches since 8/22 (80%). A probe that day: gemini-flash-latest,
 *     3.8-flash and 3.7-flash went 0/15; gemini-flash-lite-latest went 5/5 in <1s.
 *     An overloaded primary must step down a fixed ladder instead of dropping the
 *     seat — and the ledger must say which model actually answered.
 *
 *  2. TEXT (agy) — agy auto-updated 2026-09-22 12:57. On code questions the model
 *     now reaches for a command tool, headless mode auto-denies it, and agy exits
 *     0 with EMPTY stdout ("jetski: no output produced ..." on stderr). runAgy
 *     read exit 0 as success, so the council logged a seat that answered and said
 *     nothing. Empty output must be a failure, and agy prompts must carry the
 *     [NO TOOLS] line even when a caller forgets it.
 *
 * Run: node tests/council/gemini-resilience.test.js
 */
const assert = require('node:assert/strict');
const P = require('../../scripts/council/providers');

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${e.message}`); failed++; }
}

function stubFetch(byModel) {
  const calls = [];
  global.fetch = async (url) => {
    const model = String(url).match(/models\/([^:]+):generateContent/)[1];
    calls.push(model);
    const [status, body] = byModel[model] || [500, 'unexpected model'];
    return { ok: status === 200, status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) };
  };
  return calls;
}
const OK = (t) => [200, { candidates: [{ content: { parts: [{ text: t }] } }] }];
const IMG = [{ mime: 'image/png', b64: 'AAAA' }];
const env = { GEMINI_API_KEY: 'test' };

(async () => {
  console.log('\n=== Gemini vision: overload fallback ladder ===\n');
  const realFetch = global.fetch;

  await test('an overloaded primary steps down to the next model and the label names who answered', async () => {
    const calls = stubFetch({
      'gemini-flash-latest': [503, 'overloaded'],
      'gemini-flash-lite-latest': OK('a dashboard'),
    });
    const r = await P.SEATS.gemini('what is this?', env, { images: IMG });
    assert.equal(r.ok, true, r.error);
    assert.equal(r.text, 'a dashboard');
    assert.deepEqual(calls, ['gemini-flash-latest', ...P.GEMINI_VISION_LADDER]);
    assert.match(r.model, /gemini-flash-lite-latest/);
    assert.match(r.model, /fallback/);
  });

  await test('a 429 quota response also steps down', async () => {
    const calls = stubFetch({ 'gemini-flash-latest': [429, 'quota'], 'gemini-flash-lite-latest': OK('ok') });
    const r = await P.SEATS.gemini('q', env, { images: IMG });
    assert.equal(r.ok, true);
    assert.deepEqual(calls, ['gemini-flash-latest', 'gemini-flash-lite-latest']);
  });

  await test('a healthy primary is used alone and labelled as itself', async () => {
    const calls = stubFetch({ 'gemini-flash-latest': OK('fine') });
    const r = await P.SEATS.gemini('q', env, { images: IMG });
    assert.equal(r.ok, true);
    assert.deepEqual(calls, ['gemini-flash-latest']);
    assert.equal(r.model, 'gemini-flash-latest (vision)');
  });

  await test('a NON-overload error (400) does not fall back — a bad request is not masked', async () => {
    const calls = stubFetch({ 'gemini-flash-latest': [400, 'bad image'] });
    const r = await P.SEATS.gemini('q', env, { images: IMG });
    assert.equal(r.ok, false);
    assert.deepEqual(calls, ['gemini-flash-latest']);
    assert.match(r.error, /HTTP 400/);
  });

  await test('every rung overloaded → a failure that lists each attempt', async () => {
    stubFetch({ 'gemini-flash-latest': [503, 'x'], 'gemini-flash-lite-latest': [503, 'x'] });
    const r = await P.SEATS.gemini('q', env, { images: IMG });
    assert.equal(r.ok, false);
    for (const m of ['gemini-flash-latest', 'gemini-flash-lite-latest']) assert.match(r.error, new RegExp(m));
  });

  await test('a primary that HANGS is cut off by the rung cap and the next rung answers', async () => {
    const calls = [];
    global.fetch = async (url, init) => {
      const model = String(url).match(/models\/([^:]+):generateContent/)[1];
      calls.push(model);
      if (model === 'gemini-flash-latest') {
        // honour the abort signal exactly like real fetch does
        return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('The operation was aborted due to timeout'))));
      }
      return { ok: true, status: 200, text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: 'lite' }] } }] }) };
    };
    // AbortSignal.timeout's timer is unref'd: with a stubbed fetch nothing else holds the
    // event loop open and node would exit mid-test. A real socket does that job live.
    const keepAlive = setInterval(() => {}, 1000);
    const t0 = Date.now();
    const r = await P.SEATS.gemini('q', env, { images: IMG, timeoutMs: 300 }).finally(() => clearInterval(keepAlive));
    assert.equal(r.ok, true, r.error);
    assert.deepEqual(calls, ['gemini-flash-latest', 'gemini-flash-lite-latest']);
    assert.ok(Date.now() - t0 < 5000, 'the cap must bound the wait');
  });

  global.fetch = realFetch;

  console.log('\n=== agy text seat: empty output and the no-tools line ===\n');

  await test('exit 0 with EMPTY stdout is a failure carrying agy\'s stderr, not a silent success', () => {
    const r = P.interpretAgyExit(0, '', 'jetski: no output produced — a tool required the "command" permission that headless mode cannot prompt for');
    assert.equal(r.ok, false);
    assert.match(r.error, /agy-empty/);
    assert.match(r.error, /command/);
  });

  await test('exit 0 with text is a success', () => {
    const r = P.interpretAgyExit(0, '  YES \n', '');
    assert.deepEqual({ ok: r.ok, text: r.text }, { ok: true, text: 'YES' });
  });

  await test('non-zero exit keeps the existing transient/refusal classification', () => {
    const r = P.interpretAgyExit(1, '', 'Error: permission check failed for command "Get-Item"');
    assert.equal(r.ok, false);
    assert.match(r.error, /^exit 1 \[agy-(transient|refusal)\]/);
  });

  await test('an agy prompt without a tools line gets [NO TOOLS] appended', () => {
    const out = P.withAgyToolLine('Is 2 prime?');
    assert.match(out, /\[NO TOOLS\]/);
    assert.ok(out.startsWith('Is 2 prime?'));
  });

  await test('a prompt that already carries [NO TOOLS] or [TOOLS] is left alone (no double line)', () => {
    const a = 'q\n[NO TOOLS] You have NO filesystem.';
    const b = 'q\n[TOOLS] For THIS dispatch you HAVE live web search';
    assert.equal(P.withAgyToolLine(a), a);
    assert.equal(P.withAgyToolLine(b), b);
  });

  console.log(`\n=== Test Results ===\nPassed: ${passed}\nFailed: ${failed}\nTotal:  ${passed + failed}`);
  process.exit(failed ? 1 : 0);
})();
