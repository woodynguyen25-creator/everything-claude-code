import fs from 'node:fs';
import path from 'node:path';

export type AiosStats = {
  generatedAt: string;
  lookbackDays: number;
  models: Record<
    string,
    {
      in: number;
      out: number;
      cache_read: number;
      cache_write: number;
      turns: number;
      cost: number;
    }
  >;
  totalCost: number;
  topSkills: Array<{ skill: string; count: number }>;
  topTools: Array<{ tool: string; count: number }>;
  projects: Array<{
    key: string;
    name: string;
    sessions: number;
    prompts: number;
    lastTouched: number;
  }>;
  dreams: string[];
  mcps: string[];
  recentSessions: Array<{
    project: string;
    title: string;
    mtime: number;
  }>;
  baton: {
    found: boolean;
    handoff?: string | null;
    from?: string | null;
    branch?: string | null;
    open?: string | null;
    next?: string | null;
  };
};

const statsPath = path.join(process.cwd(), 'data', 'aios-stats.json');
const CACHE_TTL_MS = 60 * 1000;

let cache:
  | {
      at: number;
      value: AiosStats | null;
    }
  | null = null;

export function readAiosStats(): AiosStats | null {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.value;
  }

  try {
    if (!fs.existsSync(statsPath)) {
      cache = { at: Date.now(), value: null };
      return null;
    }

    const raw = fs.readFileSync(statsPath, 'utf8');
    const value = JSON.parse(raw) as AiosStats;
    cache = { at: Date.now(), value };
    return value;
  } catch {
    cache = { at: Date.now(), value: null };
    return null;
  }
}
