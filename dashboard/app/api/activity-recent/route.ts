import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';

interface ActivityRow {
  timestamp: string;
  task: string;
  outcome: string;
  summary: string;
  tokens: number;
  cost: number;
  notes: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const VAULT_ROOT =
  process.env.VAULT_ROOT ?? 'C:\\Users\\woody\\Documents\\Command Center';

const ACTIVITY_LOG_PATH = path.join(VAULT_ROOT, 'AIOS', 'AIOS-ACTIVITY-LOG.md');

const ISO_PREFIX = /^\d{4}-\d{2}-\d{2}T/;

function parseRows(markdown: string): ActivityRow[] {
  const lines = markdown.split('\n').filter((l) => l.startsWith('|'));
  if (lines.length < 3) return [];
  const dataLines = lines.slice(2);
  const out: ActivityRow[] = [];
  for (const line of dataLines) {
    const cols = line.split('|').map((c) => c.trim());
    if (cols.length < 8) continue;
    if (!ISO_PREFIX.test(cols[1])) continue;
    out.push({
      timestamp: cols[1],
      task: cols[2],
      outcome: cols[3],
      summary: cols[4],
      tokens: cols[5] ? Number(cols[5]) || 0 : 0,
      cost: cols[6] ? Number(cols[6]) || 0 : 0,
      notes: cols[7],
    });
  }
  return out;
}

export async function GET(req: NextRequest) {
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? '10')));

  let content: string;
  try {
    content = await fs.readFile(ACTIVITY_LOG_PATH, 'utf8');
  } catch (err) {
    if (err instanceof Error && err.message.includes('ENOENT')) {
      return NextResponse.json<ApiResponse<{ rows: ActivityRow[]; total: number }>>({
        success: true,
        data: { rows: [], total: 0 },
      });
    }
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: err instanceof Error ? err.message : 'read failed' },
      { status: 500 }
    );
  }

  const rows = parseRows(content);
  rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  const recent = rows.slice(0, limit);

  return NextResponse.json<ApiResponse<{ rows: ActivityRow[]; total: number }>>({
    success: true,
    data: { rows: recent, total: rows.length },
  });
}
