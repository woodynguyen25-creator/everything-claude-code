import fs from 'node:fs/promises';
import path from 'node:path';
import Database from 'better-sqlite3';
import { PATHS } from '@/lib/paths';
import type { PanelSignal } from '@/types/panel-card';

export type TradingSignal = PanelSignal & {
  sourceLabel: 'PARLAY' | 'BRIEF';
};

type LatestBrief = {
  path: string;
  name: string;
  mtimeMs: number;
  headline: string;
  detail?: string;
  content: string;
};

type LatestParlay = {
  id: number;
  created_at: string;
  sport: string;
  n_legs: number;
  ev_pct: number;
  status: string;
  legs_json: string;
};

type FixedFile = {
  path: string;
  content: string;
  headline: string;
};

type TradingSources = {
  latestBrief: LatestBrief | null;
  latestParlay: LatestParlay | null;
  latestScanBrief: FixedFile | null;
  latestOptions: FixedFile | null;
};

function computeFreshness(iso: string, staleAfterMs: number) {
  const ageMs = Date.now() - new Date(iso).getTime();
  return {
    iso,
    staleAfterMs,
    isFresh: ageMs <= staleAfterMs,
  };
}

async function safeReadDir(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch {
    return [];
  }
}

async function readFixedFile(filePath: string): Promise<FixedFile | null> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const headline = lines.find((l) => l.startsWith('#'))?.replace(/^#+\s*/, '') ?? lines[0] ?? path.basename(filePath);
    return { path: filePath, content, headline };
  } catch {
    return null;
  }
}

async function readLatestBrief(): Promise<LatestBrief | null> {
  const entries = await safeReadDir(PATHS.tradingBriefs);
  const markdownFiles = entries.filter((entry) => entry.toLowerCase().endsWith('.md'));

  let latest: LatestBrief | null = null;

  for (const entry of markdownFiles) {
    const fullPath = path.join(PATHS.tradingBriefs, entry);
    try {
      const stat = await fs.stat(fullPath);
      if (latest && stat.mtimeMs <= latest.mtimeMs) {
        continue;
      }

      const raw = await fs.readFile(fullPath, 'utf8');
      const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const headline =
        lines.find((line) => line.startsWith('#'))?.replace(/^#+\s*/, '') ??
        lines[0] ??
        entry;
      const detail = lines.find((line) => line.startsWith('## Market Scorecard'))
        ? 'Market scorecard, sectors, forecasts, and headlines'
        : lines[1];

      latest = {
        path: fullPath,
        name: entry,
        mtimeMs: stat.mtimeMs,
        headline,
        detail,
        content: raw,
      };
    } catch {
      // Skip unreadable brief file.
    }
  }

  return latest;
}

function readLatestParlay(): LatestParlay | null {
  try {
    const db = new Database(PATHS.parlayBotDb, { readonly: true });
    const row = db
      .prepare(
        `SELECT id, created_at, sport, n_legs, ev_pct, status, legs_json
         FROM parlays
         ORDER BY datetime(created_at) DESC, id DESC
         LIMIT 1`
      )
      .get() as LatestParlay | undefined;
    db.close();
    return row ?? null;
  } catch {
    return null;
  }
}

function formatParlayHeadline(parlay: LatestParlay): string {
  const ev = Number.isFinite(parlay.ev_pct) ? parlay.ev_pct.toFixed(1) : '0.0';
  return `${parlay.sport} ${parlay.n_legs}-leg slate · EV +${ev}%`;
}

function formatParlayDetail(parlay: LatestParlay): string | undefined {
  try {
    const legs = JSON.parse(parlay.legs_json) as Array<{ player?: string; stat_raw?: string; direction?: string }>;
    const summary = legs
      .slice(0, 2)
      .map((leg) => [leg.player, leg.stat_raw, leg.direction].filter(Boolean).join(' · '))
      .filter(Boolean)
      .join(' | ');
    return summary || `${parlay.status} slate`;
  } catch {
    return `${parlay.status} slate`;
  }
}

export async function getTradingCards(): Promise<TradingSignal[]> {
  const cards: TradingSignal[] = [];
  const { latestBrief, latestParlay } = await loadTradingSources();

  if (latestParlay) {
    const freshness = computeFreshness(new Date(latestParlay.created_at).toISOString(), 4 * 60 * 60 * 1000);
    cards.push({
      sourceLabel: 'PARLAY',
      freshness: {
        iso: freshness.iso,
        staleAfterMs: freshness.staleAfterMs,
      },
      isFresh: freshness.isFresh,
      headline: formatParlayHeadline(latestParlay),
      detail: formatParlayDetail(latestParlay),
      nextAction: {
        verb: 'Open slate',
        href: `/trading?focus=parlay`,
        hotness: 2,
      },
      source: {
        kind: 'sqlite',
        path: PATHS.parlayBotDb,
      },
    });
  }

  if (latestBrief) {
    const freshness = computeFreshness(new Date(latestBrief.mtimeMs).toISOString(), 12 * 60 * 60 * 1000);
    cards.push({
      sourceLabel: 'BRIEF',
      freshness: {
        iso: freshness.iso,
        staleAfterMs: freshness.staleAfterMs,
      },
      isFresh: freshness.isFresh,
      headline: latestBrief.headline.slice(0, 80),
      detail: latestBrief.detail?.slice(0, 120),
      nextAction: {
        verb: 'Open brief',
        href: `/trading?focus=brief`,
        hotness: 1,
      },
      source: {
        kind: 'fs',
        path: latestBrief.path,
      },
    });
  }

  return cards.sort((left, right) => {
    const hotnessDiff = (right.nextAction?.hotness ?? 0) - (left.nextAction?.hotness ?? 0);
    if (hotnessDiff !== 0) return hotnessDiff;
    return right.freshness.iso.localeCompare(left.freshness.iso);
  });
}

async function loadTradingSources(): Promise<TradingSources> {
  const [latestBrief, latestScanBrief, latestOptions] = await Promise.all([
    readLatestBrief(),
    readFixedFile(PATHS.latestTradingBrief),
    readFixedFile(PATHS.latestOptionsAnalysis),
  ]);
  const latestParlay = readLatestParlay();
  return { latestBrief, latestParlay, latestScanBrief, latestOptions };
}

export async function getTradingRaw(kind: string | null, file?: string | null, id?: string | null) {
  const cards = await getTradingCards();

  if (kind === 'brief' && file) {
    const fullPath = path.join(PATHS.tradingBriefs, file);
    const content = await fs.readFile(fullPath, 'utf8');
    return {
      kind,
      path: fullPath,
      content,
      cards,
    };
  }

  if (kind === 'parlay') {
    return {
      kind,
      id,
      path: PATHS.parlayBotDb,
      latest: readLatestParlay(),
      cards,
    };
  }

  return {
    kind: kind ?? 'all',
    cards,
  };
}

export async function getTradingDetail() {
  const { latestBrief, latestParlay, latestScanBrief, latestOptions } = await loadTradingSources();
  const cards = await getTradingCards();

  return {
    cards,
    latestBrief,
    latestParlay,
    latestScanBrief,
    latestOptions,
  };
}
