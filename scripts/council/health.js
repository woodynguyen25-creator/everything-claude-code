#!/usr/bin/env node
/**
 * council health — probe every seat and fail LOUD when a roster seat is down.
 *
 * Why this exists: the gemini seat died on 2026-07-27 (its API project was
 * suspended) and nothing surfaced it for six days. providers.js correctly
 * returns { ok:false } and council.js prints "[FAILED: …]" per seat — but a
 * council run still "succeeds" with a silently reduced quorum, so a dead seat
 * reads as a quiet answer rather than an outage.
 *
 * Usage:
 *   node scripts/council/health.js              # probe roster seats
 *   node scripts/council/health.js --all        # include benched seats
 *   node scripts/council/health.js --models     # MODEL-ROT CHECK (see below)
 *   node scripts/council/health.js --json       # machine-readable
 *
 * --models answers a different question than the probe: not "does the seat
 * answer" but "does the model this seat is configured with still EXIST".
 * Those diverge. On 2026-08-04 three configured ids had silently vanished from
 * their providers (qwen-3-235b-a22b, llama3.1-8b, gemma2-9b-it) while every
 * seat still reported UP, because the live seats used different ids than the
 * loop router did. Run this after any provider announcement.
 *
 * Exit codes: 0 = every roster seat up · 1 = at least one roster seat down.
 * Safe to wire as a preflight; it costs one trivial prompt per seat.
 */
'use strict';

const { loadEnv, SEATS } = require('./providers');
const { LEAD_SEATS, WORKER_SEATS, BENCHED_SEATS, SEATS: ROSTER, CATALOGUES } = require('./roster');

const PROMPT = 'Reply with exactly one word: PONG';

// CLI seats boot a full agent session before answering, so they need headroom.
// The pure-API seats should answer in single-digit seconds or something is wrong.
const TIMEOUT_S = { codex: 180, claude: 120, geminipro: 60 };
const DEFAULT_TIMEOUT_S = 45;

/** Probe one seat. Never throws — a thrown runner is itself a DOWN result. */
async function probe(seat, env) {
  const timeoutMs = (TIMEOUT_S[seat] || DEFAULT_TIMEOUT_S) * 1000;
  const started = Date.now();
  try {
    const r = await SEATS[seat](PROMPT, env, { timeoutMs });
    return { seat, ok: Boolean(r.ok), model: r.model || '?', ms: r.ms ?? Date.now() - started, error: r.error, text: (r.text || '').trim() };
  } catch (e) {
    return { seat, ok: false, model: '?', ms: Date.now() - started, error: `threw: ${e.message}` };
  }
}

function tierOf(seat) {
  const tiers = [];
  if (LEAD_SEATS.includes(seat)) tiers.push('LEAD');
  if (WORKER_SEATS.includes(seat)) tiers.push('WORK');
  if (tiers.length === 0) tiers.push('bench');
  return tiers.join('+');
}

/**
 * Model-rot check: for every seat whose provider exposes a model catalogue,
 * confirm the configured id is still listed. A seat can answer fine while a
 * DIFFERENT part of the system points at a dead id, so this is deliberately
 * independent of the liveness probe.
 */
async function checkModels(env) {
  console.log('[health] model-rot check — configured ids vs live provider catalogues\n');
  const cache = {};
  let rot = 0;
  let skipped = 0;

  for (const seat of ROSTER) {
    const cat = CATALOGUES[seat.id];
    if (!cat) {
      console.log(`  --   ${seat.id.padEnd(11)} ${seat.model.padEnd(28)} no catalogue API (CLI seat) — use the liveness probe`);
      skipped += 1;
      continue;
    }
    if (!cache[seat.id]) {
      try {
        // Most vendors take a Bearer header; Gemini takes the key as a query param.
        const isQuery = cat.auth === 'query';
        const url = isQuery ? `${cat.url}${cat.url.includes('?') ? '&' : '?'}key=${env[cat.key]}` : cat.url;
        const headers = isQuery ? {} : { Authorization: `Bearer ${env[cat.key]}` };
        const r = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
        const j = await r.json();
        cache[seat.id] = (j.data || j.models || [])
          .map(m => m.id || m.name)
          .filter(Boolean)
          // Gemini prefixes ids with "models/"; strip so config can stay clean.
          .map(id => id.replace(/^models\//, ''));
      } catch (e) {
        console.log(`  ??   ${seat.id.padEnd(11)} catalogue unreachable: ${e.message.slice(0, 60)}`);
        skipped += 1;
        continue;
      }
    }
    const listed = cache[seat.id].includes(seat.model);
    // Some providers serve working aliases that are absent from /models
    // (deepseek-chat is live but unlisted), so an absent id is a WARNING to
    // verify by probe, never an automatic failure.
    console.log(`  ${listed ? 'OK  ' : 'WARN'} ${seat.id.padEnd(11)} ${seat.model.padEnd(28)} ${listed ? 'listed' : 'NOT in catalogue — alias, or rotted. Verify by probe.'}`);
    if (!listed) rot += 1;
  }

  console.log(`\n[health] ${ROSTER.length - rot - skipped} verified · ${rot} unlisted · ${skipped} not checkable`);
  return rot;
}

async function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes('--json');
  const includeBenched = argv.includes('--all');

  if (argv.includes('--models')) {
    await checkModels(env);
    return;
  }

  // A seat in both rosters is probed once; Set preserves first-seen order.
  const roster = [...new Set([...LEAD_SEATS, ...WORKER_SEATS])];
  const targets = includeBenched ? [...new Set([...roster, ...BENCHED_SEATS])] : roster;

  const unknown = targets.filter(s => !SEATS[s]);
  if (unknown.length > 0) {
    console.error(`[health] roster names a seat with no runner: ${unknown.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  if (!asJson) console.log(`[health] probing ${targets.length} seats …\n`);
  const results = await Promise.all(targets.map(seat => probe(seat, env)));

  // Only roster seats gate the exit code; benched seats are known-dead.
  const rosterResults = results.filter(r => roster.includes(r.seat));
  const down = rosterResults.filter(r => !r.ok);

  if (asJson) {
    console.log(JSON.stringify({ ok: down.length === 0, down: down.map(d => d.seat), results }, null, 2));
  } else {
    for (const r of results.sort((a, b) => Number(b.ok) - Number(a.ok))) {
      const detail = r.ok ? r.text.slice(0, 40) : String(r.error || '').replace(/\s+/g, ' ').slice(0, 80);
      console.log(
        `  ${r.ok ? 'UP  ' : 'DOWN'} ${r.seat.padEnd(11)} ${tierOf(r.seat).padEnd(10)} ${String(r.model).padEnd(24)} ${String(`${r.ms}ms`).padStart(8)}  ${detail}`,
      );
    }
    console.log(`\n[health] ${rosterResults.length - down.length}/${rosterResults.length} roster seats UP`);
    if (down.length > 0) console.log(`[health] DOWN: ${down.map(d => d.seat).join(', ')}`);
  }

  process.exitCode = down.length > 0 ? 1 : 0;
}

const env = loadEnv();

main().catch(err => {
  console.error(`[health] fatal: ${err.message}`);
  process.exitCode = 1;
});
