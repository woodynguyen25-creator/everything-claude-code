import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Real Throne data spine: parse recent Claude Code session transcripts
// (~/.claude/projects/**/*.jsonl) into per-session step-traces + token cost.
export const dynamic = 'force-dynamic';

const PROJECTS = path.join(os.homedir(), '.claude', 'projects');
const MAX_SESSIONS = 6;
const RECENT_MS = 45 * 60 * 1000; // last 45 minutes
const MAX_STEPS = 24;

export type ThroneStep = {
  kind: 'decision' | 'llm' | 'tool' | 'retrieval';
  label: string;
  ms: number;
  tokens: number;
  depth: number;
  status: 'ok' | 'warn' | 'err';
};

export type ThroneSession = {
  id: string;
  label: string;
  project: string;
  lastActivity: number;
  ageMin: number;
  active: boolean;
  behavior: string;
  steps: ThroneStep[];
  tokens: number;
  usd: number;
};

type ContentBlock = { type?: string; text?: string; name?: string };
type Line = {
  type?: string;
  title?: string;
  timestamp?: string;
  message?: { role?: string; content?: string | ContentBlock[]; usage?: Record<string, number> };
};

function recentFiles(): Array<{ fp: string; m: number }> {
  const out: Array<{ fp: string; m: number }> = [];
  let dirs: string[] = [];
  try {
    dirs = fs.readdirSync(PROJECTS);
  } catch {
    return out;
  }
  const cutoff = Date.now() - RECENT_MS;
  for (const d of dirs) {
    const dd = path.join(PROJECTS, d);
    let files: string[] = [];
    try {
      files = fs.readdirSync(dd);
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.endsWith('.jsonl')) continue;
      const fp = path.join(dd, f);
      try {
        const m = fs.statSync(fp).mtimeMs;
        if (m >= cutoff) out.push({ fp, m });
      } catch {
        /* ignore unreadable */
      }
    }
  }
  out.sort((a, b) => b.m - a.m);
  return out.slice(0, MAX_SESSIONS);
}

function toolKind(name: string): ThroneStep['kind'] {
  return /search|grep|glob|fetch|web|read|explore/i.test(name) ? 'retrieval' : 'tool';
}

function parseSession(fp: string, m: number): ThroneSession | null {
  let raw: string;
  try {
    raw = fs.readFileSync(fp, 'utf8');
  } catch {
    return null;
  }
  const lines = raw.split('\n').filter(Boolean);
  const steps: ThroneStep[] = [];
  const project = path.basename(path.dirname(fp));
  let title = '';
  let firstUser = '';
  let inTok = 0;
  let cacheRead = 0;
  let cacheCreate = 0;
  let outTok = 0;
  let prevTs = 0;

  for (const ln of lines) {
    let o: Line;
    try {
      o = JSON.parse(ln) as Line;
    } catch {
      continue;
    }
    if (o.type === 'ai-title' && typeof o.title === 'string') title = o.title;
    const ts = o.timestamp ? Date.parse(o.timestamp) : 0;
    const msg = o.message;
    if (!msg) continue;

    if (o.type === 'user' && typeof msg.content === 'string' && !firstUser) {
      const t = msg.content.replace(/\s+/g, ' ').trim();
      if (!/^<|^Hello memory agent|caveat|command-name|command-message/i.test(t)) firstUser = t.slice(0, 60);
      continue;
    }
    if (o.type === 'assistant' && Array.isArray(msg.content)) {
      const u = msg.usage ?? {};
      const out = u.output_tokens ?? 0;
      inTok += u.input_tokens ?? 0;
      cacheRead += u.cache_read_input_tokens ?? 0;
      cacheCreate += u.cache_creation_input_tokens ?? 0;
      outTok += out;
      const dms = prevTs && ts ? Math.min(60000, Math.max(0, ts - prevTs)) : 0;
      for (const c of msg.content) {
        if (c.type === 'thinking') steps.push({ kind: 'decision', label: 'reasoning', ms: dms, tokens: 0, depth: 0, status: 'ok' });
        else if (c.type === 'text') steps.push({ kind: 'llm', label: (c.text || 'response').replace(/\s+/g, ' ').slice(0, 40), ms: dms, tokens: out, depth: 0, status: 'ok' });
        else if (c.type === 'tool_use') steps.push({ kind: toolKind(c.name || ''), label: c.name || 'tool', ms: dms, tokens: 0, depth: 1, status: 'ok' });
      }
      if (ts) prevTs = ts;
    }
  }

  const recent = steps.slice(-MAX_STEPS);
  const ageMin = Math.round((Date.now() - m) / 60000);
  const active = ageMin <= 3;
  const lastTool = [...recent].reverse().find((s) => s.kind === 'tool' || s.kind === 'retrieval');
  const behavior = !active ? 'idle' : lastTool ? (lastTool.kind === 'retrieval' ? 'researching' : 'working') : 'thinking';

  return {
    id: path.basename(fp).replace(/\.jsonl$/, '').slice(0, 12),
    label: title || firstUser || project.replace(/^[a-zA-Z]--?/, '').slice(0, 24) || 'session',
    project,
    lastActivity: m,
    ageMin,
    active,
    behavior,
    steps: recent,
    tokens: inTok + cacheRead + cacheCreate + outTok,
    usd: Number(((inTok * 3 + cacheCreate * 3.75 + cacheRead * 0.3 + outTok * 15) / 1e6).toFixed(4)),
  };
}

export async function GET() {
  const sessions = recentFiles()
    .map(({ fp, m }) => parseSession(fp, m))
    .filter((s): s is ThroneSession => s !== null);
  return NextResponse.json({ ok: true, sessions, ts: Date.now() });
}
