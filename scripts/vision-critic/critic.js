#!/usr/bin/env node
/**
 * vision-critic — an independent set of EYES for web builds.
 *
 * The build→verify loop can capture pixels (Playwright) and generate assets
 * (Higgsfield) but nothing perceptually GRADES the render — it dead-ends at the
 * builder's manual eye, which is blind to its own work (the Lucky Dog gallery was
 * rejected twice). This wires a vision model (Grok-4.5 by default) into the loop:
 * screenshot(s) [+ optional reference] + brief -> scored, prioritized fix-list.
 *
 * Usage:
 *   node critic.js --build shot1.png,shot2.png [--ref target.png] \
 *     --brief "Lucky Dog cosmic hero; award-caliber; must not look boxed/generic" \
 *     [--seat grok] [--model grok-4.5] [--json] [--out verdict.json]
 *
 *   # capture first (needs playwright available), then grade:
 *   node critic.js --capture http://localhost:3000 --breakpoints 1440,375 --brief "..."
 *
 * Exit code: 0 = SHIP, 1 = REVISE, 2 = REJECT, 3 = error. So it can gate CI / a loop.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadEnv, runVision } = require('./vision-providers');

const RUBRIC = fs.readFileSync(path.join(__dirname, 'rubric.md'), 'utf8');
const LEDGER = path.join(__dirname, '..', '..', 'dashboard', 'data', 'vision-critic-ledger.jsonl');

function parseArgs(argv) {
  const a = { build: [], ref: [], breakpoints: [1440, 375], seat: 'grok' };
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i];
    const next = () => argv[(i += 1)];
    if (k === '--build') a.build = next().split(',').map(s => s.trim()).filter(Boolean);
    else if (k === '--ref') a.ref = next().split(',').map(s => s.trim()).filter(Boolean);
    else if (k === '--brief') a.brief = next();
    else if (k === '--seat') a.seat = next();
    else if (k === '--model') a.model = next();
    else if (k === '--capture') a.capture = next();
    else if (k === '--breakpoints') a.breakpoints = next().split(',').map(n => parseInt(n, 10)).filter(Boolean);
    else if (k === '--out') a.out = next();
    else if (k === '--json') a.json = true;
    else if (k === '--tag') a.tag = next();
    else if (!k.startsWith('--')) a.build.push(k); // positional build shots
  }
  return a;
}

/** Best-effort screenshot capture via a locally-installed Playwright (checks known repos). */
async function capture(url, breakpoints, outDir) {
  const candidates = [
    path.join('C:', 'Github Repos', 'lucky-dog-landing', 'node_modules', 'playwright-core'),
    path.join(process.cwd(), 'node_modules', 'playwright-core'),
    'playwright-core',
    'playwright',
  ];
  let chromium = null;
  for (const c of candidates) {
    try { ({ chromium } = require(c)); if (chromium) break; } catch { /* try next */ }
  }
  if (!chromium) throw new Error('Playwright not found. Install it, or pass --build <png,...> with pre-captured shots (e.g. via the Playwright MCP / webapp-testing skill).');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const shots = [];
  try {
    for (const w of breakpoints) {
      const pageCtx = await browser.newContext({ viewport: { width: w, height: Math.round(w * 0.66) }, deviceScaleFactor: 1 });
      const page = await pageCtx.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 }).catch(() => page.goto(url, { waitUntil: 'load', timeout: 45_000 }));
      await page.waitForTimeout(1200);
      const out = path.join(outDir, `capture_${w}.png`);
      await page.screenshot({ path: out, fullPage: true });
      shots.push(out);
      process.stderr.write(`[vision-critic] captured ${w}w -> ${out}\n`);
      await pageCtx.close();
    }
  } finally {
    await browser.close();
  }
  return shots;
}

/** Pull the JSON object out of a model reply that may wrap it in prose / code fences. */
function extractJson(text) {
  let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first >= 0 && last > first) t = t.slice(first, last + 1);
  return JSON.parse(t);
}

const COLOR = { CRITICAL: '\x1b[41m\x1b[97m', HIGH: '\x1b[31m', MEDIUM: '\x1b[33m', LOW: '\x1b[90m', reset: '\x1b[0m', dim: '\x1b[90m', bold: '\x1b[1m' };
const VERDICT_ICON = { SHIP: '\x1b[42m\x1b[30m SHIP \x1b[0m', REVISE: '\x1b[43m\x1b[30m REVISE \x1b[0m', REJECT: '\x1b[41m\x1b[97m REJECT \x1b[0m' };

function render(v, meta) {
  const L = [];
  L.push('');
  L.push(`${VERDICT_ICON[v.verdict] || v.verdict}  ${COLOR.bold}${v.overallScore}/100${COLOR.reset}  ${COLOR.dim}(${meta.seat}/${meta.model}, ${meta.ms}ms)${COLOR.reset}`);
  L.push(`${COLOR.bold}${v.oneLine || ''}${COLOR.reset}`);
  if (v.wouldWoodyReject) L.push(`  would Woody reject? ${v.wouldWoodyReject.value ? '\x1b[31mYES' : '\x1b[32mno'}${COLOR.reset} — ${v.wouldWoodyReject.why || ''}`);
  L.push('');
  if (v.axes) {
    L.push(`${COLOR.dim}axis scores (0-10):${COLOR.reset}`);
    for (const [k, o] of Object.entries(v.axes)) {
      const s = o?.score ?? '?';
      const bar = '█'.repeat(Math.max(0, s)) + '░'.repeat(Math.max(0, 10 - s));
      const c = s <= 4 ? COLOR.HIGH : s <= 6 ? COLOR.MEDIUM : '\x1b[32m';
      L.push(`  ${k.padEnd(14)} ${c}${bar}${COLOR.reset} ${s}  ${COLOR.dim}${o?.note || ''}${COLOR.reset}`);
    }
    L.push('');
  }
  if (v.slopTells?.length) { L.push(`${COLOR.HIGH}slop tells:${COLOR.reset} ${v.slopTells.join(' · ')}`); L.push(''); }
  if (v.topFixes?.length) {
    L.push(`${COLOR.bold}fixes (most severe first):${COLOR.reset}`);
    for (const f of v.topFixes) {
      const c = COLOR[f.severity] || '';
      L.push(`  ${c} ${f.severity} ${COLOR.reset} ${COLOR.dim}[${f.where || '—'}]${COLOR.reset} ${f.issue}`);
      L.push(`      ${COLOR.dim}→${COLOR.reset} ${f.fix}`);
    }
    L.push('');
  }
  if (v.vsReference && v.vsReference.matchesFeel !== null && v.vsReference.matchesFeel !== undefined) {
    L.push(`vs reference — matches feel: ${v.vsReference.matchesFeel ? '\x1b[32myes' : '\x1b[31mno'}${COLOR.reset}`);
    for (const d of (v.vsReference.divergences || [])) L.push(`  ${COLOR.dim}·${COLOR.reset} ${d}`);
    L.push('');
  }
  return L.join('\n');
}

function ledger(entry) {
  try {
    fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
    fs.appendFileSync(LEDGER, JSON.stringify(entry) + '\n');
  } catch (e) { process.stderr.write(`[vision-critic] ledger write failed: ${e.message}\n`); }
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const env = loadEnv();

  if (a.capture) {
    const outDir = path.join(require('node:os').tmpdir(), 'vision-critic-shots');
    a.build = await capture(a.capture, a.breakpoints, outDir);
  }
  if (!a.build.length) {
    process.stderr.write('Usage: node critic.js --build shot.png[,shot2.png] [--ref target.png] --brief "..." [--capture URL]\n');
    process.exit(3);
  }

  const text = [
    a.brief ? `BRIEF / CONTEXT: ${a.brief}` : 'BRIEF: none given — grade against the rubric on general award-caliber + anti-slop standards.',
    a.ref.length ? `A reference/target look is attached first, then the build. Match the FEEL, not a pixel copy.` : `No reference attached — grade the build on its own merits.`,
    `Return ONLY the JSON object specified in the system rubric.`,
  ].join('\n');

  const res = await runVision({
    seat: a.seat, model: a.model, system: RUBRIC, text,
    buildImages: a.build, refImages: a.ref, env,
  });

  if (!res.ok) {
    process.stderr.write(`[vision-critic] FAILED (${res.seat}/${res.model}): ${res.error}\n`);
    process.exit(3);
  }

  let verdict;
  try {
    verdict = extractJson(res.text);
  } catch (e) {
    process.stderr.write(`[vision-critic] model did not return valid JSON: ${e.message}\n--- raw ---\n${res.text.slice(0, 1200)}\n`);
    process.exit(3);
  }

  const meta = { ts: new Date().toISOString(), seat: res.seat, model: res.model, ms: res.ms, build: a.build, ref: a.ref, tag: a.tag || null };
  ledger({ ...meta, verdict: verdict.verdict, score: verdict.overallScore, oneLine: verdict.oneLine, wouldWoodyReject: verdict.wouldWoodyReject?.value });

  if (a.json) process.stdout.write(JSON.stringify(verdict, null, 2) + '\n');
  else process.stdout.write(render(verdict, meta) + '\n');
  if (a.out) fs.writeFileSync(a.out, JSON.stringify({ ...meta, verdict }, null, 2));

  process.exit(verdict.verdict === 'SHIP' ? 0 : verdict.verdict === 'REVISE' ? 1 : 2);
}

main().catch(e => { process.stderr.write(`[vision-critic] ${e.stack || e.message}\n`); process.exit(3); });
