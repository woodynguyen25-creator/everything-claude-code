'use client';

import { useLiveResource } from '@/lib/useLiveResource';
import type { NewsItem } from '@/app/api/news/route';

function timeAgo(dateStr: string): string {
  // Finviz returns times like "10:50AM" — we just display as-is
  return dateStr;
}

export default function NewsFeedPanel() {
  const { data, loading, isFetching, lastUpdated, refresh } = useLiveResource<{ items: NewsItem[] }>(
    '/api/news',
    { intervalMs: 10 * 60 * 1000 },
  );
  const items = data?.items ?? [];
  const age = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Chicago',
      }) + ' CT'
    : '—';

  return (
    <section className="mb-0 overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-transparent shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl">
      <header className="flex items-center justify-between border-b border-border-subtle/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-bifrost shadow-[0_0_6px_rgba(96,165,250,0.5)]" />
          <span className="text-rune text-[10px] tracking-[0.3em] text-text-muted">MARKET HEADLINES</span>
          <span className="rounded-sm bg-bg-deep px-1.5 py-0.5 font-mono text-[9px] text-text-muted">via Finviz</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] text-text-muted">{age}</span>
          <button
            type="button"
            onClick={refresh}
            disabled={isFetching}
            className="rounded border border-border-subtle px-2 py-0.5 font-mono text-[9px] text-text-muted transition-colors hover:border-bifrost hover:text-bifrost disabled:opacity-40 cursor-pointer"
          >
            {isFetching ? '...' : 'REFRESH'}
          </button>
        </div>
      </header>

      <div className="divide-y divide-border-subtle/10">
        {loading && items.length === 0 ? (
          <div className="py-5 text-center font-mono text-[11px] text-text-muted">Fetching headlines...</div>
        ) : items.length === 0 ? (
          <div className="py-5 text-center font-mono text-[11px] text-text-muted">No headlines available.</div>
        ) : (
          items.map((item, i) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-bg-hover group cursor-pointer"
            >
              <span className="mt-0.5 shrink-0 font-mono text-[9px] tabular-nums text-text-muted w-14 text-right">
                {item.date}
              </span>
              <span className="flex-1 text-[12px] leading-snug text-text-secondary group-hover:text-text-primary transition-colors">
                {item.headline}
              </span>
              <span className="mt-0.5 shrink-0 text-[9px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
            </a>
          ))
        )}
      </div>
    </section>
  );
}
