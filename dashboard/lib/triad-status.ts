import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface TriadStatus {
  date: string;
  spend: Record<string, number>;
  totalMeteredUsd: number;
  deepseekStatus: 'ok' | 'soft_warn' | 'hard_stop';
  deepseekSpentUsd: number;
  deepseekSoftThresholdUsd: number;
  deepseekHardThresholdUsd: number;
  source: string;
}

const DEEPSEEK_SOFT = 0.5;
const DEEPSEEK_HARD = 1.5;

const SPEND_STATE_CANDIDATES = [
  process.env.TRIAD_SPEND_STATE,
  path.join(os.homedir(), '.aios', 'triad-daily-spend.json'),
  path.join(os.homedir(), '.hermes', 'state', 'triad-daily-spend.json'),
].filter(Boolean) as string[];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function classify(amount: number): TriadStatus['deepseekStatus'] {
  if (amount >= DEEPSEEK_HARD) return 'hard_stop';
  if (amount >= DEEPSEEK_SOFT) return 'soft_warn';
  return 'ok';
}

export function readTriadStatus(): TriadStatus {
  for (const candidate of SPEND_STATE_CANDIDATES) {
    try {
      const raw = fs.readFileSync(candidate, 'utf8');
      const parsed = JSON.parse(raw) as { date?: string; spend?: Record<string, number> };
      if (parsed.date !== todayKey()) {
        return buildEmpty(candidate);
      }
      const spend = parsed.spend ?? {};
      const ds = Number(spend.deepseek ?? 0);
      const total = Object.values(spend).reduce((s, v) => s + Number(v || 0), 0);
      return {
        date: parsed.date ?? todayKey(),
        spend,
        totalMeteredUsd: total,
        deepseekSpentUsd: ds,
        deepseekStatus: classify(ds),
        deepseekSoftThresholdUsd: DEEPSEEK_SOFT,
        deepseekHardThresholdUsd: DEEPSEEK_HARD,
        source: candidate,
      };
    } catch {
      // try next candidate
    }
  }
  return buildEmpty('no-state-file');
}

function buildEmpty(source: string): TriadStatus {
  return {
    date: todayKey(),
    spend: {},
    totalMeteredUsd: 0,
    deepseekSpentUsd: 0,
    deepseekStatus: 'ok',
    deepseekSoftThresholdUsd: DEEPSEEK_SOFT,
    deepseekHardThresholdUsd: DEEPSEEK_HARD,
    source,
  };
}
