'use client';

import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MemoryDrawer from '@/components/MemoryDrawer';
import type { ChatMessageRecord } from '@/lib/chat-schema';
import type { Memory } from '@/lib/memory';

type TabKey = 'memory' | 'voice' | 'saga';

type Props = {
  open: boolean;
  onToggle: () => void;
  agent: string;
  personaMarkdown: string;
  messages: ChatMessageRecord[];
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
};

function buildMemoryQuery(messages: ChatMessageRecord[]) {
  const source = messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-3)
    .map((message) => message.content)
    .join(' ');

  const words = Array.from(
    new Set(
      source
        .toLowerCase()
        .match(/[a-z][a-z0-9-]{3,}/g)
        ?.filter((word) => !['that', 'with', 'from', 'this', 'have', 'what', 'your'].includes(word)) ?? []
    )
  );

  return words.slice(0, 5).join(' ');
}

export default function ScryingPool({ open, onToggle, agent, personaMarkdown, messages, tab, onTabChange }: Props) {
  const [memoryItems, setMemoryItems] = useState<Memory[]>([]);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [memoryName, setMemoryName] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const query = useMemo(() => buildMemoryQuery(messages), [messages]);

  const lastUser = [...messages].reverse().find((message) => message.role === 'user');
  const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant');

  useEffect(() => {
    if (tab !== 'memory') return;
    if (!query) {
      setMemoryItems([]);
      setMemoryLoading(false);
      setMemoryError(null);
      return;
    }
    const controller = new AbortController();
    void (async () => {
      setMemoryLoading(true);
      setMemoryError(null);
      try {
        const res = await fetch(`/api/memory?q=${encodeURIComponent(query)}&limit=5`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Mimir could not search the well.');
        const data = (await res.json()) as Memory[];
        setMemoryItems(data);
      } catch (error) {
        if (controller.signal.aborted) return;
        setMemoryItems([]);
        setMemoryError(error instanceof Error ? error.message : 'Mimir could not search the well.');
      } finally {
        if (!controller.signal.aborted) setMemoryLoading(false);
      }
    })();
    return () => controller.abort();
  }, [query, tab]);

  async function performAction(kind: 'pin' | 'save-saga') {
    if (!lastUser || !lastAssistant) return;
    setActionStatus(kind === 'pin' ? 'Setting the rune in stone…' : 'Inscribing the saga…');
    try {
      const res = await fetch('/api/ravens/actions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind,
          agent,
          query: lastUser.content,
          response: lastAssistant.content,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      setActionStatus(res.ok ? data.message ?? 'Done.' : data.error ?? 'Action failed.');
    } catch (error) {
      setActionStatus(error instanceof Error ? error.message : 'Action failed.');
    }
    window.setTimeout(() => setActionStatus(null), 4000);
  }

  return (
    <>
      <aside
        className={`relative shrink-0 border-l border-border-subtle bg-bg-panel/95 transition-all duration-200 ${
          open
            ? 'w-80 max-sm:fixed max-sm:inset-y-0 max-sm:right-0 max-sm:z-40 max-sm:w-[85vw] max-sm:max-w-80 max-sm:shadow-2xl'
            : 'w-10'
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? 'Collapse scrying pool' : 'Expand scrying pool'}
          className="absolute -left-3 top-6 flex min-h-[44px] min-w-[28px] items-center justify-center rounded-full border border-border-subtle bg-bg-panel px-2 py-1 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          {open ? '›' : '‹'}
        </button>

        {open ? (
          <div className="flex h-full flex-col">
            <div className="border-b border-border-subtle px-4 py-4">
              <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">SCRYING POOL</div>
              <div role="tablist" className="mt-3 flex gap-2">
                {([
                  ['memory', 'MEMORY'],
                  ['voice', 'VOICE'],
                  ['saga', 'SAGA'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => onTabChange(key)}
                    className={`rounded px-3 py-2 text-rune text-[10px] tracking-wider transition-colors ${
                      tab === key ? 'bg-rune-gold text-bg-deep' : 'bg-bg-deep text-text-secondary hover:bg-bg-hover'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {tab === 'memory' ? (
                <div className="space-y-3">
                  {memoryLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="panel p-4">
                        <div className="h-4 w-2/3 rounded bg-bg-deep shimmer" />
                        <div className="mt-3 h-3 w-full rounded bg-bg-deep shimmer" />
                      </div>
                    ))
                  ) : memoryError ? (
                    <div className="text-sm italic text-blood">{memoryError}</div>
                  ) : memoryItems.length ? (
                    memoryItems.map((memory) => (
                      <button
                        key={memory.name}
                        type="button"
                        onClick={() => setMemoryName(memory.name)}
                        className="panel block w-full p-4 text-left transition-colors hover:bg-bg-hover"
                      >
                        <div className="text-base font-semibold text-text-primary">{memory.title}</div>
                        <div className="mt-2 text-xs text-text-secondary">{memory.preview}</div>
                      </button>
                    ))
                  ) : (
                    <div className="text-sm italic text-text-muted">Mímir does not know that yet.</div>
                  )}
                </div>
              ) : null}

              {tab === 'voice' ? (
                <div className="prose prose-invert max-w-none prose-headings:font-display prose-headings:text-text-primary prose-p:text-text-secondary prose-code:font-mono prose-code:text-rune-gold prose-pre:bg-bg-deep">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{personaMarkdown}</ReactMarkdown>
                </div>
              ) : null}

              {tab === 'saga' ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => void performAction('pin')}
                    disabled={!lastUser || !lastAssistant}
                    className="w-full rounded border border-border-subtle bg-bg-deep px-3 py-3 text-rune text-xs tracking-wider text-rune-gold transition-colors hover:bg-bg-hover disabled:opacity-40"
                  >
                    Pin last response as memory
                  </button>
                  <button
                    type="button"
                    onClick={() => void performAction('save-saga')}
                    disabled={!lastUser || !lastAssistant}
                    className="w-full rounded border border-border-subtle bg-bg-deep px-3 py-3 text-rune text-xs tracking-wider text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary disabled:opacity-40"
                  >
                    Save council to Saga
                  </button>
                  {actionStatus ? <div className="text-xs italic text-text-muted">{actionStatus}</div> : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </aside>

      <MemoryDrawer name={memoryName} onClose={() => setMemoryName(null)} onRefresh={() => void 0} />
    </>
  );
}
