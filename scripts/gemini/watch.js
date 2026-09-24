#!/usr/bin/env node
/**
 * gemini-watch — ask Gemini a question about a VIDEO, on the free API tier.
 *
 *   node scripts/gemini/watch.js <local.mp4 | youtube-url> "question" [--model id]
 *
 * WHY THIS EXISTS (2026-09-22). /watch hands Claude still JPEG frames plus a
 * transcript. Frames cannot show how something MOVES — easing, timing, what enters
 * first — which is the whole question when tearing down a motion reference for a
 * client build. Gemini reads the video itself. Measured that day on the free key:
 *   local 360KB motion clip → 2.4s, correct description of the stroke animation
 *   YouTube URL (no download) → 39s, correct summary
 *   3.8-flash / nano-banana-pro → HTTP 429 on the free tier, so the default is
 *   gemini-flash-lite-latest, the only model that answered reliably.
 *
 * EXTERNAL-VALUE GATE: outcome = motion teardowns feeding the next client build;
 * check 2026-10-06 whether it was used on one. Unused by then → delete it.
 *
 * Local files over the inline limit are re-encoded to a small 480p silent copy with
 * ffmpeg first (motion survives; bytes do not). Nothing is uploaded anywhere except
 * the Gemini API, which on this key TRAINS ON INPUT — do not send client footage
 * that is not already public.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadEnv } = require('../council/providers');

const DEFAULT_MODEL = 'gemini-flash-lite-latest';
const OVERLOAD_LADDER = ['gemini-3.1-flash-lite', 'gemini-3.6-flash']; // 4/5 and 2/5 on the 9/22 overload probe
const OVERLOAD = new Set([429, 503]);
const INLINE_LIMIT = 18 * 1024 * 1024; // request cap is 20MB; leave room for base64 + prompt
const TIMEOUT_MS = 180_000;
const YOUTUBE = /^https?:\/\/(www\.|m\.)?(youtube\.com\/(watch|shorts)|youtu\.be\/)/i;

function parseArgs(argv) {
  const args = { model: DEFAULT_MODEL };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--model') args.model = argv[++i];
    else rest.push(argv[i]);
  }
  [args.source, args.question] = rest;
  if (!args.source || !args.question) {
    throw new Error('usage: watch.js <local.mp4 | youtube-url> "question" [--model id]');
  }
  return args;
}

/** The video part of the request: a YouTube URI Gemini fetches itself, or inline bytes. */
function videoPart(source, readFile = fs.readFileSync) {
  if (YOUTUBE.test(source)) return { file_data: { file_uri: source } };
  const bytes = readFile(source);
  if (bytes.length > INLINE_LIMIT) {
    throw new Error(`video is ${(bytes.length / 1e6).toFixed(1)}MB, over the ${INLINE_LIMIT / 1e6}MB inline limit — shrink it first`);
  }
  const mime = path.extname(source).toLowerCase() === '.webm' ? 'video/webm' : 'video/mp4';
  return { inline_data: { mime_type: mime, data: bytes.toString('base64') } };
}

function buildRequest(question, part) {
  return { contents: [{ parts: [{ text: question }, part] }] };
}

/** Re-encode an oversized local video to 480p, 12fps, no audio. Returns the new path. */
function shrink(source) {
  const out = path.join(os.tmpdir(), `gemini-watch-${process.pid}.mp4`);
  const r = spawnSync('ffmpeg', ['-y', '-i', source, '-vf', 'scale=-2:480,fps=12', '-an',
    '-c:v', 'libx264', '-crf', '32', '-preset', 'veryfast', out], { stdio: 'ignore', timeout: 300_000 });
  if (r.status !== 0 || !fs.existsSync(out)) throw new Error('ffmpeg could not shrink the video (is ffmpeg on PATH?)');
  return out;
}

async function ask({ source, question, model }, env = loadEnv()) {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
  let file = source;
  if (!YOUTUBE.test(source) && fs.statSync(source).size > INLINE_LIMIT) file = shrink(source);
  let body;
  try {
    body = JSON.stringify(buildRequest(question, videoPart(file)));
  } finally {
    if (file !== source) fs.rmSync(file, { force: true }); // the shrunk copy is only needed until it is encoded
  }
  // 2026-09-24: flash-lite-latest itself returned 503 "high demand" on the first real use.
  // Only the default model walks the ladder; an explicit --model is honoured as-is.
  const rungs = model === DEFAULT_MODEL ? [model, ...OVERLOAD_LADDER] : [model];
  const misses = [];
  for (const rung of rungs) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${rung}:generateContent?key=${env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const raw = await res.text();
    if (OVERLOAD.has(res.status)) { misses.push(`${rung}: HTTP ${res.status}`); continue; }
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${rung}: ${raw.slice(0, 240)}`);
    const text = (JSON.parse(raw).candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
    if (!text) throw new Error(`${rung} returned an empty answer`);
    return misses.length ? `${text}\n\n[answered by ${rung} after ${misses.join(', ')}]` : text;
  }
  throw new Error(`every model overloaded — ${misses.join(' | ')}; try again in a few minutes`);
}

if (require.main === module) {
  (async () => {
    try {
      const args = parseArgs(process.argv.slice(2));
      process.stdout.write(`${await ask(args)}\n`);
    } catch (e) {
      process.stderr.write(`[gemini-watch] ${e.message}\n`);
      // exitCode, not exit(): exit() mid-teardown of an aborted fetch trips a libuv
      // assertion on Windows (UV_HANDLE_CLOSING, seen 2026-09-24).
      process.exitCode = 1;
    }
  })();
}

module.exports = { parseArgs, videoPart, buildRequest, ask, DEFAULT_MODEL, OVERLOAD_LADDER, INLINE_LIMIT };
