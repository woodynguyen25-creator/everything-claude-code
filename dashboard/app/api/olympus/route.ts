import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SSH_HOST = 'root@142.93.12.177';

// Read a file from the Droplet via SSH. Returns null if unreachable or file missing.
function sshRead(remotePath: string, maxLines = 20): Promise<string | null> {
  return new Promise((resolve) => {
    const cmd = `tail -${maxLines} ${remotePath} 2>/dev/null`;
    const proc = spawn(
      'ssh',
      ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=5', SSH_HOST, cmd],
      { timeout: 8000 },
    );
    let out = '';
    proc.stdout.on('data', (d: Buffer) => { out += d.toString(); });
    proc.on('error', () => resolve(null));
    proc.on('close', (code: number | null) => resolve(code === 0 ? out.trim() : null));
  });
}

function sshCat(remotePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = spawn(
      'ssh',
      ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=5', SSH_HOST, `cat ${remotePath} 2>/dev/null`],
      { timeout: 8000 },
    );
    let out = '';
    proc.stdout.on('data', (d: Buffer) => { out += d.toString(); });
    proc.on('error', () => resolve(null));
    proc.on('close', (code: number | null) => resolve(code === 0 ? out.trim() : null));
  });
}

// Static roster — always available, drives the UI even before agents are deployed
const ROSTER = [
  // Phase 1 — live
  { name: 'Zeus',     role: 'Chief Strategist',     symbol: '⚡', phase: 1, heritage: 'Greek',
    description: 'Daily macro oracle. Calls the market regime each morning.' },
  { name: 'Poseidon', role: 'Risk Manager (veto)',   symbol: '🌊', phase: 1, heritage: 'Greek',
    description: 'Absolute veto authority. No trade passes without his blessing.' },
  { name: 'Artemis',  role: 'Options Flow Scout',   symbol: '🏹', phase: 1, heritage: 'Greek',
    description: 'Hunts unusual sweeps and whale moves across the watchlist.' },
  // CIO — overall
  { name: 'Thor',     role: 'Chairman / CIO',        symbol: '⚒️', phase: 1, heritage: 'Norse',
    description: 'Final call on every trade. Synthesizes the full council.' },
  // Phase 2
  { name: 'Apollo',   role: 'The Bull',              symbol: '☀️', phase: 2, heritage: 'Greek',
    description: 'Argues the upside thesis for every signal.' },
  { name: 'Athena',   role: 'The Bear',              symbol: '🦉', phase: 2, heritage: 'Greek',
    description: 'Cold, precise. Argues the downside case with logic.' },
  { name: 'Ares',     role: 'Catalyst Scout',        symbol: '⚔️', phase: 2, heritage: 'Greek',
    description: 'Tracks earnings, FOMC, and scheduled market catalysts.' },
  { name: 'Loki',     role: 'Red Team',              symbol: '🔥', phase: 2, heritage: 'Norse',
    description: 'Trickster. Finds the failure mode neither Bull nor Bear saw.' },
  // Phase 3
  { name: 'Calliope', role: 'Scribe / Journalist',  symbol: '📜', phase: 3, heritage: 'Greek',
    description: 'Muse of epic poetry. Writes post-trade journals and weekly reviews.' },
  { name: 'Themis',   role: 'Forecaster',            symbol: '⚖️', phase: 3, heritage: 'Greek',
    description: 'Goddess of divine law. Long-horizon forecasts on open positions.' },
];

const WATCHLIST = [
  'SPY', 'TECL', 'IWM', 'PLTR', 'GOOG', 'META',
  'MSFT', 'NVDA', 'AMZN', 'HOOD', 'SOXL', 'TSLA', 'GLD', 'SLV',
];

export async function GET() {
  // Try to read recent journal entries from Droplet
  const journalRaw = await sshRead('/home/hermes/olympus/journal.jsonl', 15);
  const journal: unknown[] = [];
  if (journalRaw) {
    for (const line of journalRaw.split('\n')) {
      try {
        if (line.trim()) journal.push(JSON.parse(line));
      } catch { /* skip malformed */ }
    }
  }

  // Check if Artemis is live (she writes a .last_run sentinel after each scan)
  const lastRunRaw = await sshRead('/home/hermes/olympus/data/signals/.last_run', 1);
  const isLive = lastRunRaw !== null && lastRunRaw.length > 0;

  const decisionsRaw = await sshCat('/home/hermes/olympus/data/decisions/latest.json');
  let decisions: unknown[] = [];
  if (decisionsRaw) {
    try {
      const parsed = JSON.parse(decisionsRaw);
      decisions = Array.isArray(parsed) ? parsed : [];
    } catch {
      decisions = [];
    }
  }

  // Latest Zeus brief
  const latestBrief = journal.findLast(
    (e) => (e as Record<string, unknown>).type === 'macro_brief'
  ) as Record<string, unknown> | undefined;

  return NextResponse.json({
    fund: 'Olympus Fund',
    tagline: 'The hall of warriors. Strategy debated. Risk veto\'d. Edge logged.',
    phase: 2,
    roster: ROSTER,
    watchlist: WATCHLIST,
    decisions: decisions.slice(0, 12),
    latestDecision: decisions[0] ?? null,
    journal: [...journal].reverse().slice(0, 10), // most recent first
    isLive,
    latestBrief: latestBrief
      ? { ts: latestBrief.ts, brief: (latestBrief as Record<string, unknown>).brief }
      : null,
    checkedAt: new Date().toISOString(),
  });
}
