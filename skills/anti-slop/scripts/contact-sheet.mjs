#!/usr/bin/env node
/**
 * contact-sheet.mjs — the divergence judge.
 *
 * WHY (2026-08-13). Every other mechanism in anti-slop disciplines ONE project
 * against the population. Nothing compares project N against projects 1..N-1, so
 * a studio can follow the doctrine perfectly on every build and still converge on
 * a house style it never chose. Council `antislop-system` (xai + claude, degraded
 * quorum 2/3) landed on this independently from both seats.
 *
 * THE TEST. Screenshot each site, GREYSCALE + GAUSSIAN-BLUR it, tile them side by
 * side. Blur destroys content and leaves the layout skeleton: silhouette, rhythm,
 * mass distribution, axis. Colour and copy are the things we already know how to
 * vary; they are also the things that hide sameness. If the new build sits in the
 * same visual cluster as the last five, it FAILED — no matter how different its
 * palette is.
 *
 * This operationalises the standing rule "the photograph is the judge": the eye
 * decides, not the intention. It returns a picture, not a score, on purpose — a
 * number would invite optimising the number.
 *
 * Blur/greyscale happen in-browser via CSS filters, so there is no image-library
 * dependency (no sharp/jimp/canvas build step).
 *
 *   node contact-sheet.mjs <url|path> [more...] [--blur 8] [--out sheet.png]
 *                          [--width 1440] [--mobile]
 *
 * Exit 0 always on capture failure of an individual target — a dead URL must not
 * blank the sheet; it renders as a labelled gap instead.
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const require = createRequire(import.meta.url);

/** Playwright lives in the global npm root here, not in any project. */
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
  const o = { targets: [], blur: 8, out: 'contact-sheet.png', width: 1440, mobile: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--blur') o.blur = Number(argv[++i]) || 8;
    else if (a === '--out') o.out = argv[++i];
    else if (a === '--width') o.width = Number(argv[++i]) || 1440;
    else if (a === '--mobile') o.mobile = true;
    else o.targets.push(a);
  }
  return o;
}

/** A local path becomes a file:// URL; anything else is taken as-is. */
function toURL(t) {
  if (/^https?:\/\//i.test(t)) return t;
  let p = path.resolve(t);
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) return null;
  return 'file://' + p.replace(/\\/g, '/');
}

function label(t) {
  // Keep the port: comparing two localhost builds is the common case, and
  // "127.0.0.1" twice makes the sheet unreadable.
  if (/^https?:\/\//i.test(t)) {
    try { const u = new URL(t); return u.hostname.replace(/^www\./, '') + (u.port ? ':' + u.port : ''); }
    catch { return t; }
  }
  const parts = path.resolve(t).split(path.sep).filter(Boolean);
  return parts[parts.length - 1] === 'index.html' ? parts[parts.length - 2] : parts[parts.length - 1];
}

async function capture(browser, target, width, mobile) {
  const url = toURL(target);
  if (!url) return { label: label(target), error: 'not found' };
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
    // Let fonts settle — a FOUT screenshot lies about the type silhouette, which
    // is one of the axes being judged.
    await page.evaluate(() => (document.fonts ? document.fonts.ready : null)).catch(() => {});
    await page.waitForTimeout(900);

    // SCROLL-PASS (2026-08-13 fix). Our sites reveal on scroll (GSAP ScrollTrigger /
    // IntersectionObserver), so content sits at opacity:0 until the viewport reaches
    // it. Screenshotting at load captured a BLANK page on 5 of 7 real sites — the
    // first sheet looked like total convergence when it was really total absence.
    // Walk the page to fire every reveal, then return to the top. Reveal animations
    // are one-way in practice, so the elements stay visible.
    await page.evaluate(async () => {
      const step = Math.round(window.innerHeight * 0.75);
      const end = Math.max(document.body?.scrollHeight || 0, document.documentElement?.scrollHeight || 0);
      for (let y = 0; y < end; y += step) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 250));
    }).catch(() => {});
    // Anything still mid-transition would smear the silhouette; freeze the end state.
    await page.addStyleTag({
      content: `*,*::before,*::after{animation-play-state:paused!important;
                transition:none!important}`,
    }).catch(() => {});
    await page.waitForTimeout(700);
    // Cap at 3 viewports: below that is usually footer, and a 12000px column
    // shrinks every other tile into uselessness.
    // body.scrollHeight alone returns 0 whenever the page's content is absolutely
    // positioned or lives in a 100vh container with a zero-height body — which was
    // 4 of the first 7 real sites tested. Take the largest honest measure and
    // never fall below one viewport.
    const vh = mobile ? 844 : 900;
    const h = await page.evaluate(() => Math.max(
      document.body ? document.body.scrollHeight : 0,
      document.body ? document.body.offsetHeight : 0,
      document.documentElement ? document.documentElement.scrollHeight : 0,
      document.documentElement ? document.documentElement.offsetHeight : 0,
      window.innerHeight,
    ));
    const clipH = Math.max(Math.min(h || vh, vh * 3), vh);
    const buf = await page.screenshot({ clip: { x: 0, y: 0, width: mobile ? 390 : width, height: clipH } });
    // A document height of ~0 means scroll is VIRTUALISED (fixed sections, Lenis /
    // WebGL transform scroll), so only the fold is capturable. That is a real
    // limitation, not a failure — label it rather than letting the tile imply the
    // whole site is one screen. Measured 2026-08-13: 4 of 7 studio sites.
    const foldOnly = h <= vh;

    // DID-IT-ACTUALLY-RENDER GUARD (2026-08-13). A Vite/React app opened over
    // file:// cannot load main.tsx (ES modules + JSX need a server or a build), so
    // it paints an EMPTY SHELL. Blurred, an empty shell is a featureless rectangle
    // — which reads on the sheet exactly like "this design has no structure." 4 of
    // 7 studio sites did this on the first real run, and the tool would have
    // reported total convergence that was really total absence.
    // A judge whose failure looks like its verdict is worse than no judge.
    const life = await page.evaluate(() => ({
      text: (document.body?.innerText || '').trim().length,
      imgs: [...document.images].filter(i => i.naturalWidth > 0).length,
      canvas: document.querySelectorAll('canvas,svg,video').length,
    }));
    const empty = life.text < 40 && life.imgs === 0 && life.canvas === 0;
    if (empty) {
      return {
        label: label(target),
        error: 'did not render (needs a build or dev server — file:// cannot load main.tsx)',
      };
    }
    return { label: label(target), data: buf.toString('base64'), foldOnly, docHeight: h };
  } catch (e) {
    return { label: label(target), error: String(e.message || e).slice(0, 80) };
  } finally {
    await ctx.close().catch(() => {});
  }
}

function sheetHTML(shots, blur) {
  const tiles = shots.map(s => `
    <figure class="t">
      ${s.data
        ? `<div class="w"><img src="data:image/png;base64,${s.data}"></div>`
        : `<div class="w err">capture failed<br><small>${s.error || ''}</small></div>`}
      <figcaption>${s.label}${s.foldOnly ? '<span class="fo">fold only · virtual scroll</span>' : ''}</figcaption>
    </figure>`).join('');
  return `<!doctype html><meta charset="utf-8"><style>
    :root{color-scheme:dark}
    body{margin:0;background:#0b0b0c;color:#e8e4dc;
         font:500 13px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;padding:28px}
    h1{font-size:15px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
       margin:0 0 4px;color:#b9b3a7}
    p.sub{margin:0 0 24px;color:#6f6a61;max-width:78ch}
    .grid{display:flex;gap:18px;align-items:flex-start;overflow-x:auto;padding-bottom:8px}
    .t{margin:0;flex:0 0 auto;width:300px}
    /* Height is AUTO, capped. A fixed-height box padded a short capture with dead
       black and made every site read as "empty and identical" — the tool was
       manufacturing the very convergence it exists to detect. */
    .w{width:300px;max-height:680px;overflow:hidden;background:#141416;
       border:1px solid #26262a;border-radius:2px}
    /* Strip colour and detail, leave the skeleton. Normalisation is done PER TILE
       in canvas (see script below), not with a global CSS filter: a fixed
       brightness/contrast that rescues dark sites blows light sites to solid
       white, which is how the 3rd run lost 3 of 7 tiles. Blur stays in CSS. */
    .w canvas{width:100%;display:block;filter:blur(${blur}px)}
    .w img{display:none}
    .err{display:flex;align-items:center;justify-content:center;color:#7c5c5c;text-align:center}
    figcaption{margin-top:8px;color:#8d8779;font-size:11px;letter-spacing:.06em}
    .fo{display:block;margin-top:2px;color:#7a6a4a;font-size:10px;letter-spacing:.04em}
    .grid{align-items:flex-start}
  </style>
  <h1>Divergence contact sheet</h1>
  <p class="sub">Greyscaled + blurred ${blur}px. Judge SILHOUETTE, RHYTHM and MASS only.
  If the new build sits in the same cluster as the others, it failed — palette and copy
  differences do not count.</p>
  <div class="grid">${tiles}</div>
  <script>
  // PER-TILE NORMALISATION. Greyscale, then stretch luminance between the 2nd and
  // 98th percentile of THAT tile. A dark site and a light site then present their
  // structure on the same footing, which is the only way silhouettes are
  // comparable — we are judging MASS DISTRIBUTION, not exposure. Percentiles (not
  // min/max) so one white logo or one black bar cannot define the whole range.
  document.querySelectorAll('.w').forEach(w => {
    const img = w.querySelector('img');
    if (!img) return;
    const draw = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height);
      const p = d.data, hist = new Uint32Array(256);
      for (let i = 0; i < p.length; i += 4) {
        const g = (p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114) | 0;
        p[i] = p[i + 1] = p[i + 2] = g; hist[g] += 1;
      }
      const total = c.width * c.height;
      let lo = 0, hi = 255, acc = 0;
      for (let i = 0; i < 256; i += 1) { acc += hist[i]; if (acc >= total * 0.02) { lo = i; break; } }
      acc = 0;
      for (let i = 255; i >= 0; i -= 1) { acc += hist[i]; if (acc >= total * 0.02) { hi = i; break; } }
      const span = Math.max(hi - lo, 12);            // guard: flat tile stays flat, not noise
      for (let i = 0; i < p.length; i += 4) {
        const v = Math.max(0, Math.min(255, ((p[i] - lo) * 255) / span));
        p[i] = p[i + 1] = p[i + 2] = v;
      }
      x.putImageData(d, 0, 0);
      w.appendChild(c);
    };
    if (img.complete) draw(); else img.addEventListener('load', draw);
  });
  </script>`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.targets.length) {
    console.error('usage: contact-sheet.mjs <url|path> [more...] [--blur 8] [--out sheet.png] [--mobile]');
    process.exit(1);
  }
  const chromium = loadChromium();
  const browser = await chromium.launch();
  const shots = [];
  for (const t of args.targets) {
    process.stderr.write(`[contact-sheet] capturing ${t} … `);
    const s = await capture(browser, t, args.width, args.mobile);
    process.stderr.write(s.data ? 'ok\n' : `FAILED (${s.error})\n`);
    shots.push(s);
  }
  const ctx = await browser.newContext({ viewport: { width: Math.min(2400, 60 + shots.length * 318), height: 820 } });
  const page = await ctx.newPage();
  await page.setContent(sheetHTML(shots, args.blur), { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const out = path.resolve(args.out);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
  const ok = shots.filter(s => s.data).length;
  console.log(`[contact-sheet] ${ok}/${shots.length} captured -> ${out}`);
}

main().catch(e => { console.error('[contact-sheet]', e.message); process.exit(1); });
