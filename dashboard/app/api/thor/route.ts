import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';

export const dynamic = 'force-dynamic';

interface ChildAgent {
  id: 'magni' | 'modi' | 'thrud';
  name: string;
  asset: 'BTC' | 'ETH' | 'SPY';
  parent: 'thor';
  lore: string;
  // live snapshot
  price: number | null;
  rsi: number | null;
  heartbeatAgeSec: number | null;
  // strategy
  strategyVersion: string | null;
  threshold: number | null;
  stopLossPct: number | null;
  takeProfitPct: number | null;
  // open position
  openTrade: {
    entryTs: number;
    entryPrice: number;
    sizeR: number;
    unrealizedPnlPct: number;
    holdMinutes: number;
  } | null;
  // last 24h analytics
  trades24h: number;
  pnl24hPct: number;
  winRate24h: number | null;
  lastReflection: { ts: number; field: string | null; reason: string } | null;
}

let _cache: { value: ChildAgent[]; expiresAt: number } | null = null;
const CACHE_MS = 10_000;

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
for asset in btc eth spy; do
  echo "===HB-$asset==="
  cat /home/hermes/hermes-trading/state-$asset/heartbeat.json 2>/dev/null || echo "{}"
  echo "===OPEN-$asset==="
  cat /home/hermes/hermes-trading/state-$asset/open_trade.json 2>/dev/null || echo "null"
  echo "===STRAT-$asset==="
  cat /home/hermes/hermes-trading/state-$asset/strategy.yaml 2>/dev/null || echo ""
  echo "===TRADES24-$asset==="
  python3 -c "
import json, time
cutoff = time.time() - 86400
try:
  with open('/home/hermes/hermes-trading/state-$asset/trades.jsonl') as f:
    rows = [json.loads(l) for l in f if l.strip()]
  rows = [r for r in rows if r.get('exit_ts', 0) >= cutoff]
  pnl = sum(r.get('pnl_pct', 0) for r in rows)
  wins = sum(1 for r in rows if r.get('pnl_pct', 0) > 0)
  wr = wins / len(rows) if rows else None
  print(json.dumps({'count': len(rows), 'pnl': pnl, 'wr': wr}))
except: print('{\"count\": 0, \"pnl\": 0, \"wr\": null}')
"
  echo "===REFLECT-$asset==="
  tail -1 /home/hermes/hermes-trading/state-$asset/reflections.jsonl 2>/dev/null || echo "null"
done
echo "===END==="
`.trim();

function section(stdout: string, marker: string, nextMarker: string): string {
  const start = stdout.indexOf(`===${marker}===`);
  if (start === -1) return '';
  const end = stdout.indexOf(`===${nextMarker}===`, start);
  return stdout.slice(start + marker.length + 6, end === -1 ? undefined : end).trim();
}

function parseStrategy(yaml: string): { version: string | null; threshold: number | null; sl: number | null; tp: number | null } {
  const out = { version: null as string | null, threshold: null as number | null, sl: null as number | null, tp: null as number | null };
  for (const line of yaml.split('\n')) {
    const m = line.match(/^\s*version:\s*"?([^"\s]+)"?\s*$/);
    if (m) out.version = m[1];
    const t = line.match(/^\s*threshold:\s*([\d.]+)/);
    if (t) out.threshold = parseFloat(t[1]);
    const s = line.match(/^\s*stop_loss_pct:\s*([\d.]+)/);
    if (s) out.sl = parseFloat(s[1]);
    const p = line.match(/^\s*take_profit_pct:\s*([\d.]+)/);
    if (p) out.tp = parseFloat(p[1]);
  }
  return out;
}

const CHILDREN: Array<Omit<ChildAgent, 'price' | 'rsi' | 'heartbeatAgeSec' | 'strategyVersion' | 'threshold' | 'stopLossPct' | 'takeProfitPct' | 'openTrade' | 'trades24h' | 'pnl24hPct' | 'winRate24h' | 'lastReflection'>> = [
  { id: 'magni', name: 'Magni', asset: 'BTC', parent: 'thor', lore: 'Strength · Thor\'s firstborn. Trades Bitcoin.' },
  { id: 'modi', name: 'Modi', asset: 'ETH', parent: 'thor', lore: 'Courage · Thor\'s second son. Trades Ethereum.' },
  { id: 'thrud', name: 'Thrud', asset: 'SPY', parent: 'thor', lore: 'Strength · Thor\'s daughter. Trades SPY.' },
];

async function collect(): Promise<ChildAgent[]> {
  let stdout: string;
  try { stdout = await sshSpawn(PROBE); } catch { return CHILDREN.map((c) => ({ ...c, price: null, rsi: null, heartbeatAgeSec: null, strategyVersion: null, threshold: null, stopLossPct: null, takeProfitPct: null, openTrade: null, trades24h: 0, pnl24hPct: 0, winRate24h: null, lastReflection: null })); }

  const now = Date.now() / 1000;
  return CHILDREN.map((c) => {
    const asset = c.asset.toLowerCase();
    const hbRaw = section(stdout, `HB-${asset}`, `OPEN-${asset}`);
    const openRaw = section(stdout, `OPEN-${asset}`, `STRAT-${asset}`);
    const stratRaw = section(stdout, `STRAT-${asset}`, `TRADES24-${asset}`);
    const trades24Raw = section(stdout, `TRADES24-${asset}`, `REFLECT-${asset}`);
    const reflectRaw = section(stdout, `REFLECT-${asset}`, asset === 'spy' ? 'END' : `HB-${asset === 'btc' ? 'eth' : 'spy'}`);

    const hb = (() => { try { return JSON.parse(hbRaw); } catch { return {}; } })() as { price?: number; rsi?: number; ts?: number };
    const open = (() => { try { return JSON.parse(openRaw); } catch { return null; } })() as { entry_ts?: number; entry_price?: number; size_r?: number } | null;
    const strat = parseStrategy(stratRaw);
    const trades24 = (() => { try { return JSON.parse(trades24Raw); } catch { return { count: 0, pnl: 0, wr: null }; } })() as { count: number; pnl: number; wr: number | null };
    const reflect = (() => {
      if (!reflectRaw || reflectRaw === 'null') return null;
      try { return JSON.parse(reflectRaw); } catch { return null; }
    })() as { ts: number; change?: { field?: string | null; reason?: string } } | null;

    let openTrade: ChildAgent['openTrade'] = null;
    if (open && open.entry_ts && open.entry_price && hb.price) {
      const unreal = ((hb.price - open.entry_price) / open.entry_price) * 100;
      openTrade = {
        entryTs: open.entry_ts,
        entryPrice: open.entry_price,
        sizeR: open.size_r ?? 0,
        unrealizedPnlPct: Math.round(unreal * 100) / 100,
        holdMinutes: Math.round((now - open.entry_ts) / 60),
      };
    }

    return {
      ...c,
      price: hb.price ?? null,
      rsi: hb.rsi ?? null,
      heartbeatAgeSec: hb.ts ? Math.round(now - hb.ts) : null,
      strategyVersion: strat.version,
      threshold: strat.threshold,
      stopLossPct: strat.sl,
      takeProfitPct: strat.tp,
      openTrade,
      trades24h: trades24.count,
      pnl24hPct: Math.round(trades24.pnl * 100) / 100,
      winRate24h: trades24.wr,
      lastReflection: reflect
        ? { ts: reflect.ts, field: reflect.change?.field ?? null, reason: reflect.change?.reason ?? 'hold' }
        : null,
    };
  });
}

export async function GET() {
  const now = Date.now();
  if (_cache && _cache.expiresAt > now) {
    return NextResponse.json({ children: _cache.value, cached: true });
  }
  const children = await collect();
  _cache = { value: children, expiresAt: now + CACHE_MS };
  return NextResponse.json({ children, cached: false });
}
