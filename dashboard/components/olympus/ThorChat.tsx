'use client';

import { useEffect, useRef, useState } from 'react';
import type { Decision } from '@/lib/olympus/types';

interface Message {
  role: 'user' | 'anubis';
  content: string;
  latency_ms?: number;
  ts: number;
}

interface ThorChatProps {
  decisionContext?: Decision | null;
}

const SUGGESTIONS = [
  'Which position has the highest risk right now?',
  'What is Zeus saying about the current regime?',
  'Summarize the council bull case for TSLA.',
  'What is our edge bar looking like?',
  'Which decisions should we monitor most closely this week?',
];

export function ThorChat({ decisionContext }: ThorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: question.trim(), ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const body: Record<string, string> = { question: question.trim() };
      if (decisionContext?.decision_id) body.decision_id = decisionContext.decision_id;

      const res = await fetch('/api/olympus/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { answer?: string; error?: string; latency_ms?: number };
      const anubisMsg: Message = {
        role: 'anubis',
        content: data.answer ?? data.error ?? 'Anubis did not respond.',
        latency_ms: data.latency_ms,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, anubisMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'anubis', content: 'The council is temporarily unreachable. Try again.', ts: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[rgba(12,10,26,0.85)] shadow-[0_16px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3">
        <span className="text-lg">⚖️</span>
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white">Anubis</div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-white/38">chairman · ask anything</div>
        </div>
        {decisionContext ? (
          <span className="ml-auto rounded-full border border-[#C9A96155] bg-[#C9A96112] px-2.5 py-0.5 font-mono text-[10px] text-[#C9A961]">
            {decisionContext.ticker} {decisionContext.right} context
          </span>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: 'thin' }}>
        {messages.length === 0 ? (
          <div className="mt-4 flex flex-col gap-2">
            <p className="mb-4 text-center text-xs uppercase tracking-[0.18em] text-white/28">
              Ask Anubis anything about the Olympus Fund
            </p>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => sendMessage(suggestion)}
                className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-left text-xs text-white/50 transition-all hover:border-[#C9A96155] hover:bg-[#C9A96110] hover:text-white/75"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mb-4 flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#C9A9611F] text-white'
                  : 'border border-white/[0.06] bg-white/[0.03] text-white/85'
              }`}
            >
              {msg.role === 'anubis' ? (
                <span className="mb-2 flex items-center gap-1.5">
                  <span className="text-xs">⚖️</span>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-[#C9A961]">Anubis</span>
                  {msg.latency_ms != null ? (
                    <span className="ml-auto font-mono text-[9px] text-white/22">
                      {msg.latency_ms}ms
                    </span>
                  ) : null}
                </span>
              ) : null}
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading ? (
          <div className="mb-4 flex items-start gap-2">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
              <span className="mb-2 flex items-center gap-1.5">
                <span className="text-xs">⚖️</span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-[#C9A961]">Anubis</span>
              </span>
              <div className="flex gap-1 pt-1">
                {[0, 1, 2].map((dot) => (
                  <div
                    key={dot}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C9A961]/70"
                    style={{ animationDelay: `${dot * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/[0.06] px-4 py-3">
        <div className="flex items-end gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 focus-within:border-[#C9A96144]">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the council..."
            className="flex-1 resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/28"
            style={{ maxHeight: '100px', overflowY: 'auto' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#C9A961] text-[#120F07] transition-all hover:bg-[#D6B876] disabled:cursor-not-allowed disabled:opacity-30"
            title="Send (Enter)"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M13 7L1 1l2.5 6L1 13l12-6z"
                fill="currentColor"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <p className="mt-1.5 text-[9px] uppercase tracking-[0.14em] text-white/22">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}
