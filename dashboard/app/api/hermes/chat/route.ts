import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

// Rewritten 2026-05-27: bypasses hermes CLI entirely.
// Old approach: SSH → `hermes -z 'msg'` → SOUL.md + 600KB context → Groq 413 error.
// New approach: SSH → curl stdin-pipe → model-router at localhost:4000 → ~1KB system prompt.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SSH_HOST = 'root@142.93.12.177';

// Slim system prompt — same 1KB profile as lebot-bridge. No tool catalog, no SOUL.md bloat.
const SYSTEM_PROMPT = `You are LeBot James, Woody Nguyen's personal AI chief of staff.

ABOUT WOODY:
- 19, Houston TX, bilingual EN/VI. University of Houston, Finance → Economics (Bauer).
- Building AIOS (AI OS), Lucky Dog cinematic landing, Olympus Fund (AI options hedge fund).
- Trades options swing on SPY, GOOGL, PLTR, TECL, SOXL.
- Style: IV/HV spread, unusual flow, order blocks, FVG, liquidity sweeps, MTF.

HOW TO HELP:
- Be direct. Skip filler. Assume technical fluency.
- Trading: specific levels, not vague advice.
- Coding: prefer Python or TypeScript.

PROJECTS:
- AIOS hub: c:/Github Repos/everything-claude-code
- Lucky Dog: c:/Github Repos/lucky-dog-landing
- Hermes Droplet: 142.93.12.177 (Tailscale 100.78.199.123)
- Olympus Fund: Greek/Norse hybrid AI options hedge fund (Phase 1 active)

You don't need to call tools. Just answer.`;

type Message = { role: 'user' | 'assistant'; content: string };

// In-memory session store — ephemeral (resets on server restart), acceptable for chat UX
const sessions = new Map<string, Message[]>();
const MAX_HISTORY = 12;

function getHistory(id: string): Message[] {
  if (!sessions.has(id)) sessions.set(id, []);
  return sessions.get(id)!;
}

// SSH into Droplet, pipe JSON to curl which hits model-router at localhost:4000.
// Uses stdin pipe (-d @-) to avoid all shell-escaping issues with the payload.
function callModelRouter(
  messages: Message[],
  model = 'qwen/qwen3.6-27b' /* llama-3.3-70b GONE from Groq catalogue 2026-08-21 */,
): Promise<{ text: string; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();

    const payload = JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages.slice(-MAX_HISTORY)],
      max_tokens: 1024,
      temperature: 0.4,
    });

    // curl reads JSON from stdin via -d @- — no escaping issues
    const remoteCmd =
      "curl -s -X POST http://127.0.0.1:4000/v1/chat/completions " +
      "-H 'Content-Type: application/json' " +
      "-H 'Authorization: Bearer router-dummy' " +
      "-d @-";

    const proc = spawn(
      'ssh',
      ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', SSH_HOST, remoteCmd],
      { timeout: 30_000 },
    );

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    // Pipe JSON payload to curl's stdin
    proc.stdin.write(payload);
    proc.stdin.end();

    proc.on('error', reject);
    proc.on('close', (code: number | null) => {
      const durationMs = Date.now() - t0;
      if (code !== 0) {
        return reject(new Error(`SSH error (${code}): ${stderr.slice(0, 200)}`));
      }
      try {
        const json = JSON.parse(stdout) as Record<string, unknown>;
        const errObj = json.error as Record<string, unknown> | undefined;
        if (errObj) {
          return reject(new Error(`Model error: ${String(errObj.message ?? JSON.stringify(errObj))}`));
        }
        const choices = json.choices as Array<{ message: { content: string } }> | undefined;
        const text = choices?.[0]?.message?.content ?? '(empty response)';
        resolve({ text, durationMs });
      } catch {
        reject(new Error(`Invalid JSON from router: ${stdout.slice(0, 200)}`));
      }
    });
  });
}

interface ChatRequest {
  message: string;
  sessionId?: string | null;
  model?: string | null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const msg = body.message?.trim();
  if (!msg) return NextResponse.json({ error: 'message required' }, { status: 400 });
  if (msg.length > 8000) return NextResponse.json({ error: 'message too long (max 8000 chars)' }, { status: 400 });

  const sessionId = (body.sessionId?.trim() || null) ?? randomUUID();
  const history = getHistory(sessionId);
  history.push({ role: 'user', content: msg });

  try {
    const model = body.model ?? 'qwen/qwen3.6-27b' /* llama-3.3-70b GONE from Groq catalogue 2026-08-21 */;
    const { text, durationMs } = await callModelRouter(history, model);

    history.push({ role: 'assistant', content: text });
    // Trim stored history to avoid unbounded growth
    if (history.length > MAX_HISTORY * 2) {
      sessions.set(sessionId, history.slice(-MAX_HISTORY * 2));
    }

    return NextResponse.json({ text, sessionId, durationMs });
  } catch (err) {
    // Remove failed user message so retry is clean
    history.pop();
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 502 },
    );
  }
}
