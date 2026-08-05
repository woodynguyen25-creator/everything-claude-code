#!/usr/bin/env node
/**
 * Gemini embeddings — free-tier gemini-embedding-2 on the AI-Pro key (wired 2026-07-27).
 * Prints a JSON embedding vector to stdout; feed it to any downstream RAG/similarity code.
 *
 * Usage:
 *   node scripts/gemini/embed.js "text to embed"
 *   node scripts/gemini/embed.js --file notes.md
 *   node scripts/gemini/embed.js "query text" --dims 768   # truncated MRL dims (default full)
 */
'use strict';

const fs = require('node:fs');
const { loadEnv } = require('../council/providers');

const MODEL = 'gemini-embedding-2';

function parseArgs(argv) {
  const args = { text: '', file: '', dims: 0 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--file') args.file = argv[++i];
    else if (a === '--dims') args.dims = Number(argv[++i]) || 0;
    else if (!args.text) args.text = a;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.file) args.text = fs.readFileSync(args.file, 'utf8');
  if (!args.text) {
    console.error('Usage: embed.js "text" | --file path [--dims 768]');
    process.exitCode = 1;
    return;
  }
  const env = loadEnv();
  if (!env.GEMINI_API_KEY) {
    console.error('[embed] GEMINI_API_KEY missing (dashboard/.env.local)');
    process.exitCode = 1;
    return;
  }

  const body = { content: { parts: [{ text: args.text }] } };
  if (args.dims > 0) body.outputDimensionality = args.dims;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    console.error(`[embed] HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    process.exitCode = 1;
    return;
  }
  const data = await res.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values)) {
    console.error('[embed] no embedding in response');
    process.exitCode = 1;
    return;
  }
  process.stdout.write(JSON.stringify({ model: MODEL, dims: values.length, values }));
}

main().catch(err => {
  console.error(`[embed] ${err.message}`);
  process.exitCode = 1;
});
