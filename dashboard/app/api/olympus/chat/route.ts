/**
 * POST /api/olympus/chat
 *
 * Anubis chat endpoint — answers questions about the Olympus Fund using
 * a live snapshot of fund state as context.
 *
 * Body: { question: string; decision_id?: string }
 * Response: { answer: string; latency_ms: number }
 *
 * LLM cascade: Groq llama-3.3-70b → Gemini Flash → DeepSeek chat
 * Falls back to each provider if the previous returns 429 or errors.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { OlympusState, Decision } from '@/lib/olympus/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ---------------------------------------------------------------------------
// LLM providers (raw fetch, no SDK dep)
// ---------------------------------------------------------------------------

const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_URL   = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

async function callLLM(
  messages: { role: string; content: string }[],
  signal: AbortSignal,
): Promise<string> {
  const providers: Array<{ url: string; key: string | undefined; model: string; name: string }> = [
    {
      url:   GROQ_URL,
      key:   process.env.GROQ_API_KEY,
      model: 'llama-3.3-70b-versatile',
      name:  'Groq',
    },
    {
      url:   GEMINI_URL,
      key:   process.env.GEMINI_API_KEY,
      // 3.5-flash, not 3.6: measured 3/3 stable vs 3.6's 2/3 (flaps 403). 2026-08-02.
      model: 'gemini-3.5-flash',
      name:  'Gemini',
    },
    {
      url:   DEEPSEEK_URL,
      key:   process.env.DEEPSEEK_API_KEY,
      model: 'deepseek-chat',
      name:  'DeepSeek',
    },
  ];

  const errors: string[] = [];

  for (const p of providers) {
    if (!p.key) {
      errors.push(`${p.name}: no API key`);
      continue;
    }
    try {
      const res = await fetch(p.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${p.key}`,
        },
        body: JSON.stringify({ model: p.model, messages, max_tokens: 600, temperature: 0.7 }),
        signal,
      });
      if (!res.ok) {
        errors.push(`${p.name}: HTTP ${res.status}`);
        if (res.status !== 429) throw new Error(`${p.name} non-retryable ${res.status}`);
        continue;
      }
      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      return data.choices[0].message.content.trim();
    } catch (err) {
      errors.push(`${p.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(`All LLM tiers failed: ${errors.join(' | ')}`);
}

// ---------------------------------------------------------------------------
// Context builders
// ---------------------------------------------------------------------------

function formatDecision(d: Decision): string {
  const council = d.council;
  const parts = [
    `${d.ticker} $${d.strike} ${d.right.toUpperCase()} exp ${d.expiry}`,
    `conviction ${d.conviction}/10 | status: ${d.status}`,
  ];
  if (council?.zeus_macro)    parts.push(`Zeus: ${council.zeus_macro}`);
  if (council?.apollo_bull)   parts.push(`Apollo (bull): ${council.apollo_bull.slice(0, 200)}`);
  if (council?.athena_bear)   parts.push(`Athena (bear): ${council.athena_bear.slice(0, 200)}`);
  if (council?.ares_catalyst) parts.push(`Ares (catalyst): ${council.ares_catalyst.slice(0, 200)}`);
  if (council?.loki_redteam)  parts.push(`Loki (red-team): ${council.loki_redteam.slice(0, 200)}`);
  return parts.join('\n  ');
}

function buildSystemPrompt(state: OlympusState, focusDecision: Decision | null): string {
  const pnl = state.current_equity - state.starting_equity;
  const pct = ((pnl / state.starting_equity) * 100).toFixed(2);

  const approvedSummary = state.decisions.approved.slice(0, 8).map(formatDecision).join('\n\n');
  const resolvedSummary = state.decisions.resolved
    .slice(0, 5)
    .map((d) => `${d.ticker} ${d.right} → ${d.status} ${d.realized_pnl != null ? `$${d.realized_pnl > 0 ? '+' : ''}${d.realized_pnl.toFixed(2)}` : ''}`)
    .join('\n  ');

  const focusBlock = focusDecision
    ? `\n\nFOCUSED DECISION (user is asking about this specific one):\n${formatDecision(focusDecision)}`
    : '';

  return `You are Anubis, Chairman and CIO of the Olympus Fund — a Greek, Norse, and Egyptian trading council.

You speak with authority, precision, and mythological gravitas. You are direct, confident, and data-driven.
You refer to your council members by name (Zeus, Apollo, Athena, Ares, Loki, Poseidon, Artemis).
Keep answers concise — 3–6 sentences max unless a detailed breakdown is needed.

CURRENT FUND STATE (as of ${new Date(state.ts).toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT):
  Fund equity:  $${state.current_equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
  Total P&L:    $${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} (${pct}%)
  Unrealized:   $${state.total_unrealized_pnl >= 0 ? '+' : ''}${state.total_unrealized_pnl.toFixed(2)}
  Open positions: ${state.open_positions_count}

ACTIVE APPROVED DECISIONS:
${approvedSummary || '  (none)'}

RECENTLY RESOLVED:
  ${resolvedSummary || '(no closed trades yet)'}

EDGE BAR:
  30-day win rate: ${(state.edge_bar.win_rate_30d * 100).toFixed(0)}% (target: ${(state.edge_bar.win_rate_target * 100).toFixed(0)}%)
  30-day avg R:    ${state.edge_bar.avg_r_30d.toFixed(2)} (target: ${state.edge_bar.avg_r_target})
  Edge bar hit:    ${state.edge_bar.edge_bar_hit ? 'YES ✓' : 'NO — not enough data yet'}
${focusBlock}`;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const t0 = Date.now();

  try {
    const body = (await req.json()) as { question?: string; decision_id?: string };
    const question = (body.question ?? '').trim();
    if (!question) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 });
    }

    // Fetch live state
    const stateUrl  = process.env.OLYMPUS_ENDPOINT
      ? `${process.env.OLYMPUS_ENDPOINT}/state`
      : null;
    const stateHeaders: HeadersInit = {};
    if (process.env.OLYMPUS_STATE_TOKEN)
      stateHeaders['Authorization'] = `Bearer ${process.env.OLYMPUS_STATE_TOKEN}`;

    let state: OlympusState | null = null;
    if (stateUrl) {
      try {
        const sr = await fetch(stateUrl, {
          cache: 'no-store',
          headers: stateHeaders,
          signal: AbortSignal.timeout(6000),
        });
        if (sr.ok) state = (await sr.json()) as OlympusState;
      } catch (error) {
        console.error('Failed to fetch Olympus live state:', error);
        // fall through to null state
      }
    }

    // Determine focused decision
    let focusDecision: Decision | null = null;
    if (state && body.decision_id) {
      for (const group of Object.values(state.decisions)) {
        const found = (group as Decision[]).find((d) => d.decision_id === body.decision_id);
        if (found) { focusDecision = found; break; }
      }
    }

    const systemPrompt = state
      ? buildSystemPrompt(state, focusDecision)
      : `You are Anubis, Chairman and CIO of the Olympus Fund. State data is temporarily unavailable — answer generally based on your role and principles.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    let answer: string;
    try {
      answer = await callLLM(messages, controller.signal);
    } finally {
      clearTimeout(timeout);
    }

    return NextResponse.json({ answer, latency_ms: Date.now() - t0 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'chat_failed', detail: msg, latency_ms: Date.now() - t0 },
      { status: 503 },
    );
  }
}
