#!/usr/bin/env node
/**
 * aios-audit.js
 *
 * Cron wrapper around the /aios-audit Hermes skill.
 * Invokes the skill, captures the result, posts Telegram summary on failure.
 *
 * Schedule: Sundays 18:00 CT.
 */

const { execSync } = require('node:child_process');

const HERMES_BIN = process.env.HERMES_BIN || 'hermes';
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT = process.env.TELEGRAM_ALLOWED_USERS || '';

function notifyTelegram(text) {
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

function main() {
  try {
    const out = execSync(`${HERMES_BIN} skill run aios-audit`, {
      encoding: 'utf8',
      timeout: 60_000,
    });
    console.log('[aios-audit] ok');
    console.log(out);
  } catch (err) {
    const msg = (err && err.message) || String(err);
    console.error(`[aios-audit] failed: ${msg}`);
    notifyTelegram(`❌ *aios-audit failed* — ${msg.slice(0, 200)}`);
    process.exit(1);
  }
}

main();
