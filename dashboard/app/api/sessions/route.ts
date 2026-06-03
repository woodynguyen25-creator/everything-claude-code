import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// LeBot James reads every session's heartbeat from ~/.claude/aios/sessions/*.json.
// Each file is written by a specialist session via Write-AiosHeartbeat (aios-ceo.ps1).
type Heartbeat = {
  session: string;
  persona: string;
  icon: string;
  status: string;
  focus: string;
  last_output: string;
  group: string;
  ts: string;
};

const SESSIONS_DIR = path.join(os.homedir(), '.claude', 'aios', 'sessions');

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

// Normalize a parsed heartbeat into a fully-typed record. Returns null for anything that
// isn't a usable object (null, array, missing persona/status) so a hand-edited or partial
// file can never reach the client and crash on e.g. persona.localeCompare.
function normalize(parsed: unknown): Heartbeat | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const h = parsed as Record<string, unknown>;
  if (typeof h.persona !== 'string' || typeof h.status !== 'string') return null;
  return {
    session: str(h.session, h.persona),
    persona: h.persona,
    icon: str(h.icon, '•'),
    status: h.status,
    focus: str(h.focus),
    last_output: str(h.last_output),
    group: str(h.group, 'UTILITY'),
    ts: str(h.ts, new Date().toISOString()),
  };
}

export async function GET() {
  try {
    const files = await fs.readdir(SESSIONS_DIR);
    const sessions: Heartbeat[] = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const raw = await fs.readFile(path.join(SESSIONS_DIR, file), 'utf8');
        const hb = normalize(JSON.parse(raw));
        if (hb) sessions.push(hb);
      } catch {
        // skip an unreadable or half-written heartbeat — never break the board
      }
    }
    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ sessions: [] });
  }
}
