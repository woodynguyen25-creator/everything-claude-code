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
 *   node scripts/council/health.js --json       # machine-readable
 *
 * Exit codes: 0 = every roster seat up · 1 = at least one roster seat down.
 * Safe to wire as a preflight; it costs one trivial prompt per seat.
 */
'use strict';

const { loadEnv, SEATS } = require('./providers');
const { LEAD_SEATS, WORKER_SEATS, BENCHED_SEATS } = require('./roster');

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

async function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes('--json');
  const includeBenched = argv.includes('--all');

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
