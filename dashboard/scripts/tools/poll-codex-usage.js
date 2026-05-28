#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');

const LOG_DB = path.join(os.homedir(), '.codex', 'logs_2.sqlite');
const OUTPUT = path.resolve(__dirname, '../../data/codex-usage.json');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function write(value) {
  ensureDir(OUTPUT);
  fs.writeFileSync(OUTPUT, JSON.stringify(value, null, 2), 'utf8');
}

function emptyUsage() {
  return {
    available: false,
    generatedAt: new Date().toISOString(),
    turns: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    lastEventAt: null,
  };
}

function poll() {
  if (!fs.existsSync(LOG_DB)) {
    write(emptyUsage());
    return;
  }

  const db = new Database(LOG_DB, { readonly: true });
  try {
    const sinceEpoch = Math.floor(new Date(new Date().toDateString()).getTime() / 1000);
    const rows = db
      .prepare(
        `
        SELECT ts, feedback_log_body
        FROM logs
        WHERE target = 'codex_otel.trace_safe'
          AND feedback_log_body LIKE '%event.name="codex.sse_event"%'
          AND feedback_log_body LIKE '%event.kind=response.completed%'
          AND ts >= ?
        ORDER BY ts DESC
        `
      )
      .all(sinceEpoch);

    let turns = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let lastEventAt = null;

    for (const row of rows) {
      const body = row.feedback_log_body || '';
      const inMatch = body.match(/input_token_count=(\d+)/);
      const outMatch = body.match(/output_token_count=(\d+)/);
      if (!inMatch && !outMatch) continue;
      turns += 1;
      inputTokens += Number(inMatch?.[1] || 0);
      outputTokens += Number(outMatch?.[1] || 0);
      if (!lastEventAt) {
        lastEventAt = new Date(Number(row.ts) * 1000).toISOString();
      }
    }

    write({
      available: true,
      generatedAt: new Date().toISOString(),
      turns,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      lastEventAt,
    });
  } finally {
    db.close();
  }
}

poll();
