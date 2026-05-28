import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';

export const dynamic = 'force-dynamic';

interface ActivityEvent {
  ts: number;
  agent: string;
  kind: string;
  message: string;
  detail?: string;
}

let _cache: { value: ActivityEvent[]; expiresAt: number } | null = null;
const CACHE_MS = 15_000;

function sshSpawn(remoteCmd: string, timeoutMs = 12_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ['-o', 'ConnectTimeout=5', '-o', 'BatchMode=yes', 'root@142.93.12.177', remoteCmd];
    const proc = spawn('ssh', args, { windowsHide: true });
    let out = '';
    let err = '';
    const to = setTimeout(() => { proc.kill(); reject(new Error('ssh timeout')); }, timeoutMs);
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('error', (e) => { clearTimeout(to); reject(e); });
    proc.on('close', (code) => { clearTimeout(to); code !== 0 ? reject(new Error(err)) : resolve(out); });
  });
}

const PROBE = `
echo ===ATLAS===
tail -50 /home/hermes/atlas/atlas.log 2>/dev/null || echo
echo ===SAURON===
tail -50 /home/hermes/sauron/sauron.log 2>/dev/null || echo
echo ===FENRIR===
tail -50 /home/hermes/fenrir/fenrir.log 2>/dev/null || echo
echo ===TRADES-BTC===
tail -10 /home/hermes/hermes-trading/state-btc/trades.jsonl 2>/dev/null || echo
echo ===TRADES-ETH===
tail -10 /home/hermes/hermes-trading/state-eth/trades.jsonl 2>/dev/null || echo
echo ===TRADES-SPY===
tail -10 /home/hermes/hermes-trading/state-spy/trades.jsonl 2>/dev/null || echo
echo ===REFLECT-BTC===
tail -5 /home/hermes/hermes-trading/state-btc/reflections.jsonl 2>/dev/null || echo
echo ===REFLECT-ETH===
tail -5 /home/hermes/hermes-trading/state-eth/reflections.jsonl 2>/dev/null || echo
echo ===REFLECT-SPY===
tail -5 /home/hermes/hermes-trading/state-spy/reflections.jsonl 2>/dev/null || echo
echo ===SAURON-REPORTS===
ls -t /home/hermes/sauron/reports/*.md 2>/dev/null | head -8 | while read f; do echo "$(stat -c %Y "$f") $f"; done
echo ===END===
`.trim();

function section(stdout: string, marker: string, next: string): string {
  const start = stdout.indexOf(`===${marker}===`);
  if (start === -1) return '';
  const end = stdout.indexOf(`===${next}===`, start);
  return stdout.slice(start + marker.length + 6, end === -1 ? undefined : end).trim();
}

function parseLogLines(raw: string, agent: string, classify: (l: string) => { kind: string; message: string }): ActivityEvent[] {
  if (!raw) return [];
  const out: ActivityEvent[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^(\d{9,10})\s+(.+)$/);
    if (!m) continue;
    const ts = parseInt(m[1], 10);
    out.push({ ts, agent, ...classify(m[2]) });
  }
  return out;
}

function parseTrades(raw: string, asset: string): ActivityEvent[] {
  if (!raw) return [];
  const out: ActivityEvent[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const t = JSON.parse(line);
      out.push({
        ts: Math.floor(t.exit_ts || t.entry_ts),
        agent: 'thor',
        kind: t.exit_ts ? 'exit' : 'entry',
        message: `${asset.toUpperCase()} ${t.exit_reason || 'closed'} ${typeof t.pnl_pct === 'number' ? `${t.pnl_pct >= 0 ? '+' : ''}${t.pnl_pct.toFixed(2)}%` : ''}`.trim(),
        detail: `entry $${(t.entry_price ?? 0).toLocaleString()} → exit $${(t.exit_price ?? 0).toLocaleString()} · v${t.strategy_version}`,
      });
    } catch { /* ignore */ }
  }
  return out;
}

function parseReflections(raw: string, asset: string): ActivityEvent[] {
  if (!raw) return [];
  const out: ActivityEvent[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      const change = r.change || {};
      out.push({
        ts: Math.floor(r.ts),
        agent: 'thor',
        kind: 'reflection',
        message: change.field
          ? `${asset.toUpperCase()} v${r.new_version}: ${change.field} → ${change.to}`
          : `${asset.toUpperCase()} reflection: no change`,
        detail: `score ${(r.score?.score ?? 0).toFixed(2)} · ${r.mode}`,
      });
    } catch { /* ignore */ }
  }
  return out;
}

async function collect(): Promise<ActivityEvent[]> {
  let stdout: string;
  try {
    stdout = await sshSpawn(PROBE);
  } catch {
    return [];
  }

  const events: ActivityEvent[] = [];

  events.push(...parseLogLines(section(stdout, 'ATLAS', 'SAURON'), 'atlas', (l) => {
    if (l.startsWith('transition')) return { kind: 'transition', message: l.replace('transition ', '') };
    if (l.startsWith('recover')) return { kind: 'recover', message: l };
    return { kind: 'note', message: l };
  }));
  events.push(...parseLogLines(section(stdout, 'SAURON', 'FENRIR'), 'sauron', (l) => ({ kind: 'job', message: l })));
  events.push(...parseLogLines(section(stdout, 'FENRIR', 'TRADES-BTC'), 'fenrir', (l) => ({ kind: 'transition', message: l })));

  events.push(...parseTrades(section(stdout, 'TRADES-BTC', 'TRADES-ETH'), 'btc'));
  events.push(...parseTrades(section(stdout, 'TRADES-ETH', 'TRADES-SPY'), 'eth'));
  events.push(...parseTrades(section(stdout, 'TRADES-SPY', 'REFLECT-BTC'), 'spy'));

  events.push(...parseReflections(section(stdout, 'REFLECT-BTC', 'REFLECT-ETH'), 'btc'));
  events.push(...parseReflections(section(stdout, 'REFLECT-ETH', 'REFLECT-SPY'), 'eth'));
  events.push(...parseReflections(section(stdout, 'REFLECT-SPY', 'SAURON-REPORTS'), 'spy'));

  const reportRaw = section(stdout, 'SAURON-REPORTS', 'END');
  for (const line of reportRaw.split('\n')) {
    const m = line.trim().match(/^(\d{9,10})\s+(\S+)$/);
    if (!m) continue;
    const name = m[2].split('/').pop() || m[2];
    events.push({ ts: parseInt(m[1], 10), agent: 'sauron', kind: 'report', message: name, detail: 'archived' });
  }

  events.sort((a, b) => b.ts - a.ts);
  return events.slice(0, 50);
}

export async function GET() {
  const now = Date.now();
  if (_cache && _cache.expiresAt > now) {
    return NextResponse.json({ events: _cache.value, cached: true });
  }
  const events = await collect();
  _cache = { value: events, expiresAt: now + CACHE_MS };
  return NextResponse.json({ events, cached: false });
}
