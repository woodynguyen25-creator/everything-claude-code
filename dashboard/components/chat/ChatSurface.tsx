'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AmbientEmbers from '@/components/AmbientEmbers';
import ChatInput from '@/components/chat/ChatInput';
import ChatStream from '@/components/chat/ChatStream';
import ScryingPool from '@/components/chat/ScryingPool';
import ThreadSidebar from '@/components/chat/ThreadSidebar';
import { useKeyboardSequence } from '@/components/chat/useKeyboardSequence';
import { getCouncilConfig, getCouncilCost, getCouncilRoute, type CouncilAgent } from '@/lib/council';
import { getCouncilGodModeLabel, getCouncilModelLabel } from '@/lib/council-models';
import type { ChatMessageRecord, ChatThreadRecord } from '@/lib/chat-schema';

type Props = {
  agent: CouncilAgent;
  personaMarkdown: string;
  placeholder: string;
  initialThreads: ChatThreadRecord[];
  initialThreadId: number | null;
  initialMessages: ChatMessageRecord[];
  initialTotalThreads: number;
};

type StreamMeta = {
  provider: string;
  model: string;
  costUsd: number;
};

export default function ChatSurface({
  agent,
  personaMarkdown,
  placeholder,
  initialThreads,
  initialThreadId,
  initialMessages,
  initialTotalThreads,
}: Props) {
  const router = useRouter();
  const config = getCouncilConfig(agent);

  const [threads, setThreads] = useState(initialThreads);
  const [totalThreads, setTotalThreads] = useState(initialTotalThreads);
  const [activeThreadId, setActiveThreadId] = useState<number | null>(initialThreadId);
  const [messages, setMessages] = useState<ChatMessageRecord[]>(initialMessages);
  const [query, setQuery] = useState('');
  const [contextOpen, setContextOpen] = useState(true);
  const [contextTab, setContextTab] = useState<'memory' | 'voice' | 'saga'>('memory');
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamMeta, setStreamMeta] = useState<StreamMeta | null>(null);
  const [pendingCost, setPendingCost] = useState<number | null>(null);
  const [godMode, setGodMode] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setThreads(initialThreads);
    setTotalThreads(initialTotalThreads);
    setActiveThreadId(initialThreadId);
    setMessages(initialMessages);
  }, [initialMessages, initialThreadId, initialThreads, initialTotalThreads]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHasHydrated(true);
    setContextOpen(false);
  }, []);

  const costEstimate = useMemo(() => {
    const base = getCouncilCost(agent, input);
    return godMode ? Number((base * 4).toFixed(2)) : base;
  }, [agent, godMode, input]);
  const activePreview = [...threads].find((thread) => thread.id === activeThreadId) ?? null;
  const emptyLabel = `No councils yet. Summon ${config.codename}.`;
  const modelLabel = streamMeta
    ? `via ${streamMeta.provider} ${streamMeta.model}`
    : `via ${godMode ? 'triad — Opus · worker · critics' : getCouncilModelLabel(agent, 'normal')}`;
  const hasHistory = Boolean(activePreview && messages.length > 0);
  const godModeLabel = getCouncilGodModeLabel(agent);

  async function refreshThreads(nextQuery = query, append = false) {
    const offset = append ? threads.length : 0;
    const res = await fetch(
      `/api/chat/threads?agent=${encodeURIComponent(agent)}&q=${encodeURIComponent(nextQuery)}&limit=20&offset=${offset}`
    );
    const data = (await res.json()) as { items: ChatThreadRecord[]; total: number };
    setThreads((prev) => (append ? [...prev, ...data.items] : data.items));
    setTotalThreads(data.total);
  }

  async function refreshMessages(threadId: number) {
    const res = await fetch(`/api/chat/threads/${threadId}/messages`);
    const data = (await res.json()) as { items: ChatMessageRecord[] };
    setMessages(data.items);
  }

  async function createCouncil() {
    const res = await fetch('/api/chat/threads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ agent, title: 'New Council' }),
    });
    const thread = (await res.json()) as ChatThreadRecord;
    router.push(getCouncilRoute(agent, thread.id));
  }

  async function holdCouncil() {
    abortRef.current?.abort();
    if (activeThreadId) {
      await fetch('/api/chat/stop', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ threadId: activeThreadId }),
      });
      await refreshMessages(activeThreadId);
    }
    setStreaming(false);
    setStreamingText('');
  }

  async function summon(force = false) {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    if (!force && costEstimate > 0.5) {
      setPendingCost(costEstimate);
      return;
    }

    let threadId = activeThreadId;
    if (!threadId) {
      const res = await fetch('/api/chat/threads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agent, title: 'New Council' }),
      });
      const thread = (await res.json()) as ChatThreadRecord;
      threadId = thread.id;
      setActiveThreadId(threadId);
      router.push(getCouncilRoute(agent, thread.id));
    }

    const optimisticUser: ChatMessageRecord = {
      id: Date.now(),
      threadId,
      role: 'user',
      content: trimmed,
      toolCalls: null,
      costUsd: 0,
      llmProvider: null,
      llmModel: null,
      createdAt: new Date().toISOString(),
    };
    const optimisticAssistant: ChatMessageRecord = {
      id: Date.now() + 1,
      threadId,
      role: 'assistant',
      content: '',
      toolCalls: null,
      costUsd: 0,
      llmProvider: null,
      llmModel: null,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUser, optimisticAssistant]);
    setInput('');
    setStreaming(true);
    setStreamingText('');
    setStreamMeta(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/chat/${agent}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ threadId, text: trimmed, godMode }),
        signal: controller.signal,
      });
      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          if (!frame.startsWith('data: ')) continue;
          const payload = JSON.parse(frame.slice(6)) as
            | { type: 'thread'; threadId: number }
            | { type: 'meta'; meta: StreamMeta }
            | { type: 'token'; token: string }
            | { type: 'done'; fullText: string }
            | { type: 'error'; error: string };

          if (payload.type === 'thread') {
            setActiveThreadId(payload.threadId);
            router.replace(getCouncilRoute(agent, payload.threadId));
            setGodMode(false);
          }
          if (payload.type === 'meta') {
            setStreamMeta(payload.meta);
          }
          if (payload.type === 'token') {
            setStreamingText((prev) => prev + payload.token);
          }
          if (payload.type === 'error') {
            throw new Error(payload.error);
          }
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          threadId: threadId ?? 0,
          role: 'system',
          content: error instanceof Error ? error.message : 'The council fell silent.',
          toolCalls: null,
          costUsd: 0,
          llmProvider: null,
          llmModel: null,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setStreaming(false);
      setStreamingText('');
      if (threadId) {
        await refreshMessages(threadId);
        await refreshThreads(query);
      }
    }
  }

  useKeyboardSequence(
    {
      '/': () => (document.getElementById('council-input') as HTMLTextAreaElement | null)?.focus(),
      gc: () => void createCouncil(),
      gs: () => setContextOpen((prev) => !prev),
      gh: () => router.push('/'),
      ga: () => (document.querySelector('[data-agent-card="true"]') as HTMLElement | null)?.focus(),
      gm: () => router.push('/memory'),
      gv: () => {
        setContextOpen(true);
        setContextTab('voice');
      },
    },
    true
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.getAttribute('contenteditable') === 'true';

      if (event.key === 'Escape') {
        if (typing) {
          (target as HTMLElement | null)?.blur();
          return;
        }
        if (contextOpen) {
          setContextOpen(false);
          return;
        }
        router.push('/');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [contextOpen, router]);

  if (!hasHistory) {
    return (
      <div className="relative h-[100dvh] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0">
            <Image src={config.heroSrc} alt="" fill className="object-cover opacity-30" />
          </div>
          <div className="absolute inset-0" style={{ backgroundImage: config.tintGradient }} />
          <div className="absolute inset-0 bg-gradient-to-b from-bg-deep/70 via-bg-deep/85 to-bg-deep" />
        </div>
        <AmbientEmbers />
        <div className="relative z-10 flex h-full items-center justify-center px-8">
          <div className="panel w-full max-w-3xl p-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded bg-bg-deep">
              <Image src={config.sigilSrc} alt="" width={80} height={80} className="h-14 w-14 object-cover" />
            </div>
            <div className={`mt-6 text-center font-display text-3xl ${config.accentTextClass}`}>{config.codename}</div>
            <div className="mt-2 text-center text-sm text-text-secondary">{config.title}</div>
            <div className="mt-2 text-center font-numeric text-xs text-text-muted">{modelLabel}</div>
            <div className="mt-5 text-center text-sm italic text-text-secondary">Begin a council. Lord Woody.</div>

            {threads.length > 0 ? (
              <div className="mt-8 rounded border border-border-subtle bg-bg-deep p-4">
                <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">PAST SAGAS</div>
                <div className="mt-3 space-y-2">
                  {threads.slice(0, 3).map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => router.push(getCouncilRoute(agent, thread.id))}
                      className="block w-full rounded border border-border-subtle px-3 py-3 text-left transition-colors hover:bg-bg-hover"
                    >
                      <div className="text-sm text-text-primary">{thread.title}</div>
                      <div className="mt-1 text-xs text-text-secondary">{thread.preview ?? 'No words written yet.'}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-8">
              <ChatInput
                value={input}
                onChange={setInput}
                onSubmit={() => void summon()}
                onHold={() => void holdCouncil()}
                isStreaming={streaming}
                placeholder={placeholder}
                costEstimate={streamMeta?.costUsd ?? costEstimate}
                modelLabel={modelLabel}
                godMode={godMode}
                godModeLabel={godModeLabel}
                onToggleGodMode={() => setGodMode((prev) => !prev)}
              />
            </div>
          </div>
        </div>

        {pendingCost !== null ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-[420px] max-w-[90vw] rounded border border-border-subtle bg-bg-panel p-6 shadow-2xl">
              <div className="font-display text-2xl text-rune-gold">Confirm the offering</div>
              <p className="mt-3 text-sm text-text-secondary">
                This consultation is estimated to cost{' '}
                <span className="font-numeric text-rune-gold">~${pendingCost.toFixed(2)}</span>.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPendingCost(null)}
                  className="flex-1 rounded border border-border-subtle bg-bg-deep px-4 py-2 text-rune text-xs tracking-wider text-text-secondary transition-colors hover:bg-bg-hover"
                >
                  Hold
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingCost(null);
                    void summon(true);
                  }}
                  className="flex-1 rounded bg-rune-gold px-4 py-2 text-rune text-xs font-semibold tracking-wider text-bg-deep transition-colors hover:bg-rune-gold/90"
                >
                  Proceed
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] overflow-hidden">
      <ThreadSidebar
        threads={threads}
        activeThreadId={activeThreadId}
        accentBorderClass={config.accentBorderClass}
        accentTextClass={config.accentTextClass}
        accentButtonClass={config.accentBgClass}
        emptyLabel={emptyLabel}
        hasMore={threads.length < totalThreads}
        onCreate={() => void createCouncil()}
        onSelect={(threadId) => router.push(getCouncilRoute(agent, threadId))}
        onDelete={(threadId) => {
          if (!window.confirm('Send this council into silence?')) return;
          void (async () => {
            await fetch(`/api/chat/threads/${threadId}`, { method: 'DELETE' });
            const nextThreads = threads.filter((thread) => thread.id !== threadId);
            const next = nextThreads[0] ?? null;
            if (threadId === activeThreadId) {
              router.push(next ? getCouncilRoute(agent, next.id) : `/${agent}`);
            } else {
              await refreshThreads(query);
            }
          })();
        }}
        onRename={(threadId, title) => {
          void (async () => {
            await fetch(`/api/chat/threads/${threadId}`, {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ title }),
            });
            await refreshThreads(query);
          })();
        }}
        onSearchChange={(value) => {
          setQuery(value);
          void refreshThreads(value);
        }}
        onLoadMore={() => void refreshThreads(query, true)}
      />

      <section className="relative flex h-full flex-1 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0">
            <Image src={config.heroSrc} alt="" fill className="object-cover opacity-30" />
          </div>
          <div className="absolute inset-0" style={{ backgroundImage: config.tintGradient }} />
          <div className="absolute inset-0 bg-gradient-to-b from-bg-deep/70 via-bg-deep/85 to-bg-deep" />
        </div>
        <AmbientEmbers />

        <div className="relative z-10 flex h-full flex-1 overflow-hidden">
          <div className="flex h-full flex-1 flex-col">
            <div className="border-b border-border-subtle bg-bg-panel/80 px-8 py-5 backdrop-blur-sm">
              <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">COUNCIL</div>
              <h1 className={`mt-2 font-display text-3xl ${config.accentTextClass}`}>{config.codename}</h1>
              <div className="mt-2 text-sm text-text-secondary">
                {activePreview ? activePreview.title : `${config.title} awaits a new council.`}
              </div>
              <div className="mt-2 font-numeric text-xs text-text-muted">{modelLabel}</div>
            </div>

            <ChatStream
              messages={messages}
              accentTextClass={config.accentTextClass}
              accentBorderClass={config.accentBorderClass}
              agentSymbol={config.symbol}
              agentCodename={config.codename}
              isStreaming={streaming}
              streamingText={streamingText}
              thinkingLabel={config.thinking}
            />

            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={() => void summon()}
              onHold={() => void holdCouncil()}
              isStreaming={streaming}
              placeholder={placeholder}
              costEstimate={streamMeta?.costUsd ?? costEstimate}
              modelLabel={modelLabel}
              godMode={godMode}
              godModeLabel={godModeLabel}
              onToggleGodMode={() => setGodMode((prev) => !prev)}
            />
          </div>

          {hasHydrated ? (
            <ScryingPool
              open={contextOpen}
              onToggle={() => setContextOpen((prev) => !prev)}
              agent={agent}
              personaMarkdown={personaMarkdown}
              messages={messages}
              tab={contextTab}
              onTabChange={setContextTab}
            />
          ) : null}
        </div>
      </section>

      {pendingCost !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[420px] max-w-[90vw] rounded border border-border-subtle bg-bg-panel p-6 shadow-2xl">
              <div className="font-display text-2xl text-rune-gold">Confirm the offering</div>
            <p className="mt-3 text-sm text-text-secondary">
              This consultation is estimated to cost{' '}
              <span className="font-numeric text-rune-gold">~${pendingCost.toFixed(2)}</span>.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingCost(null)}
                className="flex-1 rounded border border-border-subtle bg-bg-deep px-4 py-2 text-rune text-xs tracking-wider text-text-secondary transition-colors hover:bg-bg-hover"
              >
                Hold
              </button>
              <button
                type="button"
                  onClick={() => {
                    setPendingCost(null);
                    void summon(true);
                  }}
                className="flex-1 rounded bg-rune-gold px-4 py-2 text-rune text-xs font-semibold tracking-wider text-bg-deep transition-colors hover:bg-rune-gold/90"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
