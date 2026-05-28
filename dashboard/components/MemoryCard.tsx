'use client';

import InlineMarkdown from '@/components/InlineMarkdown';
import type { Memory, MemoryType } from '@/lib/memory';

type Props = {
  memory: Memory;
  selected?: boolean;
  onOpen: () => void;
  onPromote: () => void;
  onArchive: () => void;
};

function typeTone(type: MemoryType) {
  switch (type) {
    case 'project':
      return 'bg-rune-gold/10 text-rune-gold';
    case 'feedback':
      return 'bg-bifrost/10 text-bifrost';
    case 'reference':
      return 'bg-ember/10 text-ember';
    case 'user':
      return 'bg-emerald/10 text-emerald';
    default:
      return 'bg-bg-hover text-text-muted';
  }
}

function displayTitle(title: string) {
  if (title.includes(' ')) return title;
  return title.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (minutes < 60) return formatter.format(-minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return formatter.format(-hours, 'hour');
  const days = Math.floor(hours / 24);
  return formatter.format(-days, 'day');
}

export default function MemoryCard({ memory, selected = false, onOpen, onPromote, onArchive }: Props) {
  return (
    <article
      className={`panel flex h-full flex-col p-5 transition-all duration-200 hover:scale-[1.02] hover:border-rune-gold ${
        selected ? 'ring-1 ring-rune-gold/40 border-rune-gold' : ''
      }`}
      tabIndex={0}
      onClick={onOpen}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-wider ${typeTone(memory.type)}`}>{memory.type}</span>
        <span className="text-[11px] text-text-muted">{relativeTime(memory.updatedAt)}</span>
      </div>
      <h3 className="mt-4 font-display text-2xl text-text-primary">{displayTitle(memory.title)}</h3>
      <InlineMarkdown text={memory.preview ?? ''} className="mt-3 line-clamp-4 text-sm text-text-secondary" />
      <div className="mt-auto flex items-center gap-2 pt-5">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          className="rounded border border-border-subtle px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary"
        >
          Open
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPromote();
          }}
          className="rounded border border-border-subtle px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary"
        >
          {memory.pinned ? 'Unpin' : 'Pin'}
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onArchive();
          }}
          className="rounded border border-border-subtle px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary"
        >
          Archive
        </button>
      </div>
    </article>
  );
}
