'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Memory, MemorySource, MemoryType } from '@/lib/memory';
import MemoryCard from '@/components/MemoryCard';
import MemoryDrawer from '@/components/MemoryDrawer';

const TYPE_OPTIONS: Array<{
  value: MemoryType;
  label: string;
  activeClass: string;
}> = [
  { value: 'project', label: 'project', activeClass: 'bg-rune-gold text-bg-deep' },
  { value: 'feedback', label: 'feedback', activeClass: 'bg-bifrost text-bg-deep' },
  { value: 'reference', label: 'reference', activeClass: 'bg-ember text-bg-deep' },
  { value: 'user', label: 'user', activeClass: 'bg-emerald text-bg-deep' },
];

const SOURCE_OPTIONS: Array<{
  value: MemorySource;
  label: string;
}> = [
  { value: 'claude-mem', label: 'claude-mem' },
  { value: 'memory-md', label: 'MEMORY.md' },
];

function useRelativeMinutes(iso: string | null) {
  return useMemo(() => {
    if (!iso) return 'just now';
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  }, [iso]);
}

export default function MemoryWellClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [items, setItems] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [types, setTypes] = useState<MemoryType[]>([]);
  const [sources, setSources] = useState<MemorySource[]>([]);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(0);
  const [focusName, setFocusName] = useState<string | null>(searchParams.get('focus'));
  const [status, setStatus] = useState<{ total: number; syncedAt: string | null }>({
    total: 0,
    syncedAt: null,
  });

  const lastSyncLabel = useRelativeMinutes(status.syncedAt);
  const resolvedFocusName = useMemo(() => {
    if (!focusName) return null;
    const match = items.find((item) => item.name === focusName || item.title === focusName);
    return match?.name ?? focusName;
  }, [focusName, items]);

  const load = useCallback(async (reset = false, nextOffset = offset) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (types.length) params.set('types', types.join(','));
      if (sources.length) params.set('sources', sources.join(','));
      params.set('limit', '12');
      params.set('offset', String(nextOffset));

      const res = await fetch(`/api/memory?${params.toString()}`);
      const data = (await res.json()) as Memory[];
      const total = Number(res.headers.get('x-total-count') ?? '0');
      const syncedAt = res.headers.get('x-memory-sync');

      setItems((prev) => (reset ? data : [...prev, ...data]));
      setStatus({
        total: Number.isFinite(total) ? total : data.length,
        syncedAt: syncedAt || new Date().toISOString(),
      });
      setHasLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [offset, search, sources, types]);

  useEffect(() => {
    const focus = searchParams.get('focus');
    const q = searchParams.get('q');
    if (q !== null && q !== search) {
      setSearch(q);
    }
    setFocusName(focus);
  }, [searchParams, search]);

  useEffect(() => {
    setOffset(0);
    setSelected(0);
    void load(true, 0);
  }, [search, types, sources, load]);

  const updateUrl = useCallback((next: { focus?: string | null }) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (search.trim()) {
      nextParams.set('q', search.trim());
    } else {
      nextParams.delete('q');
    }

    if (next.focus) {
      nextParams.set('focus', next.focus);
    } else {
      nextParams.delete('focus');
    }

    const query = nextParams.toString();
    router.replace(query ? `/memory?${query}` : '/memory', { scroll: false });
  }, [searchParams, search, router]);

  const openMemory = useCallback((name: string) => {
    setFocusName(name);
    updateUrl({ focus: name });
  }, [updateUrl]);

  const closeDrawer = useCallback(() => {
    setFocusName(null);
    updateUrl({ focus: null });
  }, [updateUrl]);

  const mutateMemory = useCallback(async (name: string, action: 'promote' | 'archive') => {
    await fetch(`/api/memory/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setOffset(0);
    await load(true, 0);
  }, [load]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInputFocused = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        if (resolvedFocusName) {
          closeDrawer();
        } else if (search || types.length || sources.length) {
          setSearch('');
          setTypes([]);
          setSources([]);
        }
        return;
      }

      if (resolvedFocusName) return;

      if (event.key === 'ArrowDown' && !isInputFocused) {
        event.preventDefault();
        setSelected((prev) => Math.min(prev + 1, Math.max(items.length - 1, 0)));
      }
      if (event.key === 'ArrowUp' && !isInputFocused) {
        event.preventDefault();
        setSelected((prev) => Math.max(prev - 1, 0));
      }
      if (event.key === 'Enter' && items[selected] && !isInputFocused) {
        event.preventDefault();
        openMemory(items[selected].name);
      }
      if (event.key.toLowerCase() === 'p' && items[selected] && !isInputFocused) {
        event.preventDefault();
        void mutateMemory(items[selected].name, 'promote');
      }
      if (event.key === 'Delete' && items[selected] && !isInputFocused) {
        event.preventDefault();
        void mutateMemory(items[selected].name, 'archive');
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resolvedFocusName, items, search, selected, sources.length, types.length, closeDrawer, mutateMemory, openMemory]);

  function toggleType(type: MemoryType) {
    setTypes((prev) => (prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]));
  }

  function toggleSource(source: MemorySource) {
    setSources((prev) => (prev.includes(source) ? prev.filter((item) => item !== source) : [...prev, source]));
  }

  const hasFilters = types.length > 0 || sources.length > 0;
  const showNoSearch = !loading && hasLoaded && items.length === 0 && Boolean(search.trim());
  const showNoFilter = !loading && hasLoaded && items.length === 0 && !search.trim() && hasFilters;
  const showEmpty = !loading && hasLoaded && items.length === 0 && !search.trim() && !hasFilters;
  const hasMore = items.length < status.total;

  return (
    <>
      <div className="mt-6">
        <div className="mb-3 text-sm text-text-secondary">~{status.total} memories indexed · last sync {lastSyncLabel}</div>

        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            id="memory-search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search the well..."
            className="flex-1 rounded border border-border-subtle bg-bg-deep px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-rune-gold"
          />
          <div className="text-xs text-text-muted">⌘K</div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTypes([])}
            className={`rounded-full px-3 py-1 text-xs ${
              types.length === 0 ? 'bg-rune-gold text-bg-deep' : 'bg-bg-deep text-text-secondary hover:bg-bg-hover'
            }`}
          >
            All
          </button>
          {TYPE_OPTIONS.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => toggleType(type.value)}
              className={`rounded-full px-3 py-1 text-xs ${
                types.includes(type.value) ? type.activeClass : 'bg-bg-deep text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {SOURCE_OPTIONS.map((source) => (
            <button
              key={source.value}
              type="button"
              onClick={() => toggleSource(source.value)}
              className={`rounded-full px-3 py-1 text-xs ${
                sources.includes(source.value)
                  ? 'bg-bifrost text-bg-deep'
                  : 'bg-bg-deep text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {source.label}
            </button>
          ))}
        </div>
      </div>

      {showNoSearch ? (
        <div className="mt-10 text-sm italic text-text-muted">Mímir does not know that. Try different words.</div>
      ) : null}
      {showNoFilter ? (
        <div className="mt-10 text-sm italic text-text-muted">None under this watch. Try broader filters.</div>
      ) : null}
      {showEmpty ? (
        <div className="mt-10 text-sm italic text-text-muted">
          The well is dry. No memories yet. Live, work, and Mímir will fill it.
        </div>
      ) : null}

      {items.length > 0 ? (
        <>
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {items.map((memory, index) => (
              <MemoryCard
                key={memory.name}
                memory={memory}
                selected={index === selected}
                onOpen={() => openMemory(memory.name)}
                onPromote={() => void mutateMemory(memory.name, 'promote')}
                onArchive={() => void mutateMemory(memory.name, 'archive')}
              />
            ))}
          </div>

          {hasMore ? (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  const nextOffset = offset + 12;
                  setOffset(nextOffset);
                  void load(false, nextOffset);
                }}
                className="rounded border border-border-subtle px-4 py-2 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              >
                Load more (12)
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {loading ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="panel h-48 p-5">
              <div className="h-4 w-3/4 rounded bg-bg-deep shimmer" />
              <div className="mt-3 h-3 w-1/2 rounded bg-bg-deep shimmer" />
              <div className="mt-6 h-24 rounded bg-bg-deep shimmer" />
            </div>
          ))}
        </div>
      ) : null}

      <MemoryDrawer
        name={resolvedFocusName}
        onClose={closeDrawer}
        onRefresh={() => {
          setOffset(0);
          void load(true, 0);
        }}
      />
    </>
  );
}
