/**
 * Council ledger — JSONL record of every model dispatch.
 * One line per provider call so the dashboard can show paid-capacity drawdown.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_LEDGER = path.resolve(__dirname, '..', '..', 'dashboard', 'data', 'council-ledger.jsonl');

/** Build one immutable ledger entry from a provider result. */
function buildEntry(result, { tag = '', promptChars = 0 } = {}) {
  return {
    ts: new Date().toISOString(),
    provider: result.provider,
    model: result.model,
    ok: Boolean(result.ok),
    ms: result.ms ?? 0,
    promptChars,
    outputChars: result.text ? result.text.length : 0,
    tag,
    error: result.error || undefined,
  };
}

function appendEntries(entries, ledgerPath = DEFAULT_LEDGER) {
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  const lines = entries.map(e => JSON.stringify(e)).join('\n');
  fs.appendFileSync(ledgerPath, `${lines}\n`, 'utf8');
}

function readRecent(n = 20, ledgerPath = DEFAULT_LEDGER) {
  try {
    const lines = fs.readFileSync(ledgerPath, 'utf8').split(/\r?\n/).filter(Boolean);
    return lines.slice(-n).map(l => JSON.parse(l));
  } catch {
    return [];
  }
}

/** Per-provider call counts and success rate for entries on a given UTC day (default: today). */
function summarize(entries, dayIso = new Date().toISOString().slice(0, 10)) {
  const byProvider = {};
  for (const e of entries) {
    if (!e.ts || !e.ts.startsWith(dayIso)) continue;
    const cur = byProvider[e.provider] || { calls: 0, ok: 0, ms: 0, outputChars: 0 };
    byProvider[e.provider] = {
      calls: cur.calls + 1,
      ok: cur.ok + (e.ok ? 1 : 0),
      ms: cur.ms + (e.ms || 0),
      outputChars: cur.outputChars + (e.outputChars || 0),
    };
  }
  return byProvider;
}

module.exports = { DEFAULT_LEDGER, buildEntry, appendEntries, readRecent, summarize };
