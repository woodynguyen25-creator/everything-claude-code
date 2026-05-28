'use client';

import { useEffect, useState } from 'react';
import type { ChatThreadRecord } from '@/lib/chat-schema';

type Props = {
  threads: ChatThreadRecord[];
  activeThreadId: number | null;
  accentBorderClass: string;
  accentTextClass: string;
  accentButtonClass: string;
  emptyLabel: string;
  hasMore: boolean;
  onCreate: () => void;
  onSelect: (threadId: number) => void;
  onDelete: (threadId: number) => void;
  onRename: (threadId: number, title: string) => void;
  onSearchChange: (value: string) => void;
  onLoadMore: () => void;
};

function relativeStamp(iso: string | null) {
  if (!iso) return 'just now';
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function ThreadSidebar({
  threads,
  activeThreadId,
  accentBorderClass,
  accentTextClass,
  accentButtonClass,
  emptyLabel,
  hasMore,
  onCreate,
  onSelect,
  onDelete,
  onRename,
  onSearchChange,
  onLoadMore,
}: Props) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handle = window.setTimeout(() => onSearchChange(search), 200);
    return () => window.clearTimeout(handle);
  }, [search, onSearchChange]);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border-subtle bg-bg-panel/95">
      <div className="sticky top-0 z-10 border-b border-border-subtle bg-bg-panel/95 px-4 py-4 backdrop-blur-sm">
        <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">PAST SAGAS</div>
        <button
          type="button"
          onClick={onCreate}
          className={`mt-3 w-full rounded px-3 py-2 text-rune text-xs font-semibold tracking-wider transition-colors hover:opacity-90 ${accentButtonClass}`}
        >
          + New Council
        </button>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search past councils…"
          className="mt-3 w-full rounded border border-border-subtle bg-bg-deep px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-rune-gold"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {threads.length ? (
          <ul className="space-y-2">
            {threads.map((thread) => {
              const active = thread.id === activeThreadId;
              return (
                <li key={thread.id}>
                  <div
                    className={`group rounded border-l-2 px-3 py-3 transition-all duration-200 hover:scale-[1.01] ${
                      active
                        ? `bg-bg-hover ${accentBorderClass}`
                        : 'border-l-transparent bg-bg-raised hover:bg-bg-hover'
                    }`}
                  >
                    <button
                      type="button"
                      aria-current={active ? 'true' : undefined}
                      onClick={() => onSelect(thread.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm text-text-primary">{thread.title}</div>
                          <div className="mt-1 truncate text-xs text-text-secondary">
                            {thread.preview ?? 'No words written yet.'}
                          </div>
                        </div>
                        <div className="shrink-0 font-numeric text-[10px] text-text-muted">
                          {relativeStamp(thread.lastMessageAt ?? thread.updatedAt)}
                        </div>
                      </div>
                    </button>
                    <div className="mt-3 hidden items-center gap-2 group-hover:flex">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          const nextTitle = window.prompt('Rename this council', thread.title);
                          if (nextTitle?.trim()) onRename(thread.id, nextTitle.trim());
                        }}
                        className="rounded border border-border-subtle px-2 py-1 text-[10px] text-text-muted hover:bg-bg-deep hover:text-text-primary"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(thread.id);
                        }}
                        className="rounded border border-border-subtle px-2 py-1 text-[10px] text-text-muted hover:bg-bg-deep hover:text-blood"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-3 py-5 text-sm italic text-text-muted">{emptyLabel}</div>
        )}
      </div>

      {hasMore ? (
        <div className="border-t border-border-subtle px-4 py-3">
          <button
            type="button"
            onClick={onLoadMore}
            className="w-full rounded border border-border-subtle px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
          >
            More tidings
          </button>
        </div>
      ) : null}
    </aside>
  );
}
