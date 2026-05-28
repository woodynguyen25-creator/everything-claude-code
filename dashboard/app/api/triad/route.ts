import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export const dynamic = 'force-dynamic';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface TriadStatus {
  date: string;
  spend: Record<string, number>;
  total_metered_usd: number;
  deepseek_status: 'ok' | 'soft_warn' | 'hard_stop';
  deepseek_soft_threshold_usd: number;
  deepseek_hard_threshold_usd: number;
  source: string;
}

const DEEPSEEK_SOFT = 0.5;
const DEEPSEEK_HARD = 1.5;

// Where the Droplet writes spend state. The dashboard reads it via the
// rsync/sshfs path the user wires up; if not present, fall back to a local
// PC mirror at ~/.aios/triad-daily-spend.json.
const SPEND_STATE_CANDIDATES = [
  process.env.TRIAD_SPEND_STATE,
  path.join(os.homedir(), '.aios', 'triad-daily-spend.json'),
  path.join(os.homedir(), '.hermes', 'state', 'triad-daily-spend.json'),
].filter(Boolean) as string[];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function classifyDeepseek(amount: number): TriadStatus['deepseek_status'] {
  if (amount >= DEEPSEEK_HARD) return 'hard_stop';
  if (amount >= DEEPSEEK_SOFT) return 'soft_warn';
  return 'ok';
}

async function loadSpend(): Promise<{ data: TriadStatus | null; source: string }> {
  for (const candidate of SPEND_STATE_CANDIDATES) {
    try {
      const raw = await fs.readFile(candidate, 'utf8');
      const parsed = JSON.parse(raw) as { date?: string; spend?: Record<string, number> };
      if (parsed.date !== todayKey()) {
        return {
          data: {
            date: todayKey(),
            spend: {},
            total_metered_usd: 0,
            deepseek_status: 'ok',
            deepseek_soft_threshold_usd: DEEPSEEK_SOFT,
            deepseek_hard_threshold_usd: DEEPSEEK_HARD,
            source: candidate,
          },
          source: candidate,
        };
      }
      const spend = parsed.spend ?? {};
      const total = Object.values(spend).reduce((s, v) => s + Number(v || 0), 0);
      const ds = Number(spend.deepseek ?? 0);
      return {
        data: {
          date: parsed.date ?? todayKey(),
          spend,
          total_metered_usd: total,
          deepseek_status: classifyDeepseek(ds),
          deepseek_soft_threshold_usd: DEEPSEEK_SOFT,
          deepseek_hard_threshold_usd: DEEPSEEK_HARD,
          source: candidate,
        },
        source: candidate,
      };
    } catch {
      // try next candidate
    }
  }
  return { data: null, source: 'none-found' };
}

export async function GET(_req: NextRequest) {
  const { data } = await loadSpend();
  if (!data) {
    // No state file yet — return zeros so the widget can render
    return NextResponse.json<ApiResponse<TriadStatus>>({
      success: true,
      data: {
        date: todayKey(),
        spend: {},
        total_metered_usd: 0,
        deepseek_status: 'ok',
        deepseek_soft_threshold_usd: DEEPSEEK_SOFT,
        deepseek_hard_threshold_usd: DEEPSEEK_HARD,
        source: 'no-state-file',
      },
    });
  }
  return NextResponse.json<ApiResponse<TriadStatus>>({ success: true, data });
}
