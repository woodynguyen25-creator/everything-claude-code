#!/usr/bin/env node
/**
 * aios-onboard-nudge.js
 *
 * First Sunday of every quarter (Jan/Apr/Jul/Oct) at 19:00 CT.
 * Telegram nudge to re-run `/aios-onboard` since intake.md drifts in ~90 days.
 */

const { execSync } = require('node:child_process');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT = process.env.TELEGRAM_ALLOWED_USERS || '';

function notify(text) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT) return;
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const body = JSON.stringify({
      chat_id: TELEGRAM_CHAT.split(',')[0],
      text,
      parse_mode: 'Markdown',
    });
    execSync(
      `curl -sS -X POST -H 'Content-Type: application/json' -d '${body.replace(
        /'/g,
        "'\\''"
      )}' ${url}`,
      { stdio: 'ignore', timeout: 10_000 }
    );
  } catch {
    // best effort
  }
}

const message = [
  '🧭 *Quarterly intake nudge*',
  '',
  'Your `intake.md` may be drifting. Goals, time-sucks, and stakeholder list',
  'change faster than 90 days.',
  '',
  'Reply `/aios-onboard` to refresh it. Takes ~5 minutes — 7 questions.',
  '',
  '_Per Masterclass adoption #1 ([[AI Masterclass/SYNTHESIS]])._',
].join('\n');

notify(message);
console.log('[aios-onboard-nudge] sent');
