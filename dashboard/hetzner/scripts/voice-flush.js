#!/usr/bin/env node
/**
 * voice-flush.js
 *
 * Every 15 min: scan /tmp/voice-*.md for fallback voice notes saved when the
 * PC bridge was down. Replay each one through /api/vault/write. Delete on
 * success. Skip silently if none.
 *
 * Per AIOS-ACTIVITY-LOG convention, this script appends a row on every run
 * regardless of outcome (so we can see "ran but nothing to flush" in the log).
 */

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:http');

const BRIDGE_URL = process.env.ECC_BRIDGE_URL || 'http://100.69.115.98:3738';
const BRIDGE_TOKEN = process.env.ECC_BRIDGE_TOKEN || '';
const TMP_DIR = '/tmp';
const VOICE_GLOB_PREFIX = 'voice-';
const ACTIVITY_FOLDER = 'AIOS';
const ACTIVITY_FILE = 'AIOS-ACTIVITY-LOG.md';

function listFallbackFiles() {
  if (!fs.existsSync(TMP_DIR)) return [];
  return fs
    .readdirSync(TMP_DIR)
    .filter((name) => name.startsWith(VOICE_GLOB_PREFIX) && name.endsWith('.md'))
    .map((name) => path.join(TMP_DIR, name));
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          Authorization: `Bearer ${BRIDGE_TOKEN}`,
        },
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(chunks);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${chunks.slice(0, 200)}`));
            }
          } catch (err) {
            reject(new Error(`bad JSON: ${chunks.slice(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function flushOne(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const filename = path.basename(filePath);
  // Default route: _inbox. Original tag routing happened at capture time; we
  // intentionally don't re-route here to keep the file path stable.
  const result = await postJson(`${BRIDGE_URL}/api/vault/write`, {
    folder: '_inbox',
    filename,
    content,
    mode: 'create',
  });
  if (!result.success) {
    throw new Error(`bridge rejected: ${result.error}`);
  }
  fs.unlinkSync(filePath);
  return result.data.path;
}

async function appendActivityRow(outcome, summary, notes = '') {
  if (!BRIDGE_TOKEN) return;
  try {
    const timestamp = new Date().toISOString();
    const row = `| ${timestamp} | voice-flush | ${outcome} | ${summary} |  |  | ${notes} |\n`;
    await postJson(`${BRIDGE_URL}/api/vault/write`, {
      folder: ACTIVITY_FOLDER,
      filename: ACTIVITY_FILE,
      content: row,
      mode: 'append',
    });
  } catch {
    // Don't crash on log failure
  }
}

async function main() {
  const files = listFallbackFiles();
  if (files.length === 0) {
    // Silent — don't even log "nothing to do" 96 times a day
    process.exit(0);
  }

  let flushed = 0;
  const failures = [];
  for (const file of files) {
    try {
      await flushOne(file);
      flushed++;
    } catch (err) {
      failures.push(`${path.basename(file)}: ${err.message.slice(0, 80)}`);
    }
  }

  if (failures.length === 0) {
    await appendActivityRow('✅', `flushed ${flushed} fallback voice notes`);
    console.log(`[voice-flush] flushed ${flushed}`);
    process.exit(0);
  } else {
    await appendActivityRow(
      '⚠️',
      `flushed ${flushed}, failed ${failures.length}`,
      failures.join(' | ')
    );
    console.error(`[voice-flush] flushed=${flushed} failed=${failures.length}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`[voice-flush] fatal: ${err.message}`);
  process.exit(1);
});
