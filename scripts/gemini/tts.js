#!/usr/bin/env node
/**
 * Gemini TTS — free-tier text-to-speech on the AI-Pro key (wired 2026-07-27).
 * Returns 24kHz mono PCM; we wrap it in a WAV header so anything can play it.
 *
 * Usage:
 *   node scripts/gemini/tts.js "Text to speak" [-o out.wav] [--voice Kore] [--model gemini-3.1-flash-tts-preview]
 *
 * Voices: Kore, Puck, Charon, Fenrir, Aoede, Leda, Orus, Zephyr (and more — see Gemini docs).
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadEnv } = require('../council/providers');

const SAMPLE_RATE = 24_000;

/** Wrap raw 16-bit mono PCM in a minimal WAV header. */
function pcmToWav(pcm, sampleRate) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // byte rate (16-bit mono)
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function parseArgs(argv) {
  const args = { text: '', out: 'gemini-tts.wav', voice: 'Kore', model: 'gemini-3.1-flash-tts-preview' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '-o' || a === '--out') args.out = argv[++i];
    else if (a === '--voice') args.voice = argv[++i];
    else if (a === '--model') args.model = argv[++i];
    else if (!args.text) args.text = a;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.text) {
    console.error('Usage: tts.js "Text to speak" [-o out.wav] [--voice Kore] [--model <tts-model>]');
    process.exitCode = 1;
    return;
  }
  const env = loadEnv();
  if (!env.GEMINI_API_KEY) {
    console.error('[tts] GEMINI_API_KEY missing (dashboard/.env.local)');
    process.exitCode = 1;
    return;
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      signal: AbortSignal.timeout(120_000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: args.text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: args.voice } } },
        },
      }),
    },
  );
  if (!res.ok) {
    console.error(`[tts] HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    process.exitCode = 1;
    return;
  }
  const data = await res.json();
  const b64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) {
    console.error('[tts] no audio in response');
    process.exitCode = 1;
    return;
  }
  const outPath = path.resolve(args.out);
  fs.writeFileSync(outPath, pcmToWav(Buffer.from(b64, 'base64'), SAMPLE_RATE));
  console.log(`[tts] wrote ${outPath} (voice=${args.voice}, model=${args.model})`);
}

main().catch(err => {
  console.error(`[tts] ${err.message}`);
  process.exitCode = 1;
});
