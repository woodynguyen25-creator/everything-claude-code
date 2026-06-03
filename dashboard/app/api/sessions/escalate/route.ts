import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Escalate a troubled session: page LeBot James on Telegram using the same creds
// the CEO rollup uses (~/.claude/aios/telegram.json). Deliberately message-only —
// it never restarts a real-money worker; it just puts eyes on the problem.
//
// Hardening (Codex review 2026-06-02): same-origin only, validated + length-capped
// body, only blocked/down may escalate, per-session cooldown so clicks/scripts can't
// flood Telegram, and generic client errors (details stay in server logs).
type Body = { session?: string; persona?: string; status?: string; focus?: string };

const ALLOWED_STATUS = new Set(['blocked', 'error']);
const COOLDOWN_MS = 60_000;
const lastSent = new Map<string, number>();

function isLocalOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // non-browser / same-origin server callers on a localhost-bound app
  try {
    const host = new URL(origin).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

function clip(value: unknown, max: number): string {
  return String(value ?? '').slice(0, max);
}

async function telegramCreds(): Promise<{ token: string; chatId: string }> {
  const p = path.join(os.homedir(), '.claude', 'aios', 'telegram.json');
  const raw = await fs.readFile(p, 'utf8');
  const j = JSON.parse(raw) as { token?: string; chat_id?: string | number };
  return { token: String(j.token ?? ''), chatId: String(j.chat_id ?? '') };
}

export async function POST(request: Request): Promise<Response> {
  if (!isLocalOrigin(request)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const status = clip(body.status, 16).toLowerCase();
  if (!ALLOWED_STATUS.has(status)) {
    return NextResponse.json({ ok: false, error: 'Only blocked or down sessions can be escalated' }, { status: 400 });
  }
  const session = clip(body.session ?? body.persona ?? 'session', 80);
  const persona = clip(body.persona ?? body.session ?? 'A session', 80);
  const focus = clip(body.focus, 200);

  // per-session+status cooldown so repeated clicks/scripts can't flood Telegram
  const key = `${session}:${status}`;
  const now = Date.now();
  if (now - (lastSent.get(key) ?? 0) < COOLDOWN_MS) {
    return NextResponse.json({ ok: true, throttled: true });
  }

  try {
    const { token, chatId } = await telegramCreds();
    if (!token || !chatId) {
      console.error('[escalate] Telegram creds missing or incomplete');
      return NextResponse.json({ ok: false, error: 'Escalation unavailable' }, { status: 503 });
    }
    const text = `♛ ESCALATION — ${persona} is ${status.toUpperCase()}\n${focus ? `Focus: ${focus}\n` : ''}Flagged from Operations. Eyes on it.`;
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      console.error('[escalate] Telegram responded', res.status);
      return NextResponse.json({ ok: false, error: 'Escalation failed' }, { status: 502 });
    }
    lastSent.set(key, now);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('[escalate]', error);
    return NextResponse.json({ ok: false, error: 'Escalation failed' }, { status: 500 });
  }
}
