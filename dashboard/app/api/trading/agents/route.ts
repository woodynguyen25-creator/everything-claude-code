import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';

export const dynamic = 'force-dynamic';

const ASSETS = ['btc', 'eth', 'spy'] as const;
type Asset = (typeof ASSETS)[number];

interface AgentHeartbeat {
  asset: Asset;
  symbol: string;
  price: number | null;
  rsi: number | null;
  openTrade: boolean;
  strategyVersion: string;
  ts: number | null;
  ageSeconds: number | null;
  status: 'live' | 'stale' | 'unreachable';
  recentTrades: number;
  lastReflection: { ts: number; mode: string; change: { field: string | null; from?: number | string; to?: number | string; reason?: string }; score: { score: number } } | null;
}

let _cache: { value: AgentHeartbeat[]; expiresAt: number } | null = null;
const CACHE_MS = 15_000;

function sshSpawn(remoteCmd: string, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ['-o', 'ConnectTimeout=5', '-o', 'BatchMode=yes', 'root@142.93.12.177', remoteCmd];
    const proc = spawn('ssh', args, { windowsHide: true });
    let out = '';
    let err = '';
    const to = setTimeout(() => {
      proc.kill();
      reject(new Error(`ssh timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('error', (e) => { clearTimeout(to); reject(e); });
    proc.on('close', (code) => {
      clearTimeout(to);
      if (code !== 0) reject(new Error(`ssh exit ${code}: ${err.trim()}`));
      else resolve(out);
    });
  });
}

async function fetchOne(asset: Asset): Promise<AgentHeartbeat> {
  const base = `/home/hermes/hermes-trading/state-${asset}`;
  const cmd = `cat ${base}/heartbeat.json 2>/dev/null || echo null; echo ===SEP===; wc -l < ${base}/trades.jsonl 2>/dev/null || echo 0; echo ===SEP===; tail -1 ${base}/reflections.jsonl 2>/dev/null || echo null`;

  const fallback: AgentHeartbeat = {
    asset,
    symbol: asset.toUpperCase(),
    price: null,
    rsi: null,
    openTrade: false,
    strategyVersion: '?',
    ts: null,
    ageSeconds: null,
    status: 'unreachable',
    recentTrades: 0,
    lastReflection: null,
  };

  try {
    const stdout = await sshSpawn(cmd);
    const parts = stdout.split('===SEP===').map((s) => s.trim());
    const heartbeat = parts[0] === 'null' || !parts[0] ? null : JSON.parse(parts[0]);
    const tradeCount = parseInt(parts[1] || '0', 10);
    const lastReflection = !parts[2] || parts[2] === 'null' ? null : JSON.parse(parts[2]);

    if (!heartbeat) {
      return { ...fallback, status: 'unreachable' };
    }

    const ageSeconds = Math.floor(Date.now() / 1000 - heartbeat.ts);
    const status: AgentHeartbeat['status'] = ageSeconds < 120 ? 'live' : ageSeconds < 600 ? 'stale' : 'unreachable';

    return {
      asset,
      symbol: heartbeat.symbol,
      price: heartbeat.price,
      rsi: heartbeat.rsi,
      openTrade: heartbeat.open_trade,
      strategyVersion: heartbeat.strategy_version,
      ts: heartbeat.ts,
      ageSeconds,
      status,
      recentTrades: tradeCount,
      lastReflection,
    };
  } catch {
    return fallback;
  }
}

export async function GET() {
  const now = Date.now();
  if (_cache && _cache.expiresAt > now) {
    return NextResponse.json({ agents: _cache.value, cached: true });
  }

  const agents = await Promise.all(ASSETS.map(fetchOne));
  _cache = { value: agents, expiresAt: now + CACHE_MS };
  return NextResponse.json({ agents, cached: false });
}
