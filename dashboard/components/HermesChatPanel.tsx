'use client';

import { useEffect, useRef, useState } from 'react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  durationMs?: number;
}

const STORAGE_KEY = 'hermes-chat-history-v1';
const SESSION_KEY = 'hermes-chat-session';

export default function HermesChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Restore session + history from localStorage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setMessages(JSON.parse(stored) as Message[]);
      const sess = window.localStorage.getItem(SESSION_KEY);
      if (sess) setSessionId(sess);
    } catch {
      // ignore
    }
  }, []);

  // Persist on change
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50))); } catch {}
  }, [messages]);

  useEffect(() => {
    if (sessionId) try { window.localStorage.setItem(SESSION_KEY, sessionId); } catch {}
  }, [sessionId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = { role: 'user', text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/hermes/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      const data = await res.json() as { text: string; sessionId: string | null; durationMs: number };
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: data.text,
        timestamp: Date.now(),
        durationMs: data.durationMs,
      }]);
      if (data.sessionId) setSessionId(data.sessionId);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'system',
        text: `⚠️ ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: Date.now(),
      }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const clearHistory = () => {
    setMessages([]);
    setSessionId(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(SESSION_KEY);
    } catch {}
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-bg-deep/40 to-bg-deep/80 backdrop-blur-sm">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]" />
          <span className="font-mono text-[10px] tracking-widest text-text-muted">CHAT · LeBOT JAMES</span>
          {sessionId && (
            <span className="ml-2 rounded border border-border-subtle/40 bg-bg-panel px-1.5 py-0.5 font-mono text-[9px] text-text-muted">
              continued
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={clearHistory}
          disabled={messages.length === 0}
          className="cursor-pointer rounded border border-border-subtle/50 px-2 py-1 font-mono text-[9px] tracking-wider text-text-muted transition-colors hover:border-rune-gold/60 hover:text-rune-gold disabled:cursor-not-allowed disabled:opacity-30"
        >
          ↻ NEW
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">SUMMON</div>
            <div className="max-w-xs font-mono text-[11px] leading-relaxed text-text-secondary">
              Direct line to the Allfather. Same instance answering your Telegram. Memory persists across chats.
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-[10px]">
              {['who am I?', 'what should I focus on today?', 'list my scheduled jobs', 'what skills do you have?'].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="cursor-pointer rounded-full border border-border-subtle/50 bg-bg-panel/50 px-3 py-1 font-mono text-text-muted transition-colors hover:border-rune-gold/40 hover:text-rune-gold"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[12px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-rune-gold/10 text-text-primary border border-rune-gold/20'
                    : msg.role === 'system'
                      ? 'bg-ember/10 text-ember border border-ember/20 font-mono text-[11px]'
                      : 'bg-bg-panel/70 text-text-secondary border border-border-subtle/30'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                {msg.durationMs && (
                  <div className="mt-1.5 font-mono text-[9px] text-text-muted opacity-60">
                    {(msg.durationMs / 1000).toFixed(1)}s
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-border-subtle/30 bg-bg-panel/70 px-3.5 py-2">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rune-gold/60" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rune-gold/60" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rune-gold/60" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border-subtle bg-bg-panel/50 p-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={sending ? 'Hermes is thinking...' : 'Speak to Hermes (Shift+Enter for newline)'}
            disabled={sending}
            rows={2}
            className="flex-1 resize-none rounded-lg border border-border-subtle bg-bg-deep/50 px-3 py-2 font-mono text-[11px] text-text-primary placeholder-text-muted outline-none transition-colors focus:border-rune-gold/50 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !input.trim()}
            className="shrink-0 cursor-pointer rounded-lg border border-rune-gold/40 bg-rune-gold/10 px-4 py-2 font-mono text-[10px] tracking-widest text-rune-gold transition-all hover:bg-rune-gold/20 hover:shadow-[0_0_12px_rgba(252,179,26,0.3)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:shadow-none"
          >
            {sending ? '...' : '⚡ SUMMON'}
          </button>
        </div>
      </div>
    </div>
  );
}
