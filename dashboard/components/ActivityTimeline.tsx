'use client';

import { useEffect, useMemo, useState } from 'react';
import InlineMarkdown from '@/components/InlineMarkdown';
import type { ActivityEvent, ActivityKind } from '@/lib/activity';

const kindOptions: Array<{ value: ActivityKind; label: string; accent: string }> = [
  { value: 'doctor', label: 'Doctor', accent: 'bg-rune-gold text-bg-deep' },
  { value: 'forge', label: 'Forge', accent: 'bg-blood text-text-primary' },
  { value: 'dream', label: 'Dream', accent: 'bg-ember text-bg-deep' },
  { value: 'council', label: 'Council', accent: 'bg-bifrost text-bg-deep' },
  { value: 'saga', label: 'Saga', accent: 'bg-emerald text-bg-deep' },
  { value: 'triad', label: 'Triad', accent: 'bg-fire text-bg-deep' },
];

const windowOptions = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: 'all', label: 'All time' },
];

function sinceForWindow(value: string) {
  const now = new Date();
  if (value === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }
  if (value === '7d') {
    return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  return null;
}

function stamp(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function summarize(events: ActivityEvent[]) {
  const forgings = events.filter((event) => event.kind === 'forge' || event.kind === 'triad').length;
  const deepseek = events.reduce((sum, event) => sum + (event.cost ?? 0), 0);
  const loops = events.filter((event) => event.source.includes('scripts/loops') || event.kind === 'triad').length;
  return {
    forgings,
    deepseek,
    loops,
  };
}

export default function ActivityTimeline() {
  const [items, setItems] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<ActivityKind | 'all'>('all');
  const [agent, setAgent] = useState<string>('all');
  const [windowValue, setWindowValue] = useState('today');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const agentOptions = useMemo(() => {
    const values = Array.from(new Set(items.map((item) => item.agent).filter(Boolean))) as string[];
    return values.sort();
  }, [items]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        setError(null);
        const url = new URL('/api/activity', window.location.origin);
        if (kind !== 'all') url.searchParams.set('kind', kind);
        if (agent !== 'all') url.searchParams.set('agent', agent);
        const since = sinceForWindow(windowValue);
        if (since) url.searchParams.set('since', since);
        url.searchParams.set('limit', '120');
        const res = await fetch(url.toString());
        if (!res.ok) {
          throw new Error('Heimdall lost the trail for a moment.');
        }
        const data = (await res.json()) as ActivityEvent[];
        setItems(data);
        setSelectedIndex(0);
      } catch (err) {
        setItems([]);
        setError(err instanceof Error ? err.message : 'Heimdall lost the trail.');
      } finally {
        setLoading(false);
      }
    }

    void load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, [kind, agent, windowValue]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      if (typing) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, Math.max(items.length - 1, 0)));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      }
      if (event.key === 'Enter' && items[selectedIndex]) {
        event.preventDefault();
        setExpandedId((prev) => (prev === items[selectedIndex].id ? null : items[selectedIndex].id));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, selectedIndex]);

  const tally = summarize(items);

  return (
    <div className="px-12 pb-12">
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setKind('all')}
          className={`rounded-full px-3 py-1 text-xs ${kind === 'all' ? 'bg-rune-gold text-bg-deep' : 'bg-bg-deep text-text-secondary hover:bg-bg-hover'}`}
        >
          All
        </button>
        {kindOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setKind(option.value)}
            className={`rounded-full px-3 py-1 text-xs ${kind === option.value ? option.accent : 'bg-bg-deep text-text-secondary hover:bg-bg-hover'}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAgent('all')}
          className={`rounded-full px-3 py-1 text-xs ${agent === 'all' ? 'bg-rune-gold text-bg-deep' : 'bg-bg-deep text-text-secondary hover:bg-bg-hover'}`}
        >
          All agents
        </button>
        {agentOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setAgent(option)}
            className={`rounded-full px-3 py-1 text-xs ${agent === option ? 'bg-bifrost text-bg-deep' : 'bg-bg-deep text-text-secondary hover:bg-bg-hover'}`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {windowOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setWindowValue(option.value)}
            className={`rounded-full px-3 py-1 text-xs ${windowValue === option.value ? 'bg-rune-gold text-bg-deep' : 'bg-bg-deep text-text-secondary hover:bg-bg-hover'}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <article className="panel p-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded border border-border-subtle bg-bg-deep px-4 py-3">
                  <div className="h-3 w-1/3 rounded bg-bg-hover shimmer" />
                  <div className="mt-3 h-3 w-3/4 rounded bg-bg-hover shimmer" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-sm italic text-text-muted">{error}</div>
          ) : items.length ? (
            <ul className="space-y-3 font-mono text-xs">
              {items.map((item, index) => {
                const expanded = expandedId === item.id;
                const selected = index === selectedIndex;
              return (
                  <li key={item.id}>
                    <div
                      className={`rounded border px-4 py-3 transition-colors ${
                        selected ? 'border-rune-gold ring-1 ring-rune-gold/40 bg-bg-hover' : 'border-border-subtle bg-bg-deep hover:bg-bg-hover'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
                        className="w-full text-left"
                      >
                        <div className="flex flex-wrap items-start gap-3">
                          <span className="font-numeric text-[11px] text-text-muted">[{stamp(item.timestamp)}]</span>
                          <span className="rounded bg-bg-panel px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-rune-gold">
                            {item.kind}
                          </span>
                          {item.agent ? (
                            <span className="rounded bg-bg-panel px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-bifrost">
                              {item.agent}
                            </span>
                          ) : null}
                          <span className="min-w-0 flex-1 text-text-secondary">
                            <InlineMarkdown text={item.title} className="text-xs text-text-secondary" />
                          </span>
                          {typeof item.cost === 'number' && item.cost > 0 ? (
                            <span className="ml-auto font-numeric text-[11px] text-blood">${item.cost.toFixed(2)}</span>
                          ) : null}
                        </div>
                      </button>

                      {expanded ? (
                        <div className="mt-3 space-y-2 border-t border-border-subtle pt-3 text-left text-text-secondary">
                          <div className="text-[11px] text-text-muted">
                            {relativeTime(item.timestamp)} · source {item.source}
                          </div>
                          {item.detail ? <InlineMarkdown text={item.detail} className="whitespace-pre-wrap text-xs text-text-secondary" /> : null}
                          {item.href ? (
                            <a href={item.href} className="inline-flex rounded border border-border-subtle px-3 py-1 text-[11px] text-text-primary hover:bg-bg-hover">
                              Open surface
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-sm italic text-text-muted">
              Heimdall sees only stillness. No events crossed the bridge today.
            </div>
          )}
        </article>

        <aside className="panel p-6">
          <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">TODAY&apos;S TALLY</div>
          <div className="mt-4 space-y-4">
            <div>
              <div className="font-numeric text-2xl text-text-primary">{tally.forgings}</div>
              <div className="text-xs text-text-secondary">Forgings</div>
            </div>
            <div>
              <div className="font-numeric text-2xl text-text-primary">${tally.deepseek.toFixed(2)}</div>
              <div className="text-xs text-text-secondary">DeepSeek spend</div>
            </div>
            <div>
              <div className="font-numeric text-2xl text-text-primary">{tally.loops}</div>
              <div className="text-xs text-text-secondary">Loops run</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
