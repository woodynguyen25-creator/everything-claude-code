import fs from 'node:fs';
import path from 'node:path';

export type CodexUsage = {
  available: boolean;
  generatedAt: string;
  turns: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  lastEventAt: string | null;
};

const usagePath = path.join(process.cwd(), 'data', 'codex-usage.json');
const CACHE_TTL_MS = 60 * 1000;

let cache:
  | {
      at: number;
      value: CodexUsage;
    }
  | null = null;

const emptyUsage: CodexUsage = {
  available: false,
  generatedAt: new Date(0).toISOString(),
  turns: 0,
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  lastEventAt: null,
};

export function readCodexUsage(): CodexUsage {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.value;
  }

  try {
    if (!fs.existsSync(usagePath)) {
      cache = { at: Date.now(), value: emptyUsage };
      return emptyUsage;
    }
    const raw = fs.readFileSync(usagePath, 'utf8');
    const value = JSON.parse(raw) as CodexUsage;
    cache = { at: Date.now(), value };
    return value;
  } catch {
    cache = { at: Date.now(), value: emptyUsage };
    return emptyUsage;
  }
}
