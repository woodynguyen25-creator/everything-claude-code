/**
 * gemini-watch request building. The live call is proven by hand (see the
 * script header); these pin the parts that decide what gets sent.
 *
 * Run: node tests/gemini/watch.test.js
 */
const assert = require('node:assert/strict');
const W = require('../../scripts/gemini/watch');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${e.message}`); failed++; }
}

console.log('\n=== gemini-watch ===\n');

test('a YouTube URL is sent as a file URI, never downloaded or read from disk', () => {
  const part = W.videoPart('https://www.youtube.com/watch?v=abc', () => { throw new Error('read the disk'); });
  assert.deepEqual(part, { file_data: { file_uri: 'https://www.youtube.com/watch?v=abc' } });
});

test('youtu.be and shorts links count as YouTube too', () => {
  for (const u of ['https://youtu.be/abc', 'https://youtube.com/shorts/abc']) {
    assert.ok(W.videoPart(u, () => { throw new Error('disk'); }).file_data, u);
  }
});

test('a local file is inlined as base64 with a video mime type', () => {
  const part = W.videoPart('clip.mp4', () => Buffer.from('hello'));
  assert.equal(part.inline_data.mime_type, 'video/mp4');
  assert.equal(part.inline_data.data, Buffer.from('hello').toString('base64'));
});

test('.webm gets its own mime type', () => {
  assert.equal(W.videoPart('clip.webm', () => Buffer.from('x')).inline_data.mime_type, 'video/webm');
});

test('a file over the inline limit is refused, not sent to fail at the API', () => {
  assert.throws(() => W.videoPart('big.mp4', () => ({ length: W.INLINE_LIMIT + 1 })), /inline limit/);
});

test('the question goes first, then the video', () => {
  const req = W.buildRequest('what moves?', { file_data: { file_uri: 'u' } });
  assert.equal(req.contents[0].parts[0].text, 'what moves?');
  assert.ok(req.contents[0].parts[1].file_data);
});

test('args: source + question required; --model overrides the free-tier default', () => {
  assert.throws(() => W.parseArgs(['only-source']), /usage/);
  assert.equal(W.parseArgs(['a.mp4', 'q']).model, W.DEFAULT_MODEL);
  assert.equal(W.parseArgs(['a.mp4', 'q', '--model', 'gemini-3.8-flash']).model, 'gemini-3.8-flash');
});

console.log(`\n=== Test Results ===\nPassed: ${passed}\nFailed: ${failed}\nTotal:  ${passed + failed}`);
process.exit(failed ? 1 : 0);
