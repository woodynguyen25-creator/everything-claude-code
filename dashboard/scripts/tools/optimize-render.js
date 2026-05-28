#!/usr/bin/env node
// dashboard/scripts/tools/optimize-render.js
//
// One-shot Midjourney render optimizer.
// Takes a PNG (or JPEG), converts to WebP at quality 85, saves to the canonical path.
//
// Usage:
//   node scripts/tools/optimize-render.js <source.png> <kind> <slug>
//
//   kind ∈ {agent-sigil, agent-hero, scene}
//   slug examples:
//     agent-sigil  → lebot-james, thor, perseus, fenrir, sauron
//     agent-hero   → same as sigil (different aspect ratio variant)
//     scene        → dawn-asgard, day-olympus, dusk-mordor, night-norse-stars
//
// Examples:
//   node scripts/tools/optimize-render.js ~/Downloads/lebot.png agent-sigil lebot-james
//   node scripts/tools/optimize-render.js ~/Downloads/asgard.png scene dawn-asgard
//
// Output:
//   - WebP-optimized version saved to public/art/{agents/sigils,agents/heroes,scenes}/{slug}.webp
//   - Backup of the original PNG saved alongside for archival

const fs = require('node:fs');
const path = require('node:path');
const { execSync, spawnSync } = require('node:child_process');

const KIND_PATHS = {
  'agent-sigil': 'public/art/agents/sigils',
  'agent-hero': 'public/art/agents/heroes',
  'scene': 'public/art/scenes',
};

const VALID_SLUGS = {
  'agent-sigil': ['lebot-james', 'thor', 'perseus', 'fenrir', 'sauron'],
  'agent-hero': ['lebot-james', 'thor', 'perseus', 'fenrir', 'sauron'],
  'scene': ['dawn-asgard', 'day-olympus', 'dusk-mordor', 'night-norse-stars'],
};

function die(msg) {
  console.error(`[optimize-render] ERROR: ${msg}`);
  process.exit(1);
}

function which(cmd) {
  try {
    const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8' });
    return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : null;
  } catch {
    return null;
  }
}

function ensureSharp() {
  try {
    require.resolve('sharp');
    return true;
  } catch {
    return false;
  }
}

function ensureCwebp() {
  return which('cwebp');
}

function optimizeWithSharp(src, dst, quality = 85) {
  const sharp = require('sharp');
  return sharp(src)
    .webp({ quality, effort: 4 })
    .toFile(dst);
}

function optimizeWithCwebp(src, dst, quality = 85) {
  const cwebp = ensureCwebp();
  if (!cwebp) die('cwebp not found and sharp not installed');
  execSync(`"${cwebp}" -q ${quality} -m 4 -mt "${src}" -o "${dst}"`, { stdio: 'inherit' });
  return true;
}

function copyOriginal(src, dst) {
  fs.copyFileSync(src, dst);
}

async function main() {
  const [, , srcArg, kind, slug] = process.argv;

  if (!srcArg || !kind || !slug) {
    die('Usage: node optimize-render.js <source.png> <kind> <slug>\n         kind ∈ {agent-sigil, agent-hero, scene}');
  }

  const src = path.resolve(srcArg);
  if (!fs.existsSync(src)) die(`source not found: ${src}`);

  const kindPath = KIND_PATHS[kind];
  if (!kindPath) die(`unknown kind: ${kind} (valid: ${Object.keys(KIND_PATHS).join(', ')})`);

  if (!VALID_SLUGS[kind].includes(slug)) {
    console.warn(`[optimize-render] WARN: slug "${slug}" not in canonical list for kind "${kind}"`);
    console.warn(`         canonical slugs: ${VALID_SLUGS[kind].join(', ')}`);
    console.warn(`         proceeding anyway — make sure this is intentional`);
  }

  const repoRoot = path.resolve(__dirname, '../../');
  const outDir = path.join(repoRoot, kindPath);
  fs.mkdirSync(outDir, { recursive: true });

  const dstWebp = path.join(outDir, `${slug}.webp`);
  const dstOriginal = path.join(outDir, `${slug}.original${path.extname(src)}`);

  console.log(`[optimize-render] source     = ${src}`);
  console.log(`[optimize-render] kind       = ${kind}`);
  console.log(`[optimize-render] slug       = ${slug}`);
  console.log(`[optimize-render] webp out   = ${dstWebp}`);
  console.log(`[optimize-render] backup     = ${dstOriginal}`);

  // 1. Copy original for archival
  copyOriginal(src, dstOriginal);
  const srcBytes = fs.statSync(src).size;
  console.log(`[optimize-render] backed up original (${(srcBytes / 1024).toFixed(1)} KB)`);

  // 2. Convert to WebP
  if (ensureSharp()) {
    console.log(`[optimize-render] using sharp (npm)`);
    await optimizeWithSharp(src, dstWebp, 85);
  } else if (ensureCwebp()) {
    console.log(`[optimize-render] using cwebp (system)`);
    optimizeWithCwebp(src, dstWebp, 85);
  } else {
    die('neither sharp (npm) nor cwebp (system) is available.\n' +
      '         Install one of:\n' +
      '           npm install sharp --save-dev\n' +
      '           OR download libwebp from https://developers.google.com/speed/webp/download');
  }

  const dstBytes = fs.statSync(dstWebp).size;
  const ratio = ((1 - dstBytes / srcBytes) * 100).toFixed(1);
  console.log(`[optimize-render] done — ${(dstBytes / 1024).toFixed(1)} KB (${ratio}% smaller than original)`);
}

main().catch((err) => {
  console.error('[optimize-render] FATAL:', err.message);
  process.exit(1);
});
