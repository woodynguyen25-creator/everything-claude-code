'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Memory } from '@/lib/memory';

type MemoryWithBody = Memory & { body: string };

type Props = {
  name: string | null;
  onClose: () => void;
  onRefresh: () => void;
};

export default function MemoryDrawer({ name, onClose, onRefresh }: Props) {
  const [memory, setMemory] = useState<MemoryWithBody | null>(null);
  const [refs, setRefs] = useState<Memory[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name) {
      setMemory(null);
      setRefs([]);
      setError(null);
      return;
    }
    void (async () => {
      try {
        setError(null);
        const [memoryRes, refsRes] = await Promise.all([
          fetch(`/api/memory/${encodeURIComponent(name)}`),
          fetch(`/api/memory/refs/${encodeURIComponent(name)}`),
        ]);
        if (!memoryRes.ok) {
          throw new Error('The well is silent. This memory could not be opened.');
        }
        setMemory((await memoryRes.json()) as MemoryWithBody);
        setRefs(refsRes.ok ? ((await refsRes.json()) as Memory[]) : []);
      } catch (err) {
        setMemory(null);
        setRefs([]);
        setError(err instanceof Error ? err.message : 'The well is silent.');
      }
    })();
  }, [name]);

  useEffect(() => {
    if (!name) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [name, onClose]);

  if (!name) return null;

  const safeName = name;

  async function mutate(action: 'promote' | 'archive') {
    await fetch(`/api/memory/${encodeURIComponent(safeName)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    onRefresh();
    onClose();
  }

  async function remove() {
    if (!window.confirm('Cast this memory into Helheim? This cannot be undone.')) return;
    await fetch(`/api/memory/${encodeURIComponent(safeName)}`, { method: 'DELETE' });
    onRefresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-[600px] overflow-y-auto border-l border-border-subtle bg-bg-panel p-6">
        {memory ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">{memory.type}</div>
                <h2 className="mt-2 font-display text-3xl text-rune-gold">{memory.title}</h2>
                <div className="mt-2 text-xs text-text-muted">
                  Created {new Date(memory.createdAt).toLocaleString()} · Updated {new Date(memory.updatedAt).toLocaleString()}
                </div>
              </div>
              <button type="button" onClick={onClose} className="rounded border border-border-subtle px-3 py-2 text-xs text-text-muted hover:bg-bg-hover">
                Esc
              </button>
            </div>

            <div className="prose prose-invert mt-6 max-w-none prose-headings:font-display prose-headings:text-text-primary prose-p:text-text-secondary prose-code:font-mono prose-code:text-rune-gold">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{memory.body}</ReactMarkdown>
            </div>

            <div className="mt-6 space-y-3">
              <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">CROSS REFERENCES</div>
              {refs.length ? (
                <ul className="space-y-2 text-sm text-text-secondary">
                  {refs.map((ref) => (
                    <li key={ref.name}>{ref.title}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm italic text-text-muted">No threads knot around this memory yet.</div>
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              <a
                href={`vscode://file/${memory.bodyPath.replace(/\\/g, '/')}`}
                className="rounded border border-border-subtle px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              >
                Edit in VS Code
              </a>
              <button type="button" onClick={() => void mutate('promote')} className="rounded border border-border-subtle px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary">
                {memory.pinned ? 'Unpin from MEMORY.md' : 'Promote to MEMORY.md'}
              </button>
              <button type="button" onClick={() => void mutate('archive')} className="rounded border border-border-subtle px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary">
                Archive
              </button>
              <button type="button" onClick={() => void remove()} className="rounded border border-border-subtle px-3 py-2 text-xs text-blood hover:bg-bg-hover">
                Delete
              </button>
            </div>
          </>
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-sm text-center text-sm italic text-text-muted">{error}</div>
          </div>
        ) : (
          <div className="h-full rounded bg-bg-deep shimmer" />
        )}
      </aside>
    </div>
  );
}
