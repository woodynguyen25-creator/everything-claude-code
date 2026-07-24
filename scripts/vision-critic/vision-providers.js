/**
 * Vision providers for the vision-critic — independent "eyes" that SEE the
 * rendered pixels (not the code). Grok-4.5 is the default because Woody's
 * doctrine is "Sol READS code (blind); Grok SEES pixels" — the builder must
 * never grade its own homework, so the critic uses a model that is NOT the
 * one that wrote the page.
 *
 * OpenAI-compatible /chat/completions with multimodal content parts.
 * Zero deps: Node 18+ fetch + fs. Mirrors scripts/council/providers.js.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ENV_FILE = path.join(REPO_ROOT, 'dashboard', '.env.local');

/** Parse KEY=VALUE from dashboard/.env.local, overlaid on process.env. */
function loadEnv() {
  const env = { ...process.env };
  try {
    const raw = fs.readFileSync(ENV_FILE, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !line.startsWith('#')) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch (err) {
    process.stderr.write(`[vision-critic] no dashboard/.env.local (${err.code}); using process.env only\n`);
  }
  return env;
}

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };

/** Read an image file → a data: URI content part. Throws with a clear message if missing. */
function imagePart(file) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) throw new Error(`image not found: ${abs}`);
  const ext = path.extname(abs).toLowerCase();
  const mime = MIME[ext];
  if (!mime) throw new Error(`unsupported image type "${ext}" (${abs}) — use png/jpg/webp`);
  const bytes = fs.readFileSync(abs);
  if (bytes.length > 8 * 1024 * 1024) {
    process.stderr.write(`[vision-critic] WARN ${path.basename(abs)} is ${(bytes.length / 1e6).toFixed(1)}MB — capture narrower (e.g. 1280w) to cut vision cost\n`);
  }
  return { type: 'image_url', image_url: { url: `data:${mime};base64,${bytes.toString('base64')}`, detail: 'high' } };
}

/**
 * Vision seats: OpenAI-compatible chat endpoints that accept image content parts.
 * value = { base, keyName, model }. Add openai/anthropic here if keys land.
 */
const VISION_SEATS = {
  grok: { base: 'https://api.x.ai/v1', keyName: 'XAI_API_KEY', model: 'grok-4.5' },
  xai: { base: 'https://api.x.ai/v1', keyName: 'XAI_API_KEY', model: 'grok-4.5' },
  openai: { base: 'https://api.openai.com/v1', keyName: 'OPENAI_API_KEY', model: 'gpt-4o' },
};

/**
 * Run one vision grading call.
 * @param {object} opts
 * @param {string} opts.seat        seat id (grok|xai|openai)
 * @param {string} [opts.model]     override model id
 * @param {string} opts.system      system prompt (the rubric)
 * @param {string} opts.text        user text (brief + what images follow)
 * @param {string[]} opts.buildImages   file paths — the page being graded
 * @param {string[]} [opts.refImages]   file paths — reference / target look
 * @param {object} opts.env
 * @param {number} [opts.timeoutMs]
 * @returns {Promise<{ok, seat, model, text, ms, error, raw}>}
 */
async function runVision({ seat = 'grok', model, system, text, buildImages = [], refImages = [], env, timeoutMs = 180_000 }) {
  const started = Date.now();
  const cfg = VISION_SEATS[seat];
  if (!cfg) return { ok: false, seat, model, text: '', ms: 0, error: `unknown vision seat "${seat}"` };
  const key = env[cfg.keyName];
  if (!key) return { ok: false, seat, model: model || cfg.model, text: '', ms: 0, error: `${cfg.keyName} missing` };
  const useModel = model || cfg.model;

  const content = [{ type: 'text', text }];
  if (refImages.length) {
    content.push({ type: 'text', text: `\n=== REFERENCE / TARGET LOOK (${refImages.length}) ===` });
    for (const f of refImages) content.push(imagePart(f));
  }
  content.push({ type: 'text', text: `\n=== BUILD UNDER REVIEW (${buildImages.length}) ===` });
  for (const f of buildImages) content.push(imagePart(f));

  try {
    const res = await fetch(`${cfg.base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model: useModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content },
        ],
        max_tokens: 4096,
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, seat, model: useModel, text: '', ms: Date.now() - started, error: `HTTP ${res.status}: ${body.slice(0, 300)}` };
    }
    const data = await res.json();
    const out = data?.choices?.[0]?.message?.content ?? '';
    return { ok: Boolean(out), seat, model: useModel, text: out, ms: Date.now() - started, error: out ? undefined : 'empty response', raw: data };
  } catch (e) {
    return { ok: false, seat, model: useModel, text: '', ms: Date.now() - started, error: e.message };
  }
}

module.exports = { loadEnv, imagePart, runVision, VISION_SEATS };
