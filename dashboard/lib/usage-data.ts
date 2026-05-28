import fs from 'node:fs';
import path from 'node:path';

type WindowStats = {
  weightedTokens: number;
  ceiling: number;
  ceilingSource: 'calibrated' | 'estimate';
  percent: number;
  resetsAt: string;
};

export type UsageData = {
  generatedAt: string;
  fiveHour: WindowStats;
  weekly: WindowStats;
  weeklyOpus: Omit<WindowStats, 'ceilingSource'>;
  excludesCacheTokens: boolean;
};

const usagePath = path.join(process.cwd(), 'data', 'usage.json');
const CACHE_TTL_MS = 60 * 1000;

let cache: { at: number; value: UsageData | null } | null = null;

const empty: UsageData = {
  generatedAt: new Date(0).toISOString(),
  fiveHour: { weightedTokens: 0, ceiling: 250_000, ceilingSource: 'estimate', percent: 0, resetsAt: new Date().toISOString() },
  weekly: { weightedTokens: 0, ceiling: 3_000_000, ceilingSource: 'estimate', percent: 0, resetsAt: new Date().toISOString() },
  weeklyOpus: { weightedTokens: 0, ceiling: 900_000, percent: 0, resetsAt: new Date().toISOString() },
  excludesCacheTokens: true,
};

export function readUsageData(): UsageData {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.value ?? empty;
  }

  try {
    if (!fs.existsSync(usagePath)) {
      cache = { at: Date.now(), value: null };
      return empty;
    }
    const value = JSON.parse(fs.readFileSync(usagePath, 'utf8')) as UsageData;
    cache = { at: Date.now(), value };
    return value;
  } catch {
    cache = { at: Date.now(), value: null };
    return empty;
  }
}
