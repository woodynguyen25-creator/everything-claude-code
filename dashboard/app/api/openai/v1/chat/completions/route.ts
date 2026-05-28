import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { isCouncilAgent, type CouncilAgent } from '@/lib/council';

// OpenAI-compatible Chat Completions wrapper around the ECC dashboard's /api/chat/[agent] route.
// Lets external clients (Hermes Agent on the Droplet, future MCP tools) reach the full ECC stack
// (Claude CLI + 270 skills + 21 MCPs + 47 agents + God Mode triad) via standard OpenAI API.
//
// Auth: Bearer ECC_BRIDGE_TOKEN (set in dashboard .env.local AND Hermes Agent's .env)
// Routing: pass agent slug in the `model` field, e.g. "ecc/lebot-james" or "ecc/thor".
// God Mode: append "+triad" suffix → "ecc/lebot-james+triad" to fire interrogator + triad flow.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChatRequest {
  model?: string;
  messages: OpenAIMessage[];
  stream?: boolean;
  temperature?: number;
}

interface DashboardChatRequest {
  threadId: number | null;
  text: string;
  godMode?: boolean;
}

const DEFAULT_AGENT: CouncilAgent = 'lebot-james';
const ALLOWED_AGENTS: CouncilAgent[] = ['lebot-james', 'thor', 'perseus', 'fenrir', 'sauron'];

function safeTokenEqual(provided: string | null, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function parseModel(model: string | undefined): { agent: CouncilAgent; triad: boolean } {
  if (!model) return { agent: DEFAULT_AGENT, triad: false };
  const m = model.replace(/^ecc\//, '');
  const triad = m.endsWith('+triad');
  const cleaned = m.replace(/\+triad$/, '') as CouncilAgent;
  const agent = isCouncilAgent(cleaned) && ALLOWED_AGENTS.includes(cleaned) ? cleaned : DEFAULT_AGENT;
  return { agent, triad };
}

function flattenMessagesToPrompt(messages: OpenAIMessage[]): string {
  // The dashboard /api/chat/[agent] expects a single `text` field. We collapse multi-turn into one
  // prompt while preserving role markers. This is a simplification — for full conversation history,
  // the dashboard should be updated to accept message arrays directly (future enhancement).
  return messages
    .map((m) => {
      if (m.role === 'system') return `[SYSTEM] ${m.content}`;
      if (m.role === 'assistant') return `[ASSISTANT] ${m.content}`;
      return m.content;
    })
    .join('\n\n');
}

function openAiChunk(content: string, model: string, role: 'assistant' | null = null): string {
  const payload = {
    id: `ecc-${Date.now()}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: role ? { role, content } : { content },
        finish_reason: null,
      },
    ],
  };
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function openAiDone(model: string, finalText: string): string {
  const payload = {
    id: `ecc-${Date.now()}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
    // Optional: include the full text once more for clients that need it
    _ecc_final_text: finalText,
  };
  return `data: ${JSON.stringify(payload)}\n\ndata: [DONE]\n\n`;
}

function openAiNonStreaming(text: string, model: string, agent: string): unknown {
  return {
    id: `ecc-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: text },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    _ecc_agent: agent,
  };
}

export async function POST(req: NextRequest) {
  // Auth check
  const expectedToken = process.env.ECC_BRIDGE_TOKEN;
  if (!expectedToken) {
    return NextResponse.json({ error: { message: 'Bridge disabled — set ECC_BRIDGE_TOKEN' } }, { status: 503 });
  }
  const auth = req.headers.get('authorization') ?? '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!safeTokenEqual(provided, expectedToken)) {
    return NextResponse.json({ error: { message: 'Invalid token' } }, { status: 401 });
  }

  // Parse request
  let body: OpenAIChatRequest;
  try {
    body = (await req.json()) as OpenAIChatRequest;
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON' } }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: { message: 'messages array required' } }, { status: 400 });
  }

  const { agent, triad } = parseModel(body.model);
  const prompt = flattenMessagesToPrompt(body.messages);
  const wantsStreaming = Boolean(body.stream);

  // Forward to dashboard's internal /api/chat/[agent] route
  const baseUrl = `http://127.0.0.1:${process.env.PORT ?? '3737'}`;
  const dashReq: DashboardChatRequest = {
    threadId: null,
    text: prompt,
    godMode: triad,
  };

  const upstream = await fetch(`${baseUrl}/api/chat/${agent}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dashReq),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '');
    return NextResponse.json(
      { error: { message: `Upstream ${upstream.status}: ${errText.slice(0, 200)}` } },
      { status: 502 }
    );
  }

  // Collect or stream — depending on client preference
  if (wantsStreaming) {
    const encoder = new TextEncoder();
    const modelLabel = `ecc/${agent}${triad ? '+triad' : ''}`;
    let sentRole = false;
    let fullText = '';

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            // SSE events delimited by blank lines
            let idx;
            while ((idx = buffer.indexOf('\n\n')) !== -1) {
              const raw = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 2);
              for (const line of raw.split('\n')) {
                if (!line.startsWith('data:')) continue;
                const data = line.slice(5).trim();
                if (!data) continue;
                try {
                  const evt = JSON.parse(data) as { type: string; token?: string; fullText?: string };
                  if (evt.type === 'token' && evt.token) {
                    fullText += evt.token;
                    if (!sentRole) {
                      controller.enqueue(encoder.encode(openAiChunk('', modelLabel, 'assistant')));
                      sentRole = true;
                    }
                    controller.enqueue(encoder.encode(openAiChunk(evt.token, modelLabel)));
                  }
                  if (evt.type === 'done') {
                    if (evt.fullText && evt.fullText !== fullText) fullText = evt.fullText;
                    controller.enqueue(encoder.encode(openAiDone(modelLabel, fullText)));
                  }
                } catch {
                  // ignore malformed
                }
              }
            }
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: { message: String(err) } })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  }

  // Non-streaming: consume the whole upstream stream, then return one OpenAI completion JSON
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of raw.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        try {
          const evt = JSON.parse(data) as { type: string; token?: string; fullText?: string };
          if (evt.type === 'token' && evt.token) fullText += evt.token;
          if (evt.type === 'done' && evt.fullText) fullText = evt.fullText;
        } catch {
          // ignore
        }
      }
    }
  }

  return NextResponse.json(openAiNonStreaming(fullText.trim(), body.model ?? `ecc/${agent}`, agent));
}

// Models endpoint — clients (Hermes Agent) often call /models to list available models
export async function GET() {
  return NextResponse.json({
    object: 'list',
    data: ALLOWED_AGENTS.flatMap((slug) => [
      { id: `ecc/${slug}`, object: 'model', owned_by: 'ecc' },
      { id: `ecc/${slug}+triad`, object: 'model', owned_by: 'ecc' },
    ]),
  });
}
