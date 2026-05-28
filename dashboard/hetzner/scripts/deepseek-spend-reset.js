#!/usr/bin/env node
/**
 * deepseek-spend-reset.js
 *
 * Runs at midnight America/Chicago daily. Clears the triad-router's daily
 * spend tracker so the fresh day starts at $0 across all metered providers.
 *
 * The triad-router itself already resets on read when the stored date != today,
 * but writing an explicit zero baseline keeps the audit log honest and gives
 * us a deterministic "spend window starts here" timestamp.
 */

const fs = require('node:fs');
const path = require('node:path');

const STATE_PATH =
  process.env.TRIAD_SPEND_STATE ||
  '/home/hermes/.hermes/state/triad-daily-spend.json';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function main() {
  const dir = path.dirname(STATE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let prev = null;
  if (fs.existsSync(STATE_PATH)) {
    try {
      prev = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    } catch {
      // ignore parse errors
    }
  }

  const fresh = { date: todayKey(), spend: {} };
  fs.writeFileSync(STATE_PATH, JSON.stringify(fresh, null, 2));

  const summary =
    prev && prev.spend
      ? Object.entries(prev.spend)
          .map(([k, v]) => `${k}=$${Number(v).toFixed(2)}`)
          .join(' ') || 'no spend'
      : 'no prior state';
  console.log(`[deepseek-spend-reset] reset to ${fresh.date} — prior: ${summary}`);
}

main();
