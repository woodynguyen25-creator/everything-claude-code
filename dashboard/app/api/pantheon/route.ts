import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';

export const dynamic = 'force-dynamic';

type AgentState = 'live' | 'idle' | 'down' | 'unknown';

interface Agent {
  id: string;
  name: string;
  title: string;
  role: string;
  state: AgentState;
  lastActivity: string | null;
  metric: string | null;
  detail: string | null;
  cron: string | null;
}

let _cache: { value: Agent[]; expiresAt: number } | null = null;
const CACHE_MS = 20_000;

function sshSpawn(remoteCmd: string, timeoutMs = 10_000): Promise<string> {
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

// One SSH call collects everything we need.
const PROBE_CMD = `
echo ===ATLAS===
cat /home/hermes/atlas/state.json 2>/dev/null || echo "{}"
echo ===FENRIR===
cat /home/hermes/fenrir/state.json 2>/dev/null || echo "{}"
echo ===SAURON-LAST===
ls -t /home/hermes/sauron/reports/*.md 2>/dev/null | head -1 || echo none
echo ===HERMES-GATEWAY===
sudo -u hermes -H bash -lc "XDG_RUNTIME_DIR=/run/user/\\\$(id -u hermes) systemctl --user is-active hermes-gateway.service" 2>/dev/null || echo unknown
echo ===HERMES-WEBUI===
sudo -u hermes -H bash -lc "XDG_RUNTIME_DIR=/run/user/\\\$(id -u hermes) systemctl --user is-active hermes-webui.service" 2>/dev/null || echo unknown
echo ===THOR-BTC===
cat /home/hermes/hermes-trading/state-btc/heartbeat.json 2>/dev/null || echo "{}"
echo ===THOR-ETH===
cat /home/hermes/hermes-trading/state-eth/heartbeat.json 2>/dev/null || echo "{}"
echo ===THOR-SPY===
cat /home/hermes/hermes-trading/state-spy/heartbeat.json 2>/dev/null || echo "{}"
echo ===PARLAY===
echo "{\\"status\\": \\"pc-only\\"}"
echo ===END===
`.trim();

function parseSection(stdout: string, marker: string, next: string): string {
  const start = stdout.indexOf(`===${marker}===`);
  if (start === -1) return '';
  const end = stdout.indexOf(`===${next}===`, start);
  return stdout.slice(start + marker.length + 6, end === -1 ? undefined : end).trim();
}

function ageSeconds(ts: number | undefined | null): number | null {
  if (!ts) return null;
  return Math.floor(Date.now() / 1000 - ts);
}

function fmtAge(s: number | null): string | null {
  if (s === null) return null;
  if (s < 90) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

async function collect(): Promise<Agent[]> {
  let stdout: string;
  try {
    stdout = await sshSpawn(PROBE_CMD);
  } catch {
    // SSH unreachable — return everything as unknown
    return baseAgents().map((a) => ({ ...a, state: 'unknown' as AgentState }));
  }

  const atlasRaw = parseSection(stdout, 'ATLAS', 'FENRIR');
  const fenrirRaw = parseSection(stdout, 'FENRIR', 'SAURON-LAST');
  const sauronReport = parseSection(stdout, 'SAURON-LAST', 'HERMES-GATEWAY');
  const gatewayState = parseSection(stdout, 'HERMES-GATEWAY', 'HERMES-WEBUI');
  const webuiState = parseSection(stdout, 'HERMES-WEBUI', 'THOR-BTC');
  const btcRaw = parseSection(stdout, 'THOR-BTC', 'THOR-ETH');
  const ethRaw = parseSection(stdout, 'THOR-ETH', 'THOR-SPY');
  const spyRaw = parseSection(stdout, 'THOR-SPY', 'PARLAY');

  const safeParse = <T>(s: string, fallback: T): T => {
    try { return JSON.parse(s) as T; } catch { return fallback; }
  };

  const atlasState = safeParse<Record<string, { state: string; last_check_ts: number; consecutive_failures: number }>>(atlasRaw, {});
  const fenrirState = safeParse<Record<string, { state: string; last_check_ts: number }>>(fenrirRaw, {});

  const atlasTargets = Object.values(atlasState);
  const atlasDown = atlasTargets.filter((t) => t.state === 'down').length;
  const atlasOk = atlasTargets.filter((t) => t.state === 'ok').length;
  const atlasLastCheck = atlasTargets.length > 0 ? Math.max(...atlasTargets.map((t) => t.last_check_ts || 0)) : 0;
  const downTargetNames = atlasTargets.filter((t) => t.state === 'down').map((t) => (t as { name?: string }).name).filter(Boolean) as string[];
  // Atlas itself is "live" if it has been probing within the last 3 minutes (timer fires every 60s).
  const atlasTicking = atlasLastCheck > 0 && (Date.now() / 1000 - atlasLastCheck) < 180;

  const fenrirEnabled = Object.values(fenrirState);

  const btc = safeParse<{ price?: number; rsi?: number; ts?: number; open_trade?: boolean }>(btcRaw, {});
  const eth = safeParse<{ price?: number; rsi?: number; ts?: number; open_trade?: boolean }>(ethRaw, {});
  const spy = safeParse<{ price?: number; rsi?: number; ts?: number; open_trade?: boolean }>(spyRaw, {});

  const newestThorTs = Math.max(btc.ts || 0, eth.ts || 0, spy.ts || 0);
  const thorOpen = [btc, eth, spy].filter((x) => x.open_trade).length;

  return [
    {
      id: 'lebot-james',
      name: 'LeBot James',
      title: 'Chief of Staff',
      role: 'Telegram bot · routes to skills · powered by Groq llama-3.3-70b',
      state: gatewayState === 'active' && webuiState === 'active' ? 'live' : webuiState === 'active' || gatewayState === 'active' ? 'idle' : 'down',
      lastActivity: 'now',
      metric: 'Hermes Agent · 192 skills · Groq brain',
      detail: `gateway: ${gatewayState} · webui: ${webuiState}`,
      cron: 'always-on',
    },
    {
      id: 'thor',
      name: 'Thor',
      title: 'The Trader',
      role: '3-asset paper trader · BTC ETH SPY · Calmar-biased score',
      state: newestThorTs > 0 && ageSeconds(newestThorTs)! < 120 ? 'live' : 'idle',
      lastActivity: fmtAge(ageSeconds(newestThorTs)),
      metric: `${thorOpen} open positions · v01`,
      detail: btc.price ? `BTC $${Math.round(btc.price).toLocaleString()} · ETH $${Math.round(eth.price || 0).toLocaleString()} · SPY $${(spy.price || 0).toFixed(2)}` : '—',
      cron: '1m loop · 6h reflection',
    },
    {
      id: 'atlas',
      name: 'Atlas',
      title: 'The Doctor',
      role: 'Carries the world · watches every service · auto-heals',
      // Atlas itself is "live" whenever it is ticking. Target failures are surfaced separately.
      state: atlasTicking ? 'live' : 'down',
      lastActivity: fmtAge(ageSeconds(atlasLastCheck)),
      metric: `${atlasOk}/${atlasTargets.length} watched`,
      detail: !atlasTicking
        ? 'watchdog timer not ticking'
        : atlasDown === 0
          ? 'all targets nominal'
          : `${atlasDown} target(s) down: ${downTargetNames.join(', ')}`,
      cron: 'every 60s',
    },
    {
      id: 'fenrir',
      name: 'Fenrir',
      title: 'The Wolf',
      role: 'Lucky Dog guardian · site uptime · lead scout',
      state: fenrirEnabled.length === 0 ? 'idle' : fenrirEnabled.every((s) => s.state === 'ok') ? 'live' : 'down',
      lastActivity: fenrirEnabled.length === 0 ? 'waiting for sites' : fmtAge(ageSeconds(Math.max(...fenrirEnabled.map((s) => s.last_check_ts || 0)))),
      metric: fenrirEnabled.length === 0 ? '0 sites enabled' : `${fenrirEnabled.length} sites watched`,
      detail: fenrirEnabled.length === 0 ? 'awaiting Lucky Dog deploy' : `${fenrirEnabled.filter((s) => s.state === 'ok').length}/${fenrirEnabled.length} up`,
      cron: '5m watch · daily 9am lead scout',
    },
    {
      id: 'sauron',
      name: 'Sauron',
      title: 'The All-Seeing',
      role: 'Weekly AI sweep · 2x daily market review · trade audit',
      state: sauronReport === 'none' || !sauronReport ? 'idle' : 'live',
      lastActivity: sauronReport === 'none' ? 'no reports yet' : sauronReport.split('/').pop() || null,
      metric: 'DeepSeek-V3 · GitHub · yfinance · Kraken',
      detail: sauronReport === 'none' ? 'first report after next cron fire' : `last: ${sauronReport.split('/').pop()}`,
      cron: 'Sun 7am · daily 9:35 open · 4:05 close · 5pm audit',
    },
    {
      id: 'perseus',
      name: 'Perseus',
      title: 'The Hero',
      role: 'Code review · build · refactor (PC-side, on demand)',
      state: 'idle',
      lastActivity: 'on demand',
      metric: 'Claude Code on PC',
      detail: 'wakes when summoned',
      cron: 'manual',
    },
    {
      id: 'parlay',
      name: 'Parlay Bot',
      title: 'The Hunter',
      role: '24/7 DFS scanner · PrizePicks · Odds API · Kelly sizing',
      state: 'idle',
      lastActivity: 'pending migration',
      metric: 'on PC — queued to migrate',
      detail: 'awaiting move to Droplet',
      cron: 'manual (will be: hourly during slate windows)',
    },
  ];
}

function baseAgents(): Agent[] {
  return [
    { id: 'lebot-james', name: 'LeBot James', title: 'Chief of Staff', role: 'Orchestrator', state: 'unknown', lastActivity: null, metric: null, detail: null, cron: null },
    { id: 'thor', name: 'Thor', title: 'The Trader', role: '3-asset paper trader', state: 'unknown', lastActivity: null, metric: null, detail: null, cron: null },
    { id: 'atlas', name: 'Atlas', title: 'The Doctor', role: 'Service watchdog', state: 'unknown', lastActivity: null, metric: null, detail: null, cron: null },
    { id: 'fenrir', name: 'Fenrir', title: 'The Wolf', role: 'Site guardian', state: 'unknown', lastActivity: null, metric: null, detail: null, cron: null },
    { id: 'sauron', name: 'Sauron', title: 'The All-Seeing', role: 'Research', state: 'unknown', lastActivity: null, metric: null, detail: null, cron: null },
    { id: 'perseus', name: 'Perseus', title: 'The Hero', role: 'Code review', state: 'idle', lastActivity: null, metric: null, detail: null, cron: null },
    { id: 'parlay', name: 'Parlay Bot', title: 'The Hunter', role: 'DFS scanner', state: 'idle', lastActivity: null, metric: null, detail: null, cron: null },
  ];
}

export async function GET() {
  const now = Date.now();
  if (_cache && _cache.expiresAt > now) {
    return NextResponse.json({ agents: _cache.value, cached: true });
  }
  const agents = await collect();
  _cache = { value: agents, expiresAt: now + CACHE_MS };
  return NextResponse.json({ agents, cached: false });
}
