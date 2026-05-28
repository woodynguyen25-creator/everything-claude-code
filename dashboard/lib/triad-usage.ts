import fs from 'node:fs';
import path from 'node:path';

export type TriadUsage = {
  generatedAt: string;
  deepseek: {
    spentUsd: number;
    dailyCapUsd: number;
    balanceUsd: number;
  };
  free: {
    usagePercent: number;
  };
};

const usagePath = path.join(process.cwd(), 'data', 'triad-usage.json');
const CACHE_TTL_MS = 60 * 1000;

let cache:
  | {
      at: number;
      value: TriadUsage;
    }
  | null = null;

const fallbackUsage: TriadUsage = {
  generatedAt: new Date(0).toISOString(),
  deepseek: {
    spentUsd: 0,
    dailyCapUsd: 1.5,
    balanceUsd: 5,
  },
  free: {
    usagePercent: 0,
  },
};

export function readTriadUsage(): TriadUsage {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.value;
  }

  try {
    if (!fs.existsSync(usagePath)) {
      cache = { at: Date.now(), value: fallbackUsage };
      return fallbackUsage;
    }

    const raw = fs.readFileSync(usagePath, 'utf8');
    const value = JSON.parse(raw) as TriadUsage;
    cache = { at: Date.now(), value };
    return value;
  } catch {
    cache = { at: Date.now(), value: fallbackUsage };
    return fallbackUsage;
  }
}
