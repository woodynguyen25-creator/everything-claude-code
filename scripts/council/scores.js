#!/usr/bin/env node
/**
 * Per-seat calibration: did the seats' P(success) match what actually happened?
 *
 * Added 2026-10-05 from the research pass: proper scoring rules on questions that later
 * resolve are how ForecastBench and Metaculus learn whom to trust (arXiv 2409.19839). Until
 * now the ledger recorded verdicts but never outcomes, so "the council was right" could not
 * be checked. A resolution is one ledger row: { kind: 'resolution', tag, outcome: 0|1 }.
 * The latest resolution for a tag wins, so a mistaken one is corrected by resolving again.
 *
 * Brier = mean (p - outcome)^2; 0 is perfect, 0.25 is a coin flip at p=0.5, lower is better.
 *
 *   node scripts/council/scores.js --resolve <tag> <1|0>   (1 = it worked / GO was right)
 *   node scripts/council/scores.js                          (per-seat table)
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_LEDGER = path.join(__dirname, '..', '..', 'dashboard', 'data', 'council-ledger.jsonl');

function readRows(ledgerPath) {
  let raw = '';
  try { raw = fs.readFileSync(ledgerPath, 'utf8'); } catch { return []; }
  const rows = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch { /* torn line: not a resolution, not a vote */ }
  }
  return rows;
}

function resolve(ledgerPath, tag, outcome) {
  if (!tag) throw new Error('resolve: tag required');
  if (outcome !== 0 && outcome !== 1) throw new Error('resolve: outcome must be 0 or 1');
  // Typo guard (review 10/05): an unknown tag used to append an orphan row silently.
  if (!readRows(ledgerPath).some(r => r.tag === tag && r.kind !== 'resolution')) {
    throw new Error(`resolve: no convene rows for tag "${tag}" in ${ledgerPath}`);
  }
  const row = { ts: new Date().toISOString(), kind: 'resolution', provider: 'operator', tag, outcome };
  fs.appendFileSync(ledgerPath, JSON.stringify(row) + '\n');
  return row;
}

function brierBySeat(ledgerPath) {
  const rows = readRows(ledgerPath);
  const outcomes = new Map();   // Map, not {}: a tag named "constructor" is not resolved
  for (const r of rows) if (r.kind === 'resolution' && r.tag) outcomes.set(r.tag, r.outcome);
  // One vote per (tag, seat): the FINAL round's row (review 10/05 — with --rounds 2 both
  // rounds carried a verdict + prob and were scored twice).
  const final = new Map();
  for (const r of rows) {
    if (r.kind === 'resolution' || !r.verdict || !outcomes.has(r.tag)) continue;
    const k = `${r.tag}\u0000${r.provider}`;
    const prev = final.get(k);
    if (!prev || (r.round || 1) >= (prev.round || 1)) final.set(k, r);
  }
  const seats = {};
  for (const r of final.values()) {
    const s = (seats[r.provider] = seats[r.provider] || { n: 0, sum: 0, missing: 0 });
    if (typeof r.prob !== 'number') { s.missing++; continue; }
    s.n++;
    s.sum += (r.prob - outcomes.get(r.tag)) ** 2;
  }
  const out = {};
  for (const [seat, s] of Object.entries(seats)) {
    out[seat] = { n: s.n, missing: s.missing, brier: s.n ? s.sum / s.n : null };
  }
  return out;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv[0] === '--resolve') {
    try {
      const r = resolve(DEFAULT_LEDGER, argv[1], Number(argv[2]));
      process.stdout.write(`resolved ${r.tag} = ${r.outcome}\n`);
    } catch (e) {
      process.stderr.write(`${e.message}\nusage: scores.js --resolve <tag> 1|0\n`);
      process.exitCode = 1;
    }
  } else {
    const s = brierBySeat(DEFAULT_LEDGER);
    const seats = Object.entries(s).sort((a, b) => (a[1].brier ?? 9) - (b[1].brier ?? 9));
    if (!seats.length) process.stdout.write('no resolved tags yet — resolve one: scores.js --resolve <tag> 1|0\n');
    for (const [seat, v] of seats) {
      process.stdout.write(`${seat.padEnd(10)} brier ${v.brier === null ? '  —  ' : v.brier.toFixed(3)}  n=${v.n}  no-prob=${v.missing}\n`);
    }
  }
}

module.exports = { resolve, brierBySeat, readRows };
