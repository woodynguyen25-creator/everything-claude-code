'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const COST_CONFIRM_THRESHOLD = 0.5;

type AgentName = 'lebot-james' | 'thor' | 'perseus' | 'fenrir' | 'sauron';

type RavensResults = {
  memories: Array<{ id: number; title: string; type: string; preview: string; timestamp: string }>;
  files: Array<{ path: string; preview: string }>;
  detectedAgent: AgentName;
  preamble: string;
  estimatedCost: Record<AgentName, number>;
  recentQueries: Array<{ id: number; query: string; agent: string | null; createdAt: string }>;
  claudeAvailable: boolean;
};

const agents: Array<{ id: AgentName; label: string; icon: string }> = [
  { id: 'lebot-james', label: 'Lebot', icon: '👑' },
  { id: 'thor', label: 'Thor', icon: '⚡' },
  { id: 'perseus', label: 'Perseus', icon: '💰' },
  { id: 'fenrir', label: 'Fenrir', icon: '🐺' },
  { id: 'sauron', label: 'Sauron', icon: '👁' },
];

function placeholderForMode() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 9) return 'What do you seek, Lord Woody?';
  if (hour >= 9 && hour < 17) return 'Speak it, my Lord.';
  if (hour >= 17 && hour < 21) return 'What rises before nightfall?';
  return 'What stirs in the dark?';
}

export default function RavensRoot() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [forcedAgent, setForcedAgent] = useState<AgentName | undefined>(undefined);
  const [results, setResults] = useState<RavensResults | null>(null);
  const [streamText, setStreamText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [pendingEscalateCost, setPendingEscalateCost] = useState<number | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const flattened = useMemo(() => {
    const memories = (results?.memories ?? []).map((memory) => ({ kind: 'memory' as const, memory }));
    const files = (results?.files ?? []).map((file) => ({ kind: 'file' as const, file }));
    return [...memories, ...files];
  }, [results]);

  function openSelected() {
    const item = flattened[selectedIndex];
    if (!item) return;
    if (item.kind === 'memory') {
      setOpen(false);
      router.push(`/memory?q=${encodeURIComponent(item.memory.title)}&focus=${encodeURIComponent(item.memory.title)}`);
      return;
    }
    if (item.kind === 'file') {
      window.location.href = `vscode://file/${item.file.path.replace(/\\/g, '/')}`;
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        // ⌘K on /memory focuses the page's native search instead of opening Ravens
        if (pathname === '/memory') return;
        event.preventDefault();
        setOpen(true);
        queueMicrotask(() => searchRef.current?.focus());
      }
      if ((event.metaKey || event.ctrlKey) && ['1', '2', '3', '4', '5'].includes(event.key)) {
        const mapping: AgentName[] = ['lebot-james', 'thor', 'perseus', 'fenrir', 'sauron'];
        setForcedAgent(mapping[Number(event.key) - 1]);
      }
      if (event.key === 'Escape') {
        setOpen(false);
      }
      if (open && event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flattened.length - 1));
      }
      if (open && event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      }
      if (open && event.key === 'Enter' && selectedIndex >= 0 && document.activeElement !== searchRef.current) {
        event.preventDefault();
        openSelected();
      }
    };

    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ forcedAgent?: AgentName; query?: string }>).detail;
      setForcedAgent(detail?.forcedAgent);
      setQuery(detail?.query ?? '');
      setOpen(true);
      queueMicrotask(() => searchRef.current?.focus());
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('ravens:open', onOpen as EventListener);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('ravens:open', onOpen as EventListener);
    };
  }, [pathname, open, selectedIndex, flattened.length]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      const url = new URL('/api/ravens', window.location.origin);
      url.searchParams.set('q', query);
      if (forcedAgent) url.searchParams.set('agent', forcedAgent);
      const res = await fetch(url.toString(), { signal: controller.signal });
      const data = (await res.json()) as RavensResults;
      setResults(data);
      setSelectedIndex(-1);
    }, 150);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [query, forcedAgent, open]);

  const selectedAgent = forcedAgent ?? results?.detectedAgent ?? 'lebot-james';
  const selectedMeta = useMemo(() => agents.find((agent) => agent.id === selectedAgent) ?? agents[0], [selectedAgent]);

  async function escalate() {
    if (!query.trim()) return;
    setLoading(true);
    setStreamText('');
    setActionStatus(null);
    const res = await fetch('/api/ravens', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: query, agent: selectedAgent }),
    });
    if (!res.body) {
      setLoading(false);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      setStreamText((prev) => prev + decoder.decode(value));
    }
    setLoading(false);
  }

  function handleEscalateClick() {
    if (!query.trim()) return;
    const estimated = results?.estimatedCost?.[selectedAgent] ?? 0.12;
    if (estimated > COST_CONFIRM_THRESHOLD) {
      setPendingEscalateCost(estimated);
      return;
    }
    void escalate();
  }

  function confirmEscalate() {
    setPendingEscalateCost(null);
    void escalate();
  }

  function cancelEscalate() {
    setPendingEscalateCost(null);
  }

  async function performAction(kind: 'pin' | 'save-saga') {
    if (!streamText.trim() || !query.trim()) return;
    setActionStatus(`${kind === 'pin' ? 'Pinning…' : 'Saving…'}`);
    try {
      const res = await fetch('/api/ravens/actions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, agent: selectedAgent, query, response: streamText }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      const ok = res.ok && data.ok !== false;
      setActionStatus(ok ? data.message ?? 'Done.' : data.error ?? 'Action failed.');
    } catch (err) {
      setActionStatus(err instanceof Error ? err.message : 'Action failed.');
    }
    window.setTimeout(() => setActionStatus(null), 4000);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          queueMicrotask(() => searchRef.current?.focus());
        }}
        aria-label="Open the Ravens (⌘K)"
        title="Open the Ravens (⌘K)"
        className="fixed right-6 top-6 z-30 rounded-full border border-border-subtle bg-bg-panel px-3 py-2 font-numeric text-[11px] text-text-muted transition-colors hover:border-rune-gold hover:text-rune-gold"
      >
        <span aria-hidden="true">⌘K</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute right-0 top-0 flex h-full w-[420px] flex-col border-l border-border-subtle bg-bg-panel px-5 py-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display text-2xl text-rune-gold">The Ravens</div>
                <div className="mt-1 text-sm italic text-text-secondary">Hugin and Munin listen at the bridge.</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-border-subtle px-2 py-1 text-xs text-text-muted hover:bg-bg-hover"
              >
                Esc
              </button>
            </div>

            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  if (selectedIndex >= 0) {
                    openSelected();
                  } else {
                    void escalate();
                  }
                }
              }}
              placeholder={placeholderForMode()}
              onFocus={() => setSelectedIndex(-1)}
              className="mt-5 rounded border border-border-subtle bg-bg-deep px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-rune-gold"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              {agents.map((agent) => {
                const active = selectedAgent === agent.id;
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setForcedAgent((prev) => (prev === agent.id ? undefined : agent.id))}
                    className={`rounded px-2 py-1 text-xs transition-colors ${
                      active ? 'bg-rune-gold text-bg-deep' : 'bg-bg-deep text-text-secondary hover:bg-bg-hover'
                    }`}
                  >
                    {agent.icon} {agent.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 text-sm italic text-text-secondary">{results?.preamble ?? '👑 The All-Father considers it.'}</div>

            <div className="mt-5 flex-1 space-y-6 overflow-y-auto pr-1">
              <section>
                <div className="font-display text-2xl text-text-primary">Memory ({results?.memories.length ?? 0})</div>
                <div className="mt-3 space-y-2">
                  {results?.memories.length ? (
                    results.memories.map((memory, index) => (
                      <details
                        key={memory.id}
                        className={`rounded border border-border-subtle bg-bg-deep p-3 ${
                          selectedIndex === index ? 'border-rune-gold ring-1 ring-rune-gold/40' : ''
                        }`}
                      >
                        <summary className="cursor-pointer list-none">
                          <div className="text-sm font-medium text-text-primary">{memory.title}</div>
                          <div className="mt-1 text-[11px] text-text-muted">
                            {memory.type} · {new Date(memory.timestamp).toLocaleString()}
                          </div>
                          <div className="mt-2 text-xs text-text-secondary">{memory.preview}</div>
                        </summary>
                      </details>
                    ))
                  ) : (
                    <div className="text-sm italic text-text-muted">Munin remembers nothing of this.</div>
                  )}
                </div>
              </section>

              <section>
                <div className="font-display text-2xl text-text-primary">Files ({results?.files.length ?? 0})</div>
                <div className="mt-3 space-y-2">
                  {results?.files.length ? (
                    results.files.map((file, index) => (
                      <a
                        key={`${file.path}-${index}`}
                        href={`vscode://file/${file.path.replace(/\\/g, '/')}`}
                        className={`block rounded border border-border-subtle bg-bg-deep p-3 transition-colors hover:bg-bg-hover ${
                          selectedIndex === (results.memories?.length ?? 0) + index
                            ? 'border-rune-gold ring-1 ring-rune-gold/40'
                            : ''
                        }`}
                      >
                        <div className="truncate font-mono text-xs text-rune-gold">{file.path}</div>
                        <div className="mt-2 text-xs text-text-secondary">{file.preview}</div>
                      </a>
                    ))
                  ) : (
                    <div className="text-sm italic text-text-muted">No files cross the Bifrost.</div>
                  )}
                </div>
              </section>

              {streamText ? (
                <section>
                  <div className="font-display text-2xl text-text-primary">Consultation</div>
                  <pre className="mt-3 whitespace-pre-wrap rounded border border-border-subtle bg-bg-deep p-4 text-sm text-text-secondary">
                    {streamText}
                  </pre>
                  {!loading ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void performAction('pin')}
                        className="rounded border border-border-subtle bg-bg-deep px-3 py-2 text-rune text-xs tracking-wider text-rune-gold transition-colors hover:bg-bg-hover hover:border-rune-gold"
                      >
                        📌 Pin as memory
                      </button>
                      <button
                        type="button"
                        onClick={() => void performAction('save-saga')}
                        className="rounded border border-border-subtle bg-bg-deep px-3 py-2 text-rune text-xs tracking-wider text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                      >
                        📜 Save to Saga
                      </button>
                      {actionStatus ? (
                        <div className="flex items-center text-xs italic text-text-muted">{actionStatus}</div>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              ) : null}
            </div>

            <div className="mt-4 border-t border-border-subtle pt-4">
              {!query.trim() && results?.recentQueries?.length ? (
                <div className="mb-3 space-y-1">
                  {results.recentQueries.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setQuery(item.query)}
                      className="block text-left text-xs text-text-muted hover:text-text-primary"
                    >
                      {item.query}
                    </button>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                disabled={!query.trim() || loading || !results?.claudeAvailable}
                onClick={handleEscalateClick}
                className="w-full rounded bg-rune-gold px-4 py-3 text-rune text-xs font-semibold tracking-wider text-bg-deep transition-colors hover:bg-rune-gold/90 disabled:opacity-40"
              >
                {loading
                  ? 'Consulting...'
                  : `Ask ${selectedMeta.label} → ~$${(results?.estimatedCost?.[selectedAgent] ?? 0.12).toFixed(2)}`}
              </button>
              {selectedAgent === 'lebot-james' && query.trim() && /find|latest|compare|research|news|what's happening/i.test(query) ? (
                <button
                  type="button"
                  disabled={!query.trim()}
                  onClick={() => {
                    setForcedAgent('sauron');
                    queueMicrotask(() => void escalate());
                  }}
                  className="mt-2 w-full rounded border border-border-subtle bg-bg-deep px-4 py-3 text-rune text-xs tracking-wider text-text-secondary transition-colors hover:bg-bg-hover disabled:opacity-40"
                >
                  Ask Sauron the web → ~$0.04
                </button>
              ) : null}
              {!results?.claudeAvailable ? (
                <div className="mt-2 text-xs text-blood">Claude offline. Configure `claude` CLI first.</div>
              ) : null}
            </div>
          </aside>

          {pendingEscalateCost !== null ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="w-[420px] max-w-[90vw] rounded border border-border-subtle bg-bg-panel p-6 shadow-2xl">
                <div className="font-display text-2xl text-rune-gold">Confirm cost</div>
                <p className="mt-3 text-sm text-text-secondary">
                  This query is estimated to cost{' '}
                  <span className="font-mono text-rune-gold">~${pendingEscalateCost.toFixed(2)}</span>. The All-Father
                  asks before spending past the line.
                </p>
                <p className="mt-2 text-xs italic text-text-muted">Threshold: ${COST_CONFIRM_THRESHOLD.toFixed(2)}.</p>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={cancelEscalate}
                    className="flex-1 rounded border border-border-subtle bg-bg-deep px-4 py-2 text-rune text-xs tracking-wider text-text-secondary transition-colors hover:bg-bg-hover"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmEscalate}
                    className="flex-1 rounded bg-rune-gold px-4 py-2 text-rune text-xs font-semibold tracking-wider text-bg-deep transition-colors hover:bg-rune-gold/90"
                  >
                    Proceed
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
