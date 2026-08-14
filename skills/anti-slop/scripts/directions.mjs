#!/usr/bin/env node
/**
 * directions.mjs — the 3-direction preview loop.
 *
 * WHY (2026-08-13). Anti-slop step 2 says "explore 3 structurally distinct
 * directions." Measured across every build to date it is the step that gets
 * SKIPPED, including on the AJR rebuild that existed to prove the doctrine
 * (ship gate scored 2/6). It gets skipped because there is no cheap way to
 * SHOW three directions — describing them in prose is not the same as seeing
 * them, and the person who has to choose decides by LOOKING.
 *
 * Woody's stated goal is to direct: "my creative mind can drive all projects,
 * I just need the AI to translate my ideas." That only works if he is choosing
 * between things he can see. This turns step 2 from an intention into an
 * artifact: three real rendered studies, tiled, pick one by number.
 *
 * It renders whatever HTML you give it — the model writes three genuinely
 * different studies, this script makes them comparable and picks up the
 * verdict. It deliberately does NOT generate the designs: a script that
 * templated three directions would produce three variants of one direction,
 * which is the failure it exists to prevent.
 *
 *   node directions.mjs <dir>            # dir contains a.html b.html c.html
 *   node directions.mjs a.html b.html c.html
 *   node directions.mjs <dir> --labels "editorial-luxury,brutalist,swiss"
 *   node directions.mjs <dir> --mobile   # also render a 390px column
 *
 * Output: directions.png (side-by-side, FULL COLOUR — this is a choosing tool,
 * not the blur judge) + a per-direction structural readout so the differences
 * are legible as facts, not vibes.
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const require = createRequire(import.meta.url);

function loadChromium() {
  const roots = [];
  try { roots.push(execSync('npm root -g', { encoding: 'utf8' }).trim()); } catch { /* ignore */ }
  roots.push(path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'node_modules'));
  for (const r of roots) {
    for (const pkg of ['playwright', '@playwright/test', 'playwright-core']) {
      try { return require(path.join(r, pkg)).chromium; } catch { /* next */ }
    }
  }
  try { return require('playwright').chromium; } catch { /* next */ }
  throw new Error('playwright not found — npm i -g @playwright/test');
}

function parseArgs(argv) {
  const o = { targets: [], out: 'directions.png', labels: [], mobile: false, width: 1440, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') o.json = true;
    else if (a === '--out') o.out = argv[++i];
    else if (a === '--labels') o.labels = String(argv[++i] || '').split(',').map(s => s.trim());
    else if (a === '--mobile') o.mobile = true;
    else if (a === '--width') o.width = Number(argv[++i]) || 1440;
    else o.targets.push(a);
  }
  // A single directory argument means "every html in here, sorted".
  if (o.targets.length === 1) {
    const p = path.resolve(o.targets[0]);
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      o.targets = fs.readdirSync(p).filter(f => /\.html?$/i.test(f)).sort()
        .map(f => path.join(p, f));
    }
  }
  return o;
}

const toURL = (t) => (/^https?:\/\//i.test(t) ? t : 'file://' + path.resolve(t).replace(/\\/g, '/'));

/** Structural facts, so "these are different" is checkable rather than asserted.
 *
 * BOTH heuristics here were wrong in the first version and produced false
 * "NOT DISTINCT" verdicts on obviously-distinct studies (measured 2026-08-13):
 *   - families[0] returned "Times New Roman" for EVERY study — one stray element
 *     inheriting the UA default serif sorted first, so every layout looked like
 *     it used the same face. Now: the DOMINANT face weighted by rendered
 *     character count.
 *   - the centroid was area-weighted over all boxes, so viewport-sized wrappers
 *     dominated and every layout landed at ~49% x 49%. Now: INK ONLY — leaf text
 *     weighted by charCount x fontSize, plus images/canvas by area.
 * A false "not distinct" is worse than no check: it teaches us to ignore the one
 * signal that makes step 2 trustworthy.
 */
async function measure(page) {
  return page.evaluate(() => {
    const px = (s) => parseFloat(s) || 0;
    const all = [...document.querySelectorAll('*')];
    const vw = innerWidth, vh = innerHeight;

    // NON-RENDERED elements must be excluded before anything is counted.
    // querySelectorAll('*') returns <style>, <title>, <script> — and <style>'s
    // textContent is the ENTIRE stylesheet, set in the UA serif. It outweighed
    // every real headline and made "Times New Roman" the dominant face of every
    // study. Require an actual painted box.
    const SKIP = /^(STYLE|SCRIPT|TITLE|META|LINK|HEAD|NOSCRIPT|TEMPLATE)$/;
    const leaf = all.filter((e) => {
      if (SKIP.test(e.tagName) || e.children.length !== 0) return false;
      if (!(e.textContent || '').trim()) return false;
      const r = e.getBoundingClientRect();
      return r.width > 1 && r.height > 1;
    });

    // Dominant face by how much text is actually SET in it.
    const byFam = new Map();
    const sizeWeight = new Map();
    for (const e of leaf) {
      const cs = getComputedStyle(e);
      const n = (e.textContent || '').trim().length;
      if (!n) continue;
      const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      byFam.set(fam, (byFam.get(fam) || 0) + n);
      const s = Math.round(px(cs.fontSize));
      sizeWeight.set(s, (sizeWeight.get(s) || 0) + n);
    }
    const families = [...byFam.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
    const sizes = [...sizeWeight.keys()].sort((a, b) => b - a);

    const radii = [...new Set(all.map(e => getComputedStyle(e).borderRadius).filter(r => r && r !== '0px'))];

    const bg = getComputedStyle(document.body).backgroundColor;
    const rgb = (bg.match(/\d+(\.\d+)?/g) || [255, 255, 255]).map(Number);
    // Rec. 709 luma — light vs dark ground is the cheapest divergence axis there is.
    const lum = Math.round((0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 2.55);

    // Ink centroid.
    let sx = 0, sy = 0, w = 0;
    for (const e of leaf) {
      const r = e.getBoundingClientRect();
      if (r.top > vh || r.bottom < 0 || r.width < 2) continue;
      const cs = getComputedStyle(e);
      const weight = (e.textContent || '').trim().length * Math.max(px(cs.fontSize), 1);
      if (!weight) continue;
      sx += (r.left + r.width / 2) * weight; sy += (r.top + r.height / 2) * weight; w += weight;
    }
    for (const e of all) {
      if (!/^(IMG|SVG|CANVAS|VIDEO)$/.test(e.tagName)) continue;
      const r = e.getBoundingClientRect();
      if (r.top > vh || r.bottom < 0 || r.width < 8 || r.height < 8) continue;
      const a = Math.min(r.width, vw) * Math.min(r.height, vh) * 0.35; // damped vs type
      sx += (r.left + r.width / 2) * a; sy += (r.top + r.height / 2) * a; w += a;
    }

    return {
      bg,
      lum,
      families: families.slice(0, 3),
      steps: sizes.length,
      maxType: sizes[0] || 0,
      radii: radii.length,
      centroidX: w ? Math.round((sx / w / vw) * 100) : 50,
      centroidY: w ? Math.round((sy / w / vh) * 100) : 50,
    };
  });
}

function sheet(items, mobile) {
  const cards = items.map((s, i) => `
    <figure class="d">
      <div class="hd"><span class="n">${String.fromCharCode(65 + i)}</span><span class="lb">${s.label}</span></div>
      <div class="shot">${s.data ? `<img src="data:image/png;base64,${s.data}">` : `<div class="err">${s.error || 'failed'}</div>`}</div>
      ${s.mob ? `<div class="mob"><img src="data:image/png;base64,${s.mob}"></div>` : ''}
      ${s.m ? `<dl class="mx">
        <div><dt>ground</dt><dd><i style="background:${s.m.bg}"></i>${s.m.bg}</dd></div>
        <div><dt>type</dt><dd>${s.m.families.join(' / ') || '—'}</dd></div>
        <div><dt>scale</dt><dd>${s.m.steps} steps · max ${s.m.maxType}px</dd></div>
        <div><dt>radii</dt><dd>${s.m.radii}</dd></div>
        <div><dt>mass</dt><dd>${s.m.centroidX}% × ${s.m.centroidY}%</dd></div>
      </dl>` : ''}
    </figure>`).join('');
  return `<!doctype html><meta charset="utf-8"><style>
    :root{color-scheme:dark}
    body{margin:0;background:#0b0b0c;color:#e9e5dd;padding:30px;
      font:500 12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}
    h1{margin:0 0 4px;font-size:14px;letter-spacing:.16em;text-transform:uppercase;color:#c3bdb0}
    p.s{margin:0 0 26px;color:#6e6a61;max-width:88ch}
    .row{display:flex;gap:22px;align-items:flex-start}
    .d{margin:0;flex:1 1 0;min-width:0}
    .hd{display:flex;align-items:baseline;gap:10px;margin-bottom:9px}
    .n{display:inline-grid;place-items:center;width:22px;height:22px;background:#e9e5dd;color:#0b0b0c;font-weight:700}
    .lb{color:#b9b3a7;letter-spacing:.07em;text-transform:uppercase}
    .shot{border:1px solid #2a2a2e;background:#141416;overflow:hidden;max-height:${mobile ? 520 : 640}px}
    .shot img{width:100%;display:block}
    .mob{margin-top:10px;border:1px solid #2a2a2e;width:33%;overflow:hidden;max-height:300px}
    .mob img{width:100%;display:block}
    .err{padding:40px;text-align:center;color:#7c5c5c}
    .mx{margin:12px 0 0;display:grid;gap:3px}
    .mx div{display:grid;grid-template-columns:5.5rem 1fr;gap:8px;border-top:1px solid #232327;padding-top:3px}
    dt{color:#6e6a61;text-transform:uppercase;letter-spacing:.06em;font-size:10.5px}
    dd{margin:0;color:#cfc9bd;font-size:11px;display:flex;align-items:center;gap:6px}
    dd i{width:11px;height:11px;border:1px solid #3a3a3e;flex:none}
  </style>
  <h1>Direction studies</h1>
  <p class="s">Pick by letter. These must differ STRUCTURALLY — ground, type class, mass
  distribution — not by palette. If two share a mass centroid and a type class they are one
  direction in two colourways; send them back.</p>
  <div class="row">${cards}</div>`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.targets.length < 2) {
    console.error('usage: directions.mjs <dir-with-html> | <a.html b.html c.html> [--labels "x,y,z"] [--mobile] [--out f.png]');
    process.exit(1);
  }
  const chromium = loadChromium();
  const browser = await chromium.launch();
  const items = [];

  for (let i = 0; i < args.targets.length; i += 1) {
    const t = args.targets[i];
    const label = args.labels[i] || path.basename(t).replace(/\.html?$/i, '');
    process.stderr.write(`[directions] ${label} … `);
    const ctx = await browser.newContext({ viewport: { width: args.width, height: 900 } });
    const page = await ctx.newPage();
    try {
      await page.goto(toURL(t), { waitUntil: 'networkidle', timeout: 45_000 });
      await page.evaluate(() => (document.fonts ? document.fonts.ready : null)).catch(() => {});
      await page.waitForTimeout(900);
      const m = await measure(page);
      const vh = 900;
      const h = await page.evaluate(() => Math.max(
        document.body?.scrollHeight || 0, document.documentElement?.scrollHeight || 0, window.innerHeight));
      const data = (await page.screenshot({
        clip: { x: 0, y: 0, width: args.width, height: Math.max(Math.min(h, vh * 2), vh) },
      })).toString('base64');

      let mob;
      if (args.mobile) {
        const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
        const mp = await mctx.newPage();
        await mp.goto(toURL(t), { waitUntil: 'networkidle', timeout: 45_000 });
        await mp.waitForTimeout(800);
        mob = (await mp.screenshot()).toString('base64');
        await mctx.close();
      }
      items.push({ label, data, m, mob });
      process.stderr.write('ok\n');
    } catch (e) {
      items.push({ label, error: String(e.message || e).slice(0, 70) });
      process.stderr.write('FAILED\n');
    } finally {
      await ctx.close().catch(() => {});
    }
  }

  const ctx = await browser.newContext({
    viewport: { width: Math.min(2600, 90 + items.length * 470), height: 1000 },
  });
  const page = await ctx.newPage();
  await page.setContent(sheet(items, args.mobile), { waitUntil: 'load' });
  await page.waitForTimeout(350);
  const out = path.resolve(args.out);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();

  // Divergence check across the studies themselves — three variants of one
  // direction is the classic failure, and it is detectable.
  const ok = items.filter(i => i.m);
  const warn = [];
  for (let a = 0; a < ok.length; a += 1) {
    for (let b = a + 1; b < ok.length; b += 1) {
      const A = ok[a].m, B = ok[b].m;
      const sameMass = Math.abs(A.centroidX - B.centroidX) < 8 && Math.abs(A.centroidY - B.centroidY) < 8;
      const sameType = A.families[0] === B.families[0];
      // Luminance band, not exact string: #0d0c0b vs #0b0b0c is the same ground
      // decision, and two paper whites are too. 18 points apart = a real choice.
      const sameGround = Math.abs(A.lum - B.lum) < 18;
      if ([sameMass, sameType, sameGround].filter(Boolean).length >= 2) {
        warn.push(`${ok[a].label} and ${ok[b].label} share ${[sameMass && 'mass', sameType && 'type', sameGround && 'ground'].filter(Boolean).join(' + ')}`);
      }
    }
  }
  console.log(`[directions] ${ok.length}/${items.length} rendered -> ${out}`);
  if (args.json) {
    console.log(JSON.stringify(items.map(i => ({ label: i.label, ...(i.m || { error: i.error }) })), null, 1));
  }
  for (const w of warn) console.log(`[directions] ⚠ NOT DISTINCT: ${w}`);
  if (!warn.length && ok.length > 1) console.log('[directions] ✓ studies are structurally distinct');
}

main().catch(e => { console.error('[directions]', e.message); process.exit(1); });
