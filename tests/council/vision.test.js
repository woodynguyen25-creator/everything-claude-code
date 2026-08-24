/**
 * Tests for the council's IMAGE ATTACHMENT path — scripts/council/{roster,providers,council}.js
 *
 * Run with: node tests/council/vision.test.js
 *
 * WHY THIS FILE EXISTS
 * Until 2026-08-23 every runner took a plain string, so an attached image did not
 * exist and the whole council was blind. Adding sight is the easy half. The half
 * that needs holding down with tests is the EXCLUSION: a seat that cannot see an
 * image does not say so — it answers anyway, fluently, and its confident paragraphs
 * about a screenshot it never received get tallied into a verdict.
 *
 * This repo already carries two scars from exactly that failure shape: the xai seat
 * narrating a repository inspection it had no filesystem to perform, and agy seats
 * claiming tool use they cannot do. Both were capabilities asserted somewhere other
 * than the roster. So these tests hold three lines:
 *   1. every seat DECLARES vision (a missing flag is a silent blind seat),
 *   2. no agy-transport seat may claim it (agy cannot carry an image at all),
 *   3. a blind seat is DROPPED from an image convene, never merely warned about.
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { SEATS, VISION_SEATS, VISION_MODE } = require('../../scripts/council/roster');
const { SEATS: RUNNERS, loadImages, IMAGE_MIME, MAX_IMAGE_BYTES } = require('../../scripts/council/providers');
const { applyVisionPolicy, parseArgs } = require('../../scripts/council/council');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const out = fn();
    if (out && typeof out.then === 'function') {
      throw new Error('async test passed to sync runner — use testAsync');
    }
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

const quiet = () => {};
const VALID_MODES = ['native', 'read-tool', 'gemini-api'];

// A 1x1 PNG, written to a temp file so the loader exercises real disk I/O.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'council-vision-'));
const pngPath = path.join(tmpDir, 'probe.png');
fs.writeFileSync(pngPath, PNG_1X1);

async function main() {
  console.log('\n=== Council vision: capability declaration ===\n');

  test('every seat declares a vision capability (no silent omission)', () => {
    for (const seat of SEATS) {
      assert.ok('vision' in seat, `seat "${seat.id}" has no vision field — it would be treated as blind by accident, not by measurement`);
    }
  });

  test('every truthy vision value is a known mechanism', () => {
    for (const seat of SEATS.filter(s => s.vision)) {
      assert.ok(VALID_MODES.includes(seat.vision), `seat "${seat.id}" declares unknown vision mode "${seat.vision}"`);
    }
  });

  test('VISION_SEATS and VISION_MODE derive from the seat records', () => {
    const expected = SEATS.filter(s => s.vision).map(s => s.id);
    assert.deepEqual(VISION_SEATS, expected);
    for (const id of VISION_SEATS) assert.equal(VISION_MODE[id], SEATS.find(s => s.id === id).vision);
    for (const id of SEATS.filter(s => !s.vision).map(s => s.id)) {
      assert.ok(!(id in VISION_MODE), `blind seat "${id}" must not appear in VISION_MODE`);
    }
  });

  test('no agy-transport seat claims vision — agy cannot carry an image', () => {
    // Measured 2026-08-23: `agy --help` has no image flag, and a path in the prompt
    // dies with "permission check failed for read_file … user denied permission".
    // The `gemini` seat is the ONE exception, and only because it leaves agy
    // entirely for images (vision === 'gemini-api'), which this assertion pins.
    for (const id of ['geminipro', 'agyopus', 'agyflash']) {
      const seat = SEATS.find(s => s.id === id);
      assert.equal(seat.vision, false, `seat "${id}" runs on agy and cannot receive images`);
    }
    assert.equal(SEATS.find(s => s.id === 'gemini').vision, 'gemini-api',
      'the gemini seat may only claim vision via the Gemini API transport, not via agy');
  });

  console.log('\n=== Council vision: attachment loading ===\n');

  test('loadImages returns mime + base64 for a real png', () => {
    const [img] = loadImages([pngPath]);
    assert.equal(img.mime, 'image/png');
    assert.equal(img.bytes, PNG_1X1.length);
    assert.equal(Buffer.from(img.b64, 'base64').length, PNG_1X1.length);
    assert.ok(path.isAbsolute(img.file));
  });

  test('loadImages([]) is empty, and the argument is optional', () => {
    assert.deepEqual(loadImages([]), []);
    assert.deepEqual(loadImages(), []);
  });

  test('a missing file is rejected by PATH, before any dispatch', () => {
    assert.throws(() => loadImages([path.join(tmpDir, 'nope.png')]), /image not found/);
  });

  test('a non-image extension is rejected and names the allowed types', () => {
    const txt = path.join(tmpDir, 'notes.txt');
    fs.writeFileSync(txt, 'hello');
    assert.throws(() => loadImages([txt]), /unsupported image type/);
    for (const ext of Object.keys(IMAGE_MIME)) {
      assert.ok(ext.startsWith('.'), 'mime table keys must be extensions');
    }
  });

  test('an oversized image is rejected locally rather than sent to a 400', () => {
    const big = path.join(tmpDir, 'big.png');
    fs.writeFileSync(big, Buffer.alloc(MAX_IMAGE_BYTES + 1));
    assert.throws(() => loadImages([big]), /image too large/);
    fs.unlinkSync(big);
  });

  console.log('\n=== Council vision: the exclusion rule ===\n');

  test('blind seats are DROPPED from a convene with images', () => {
    const args = applyVisionPolicy({ to: ['claude', 'deepseek', 'agyflash', 'codex'] }, loadImages([pngPath]), quiet);
    assert.deepEqual(args.to, ['claude', 'codex']);
  });

  test('a roster of only blind seats empties, so the caller can abort', () => {
    // council.js turns an empty roster into exit code 2. The alternative — running
    // the convene anyway — is confident paragraphs about a picture nobody saw.
    const args = applyVisionPolicy({ to: ['deepseek', 'agyopus'] }, loadImages([pngPath]), quiet);
    assert.deepEqual(args.to, []);
  });

  test('with NO images the roster is untouched (blind seats keep their seat)', () => {
    const roster = ['claude', 'deepseek', 'agyflash'];
    const args = applyVisionPolicy({ to: [...roster] }, [], quiet);
    assert.deepEqual(args.to, roster, 'vision policy must only apply when images are attached');
  });

  test('the drop is announced — a silent roster change is the bug, not the fix', () => {
    const lines = [];
    applyVisionPolicy({ to: ['claude', 'deepseek'] }, loadImages([pngPath]), m => lines.push(m));
    assert.ok(lines.some(l => l.includes('deepseek')), 'the dropped seat must be named on stdout');
  });

  console.log('\n=== Council vision: argument parsing ===\n');

  test('--image is repeatable and also accepts a comma-separated list', () => {
    assert.deepEqual(parseArgs(['Q', '--image', 'a.png', '--image', 'b.jpg']).imagePaths, ['a.png', 'b.jpg']);
    assert.deepEqual(parseArgs(['Q', '--image', 'a.png,b.jpg']).imagePaths, ['a.png', 'b.jpg']);
    assert.deepEqual(parseArgs(['Q']).imagePaths, []);
  });

  console.log('\n=== Council vision: runner routing ===\n');

  await testAsync('agy-backed seats REFUSE an image instead of silently dropping it', async () => {
    // The whole point: a transport that cannot carry the attachment must fail the
    // seat, so the operator sees a dead seat rather than a fluent blind answer.
    const res = await RUNNERS.agyflash('describe this', {}, { images: loadImages([pngPath]) });
    assert.equal(res.ok, false);
    assert.match(res.error, /cannot receive images/);
  });

  await testAsync('the gemini seat leaves agy for the API transport when images are attached', async () => {
    // Env deliberately carries no key, so the call fails BEFORE the network — the
    // error text is what proves which runner was selected, with no request made.
    const res = await RUNNERS.gemini('describe this', {}, { images: loadImages([pngPath]) });
    assert.equal(res.ok, false);
    assert.match(res.error, /GEMINI_API_KEY missing/);
    assert.match(res.error, /agy cannot carry images/);
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log('\n=== Test Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
