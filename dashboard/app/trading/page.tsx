import Link from 'next/link';
import { getTradingDetail } from '@/lib/adapters/trading';

export const dynamic = 'force-dynamic';

type TradingPageProps = {
  searchParams?: {
    focus?: string;
  };
};

function focusAccent(active: boolean) {
  return active
    ? 'border-rune-gold bg-bg-hover text-text-primary'
    : 'border-border-subtle bg-bg-panel text-text-secondary hover:bg-bg-hover hover:text-text-primary';
}

function formatLegRow(legsJson: string) {
  try {
    const legs = JSON.parse(legsJson) as Array<Record<string, unknown>>;
    return legs.map((leg, index) => ({
      id: `${index}-${String(leg.player || leg.ticker || leg.asset || 'leg')}`,
      subject: String(leg.player || leg.ticker || leg.asset || 'Unknown'),
      stat: String(leg.stat || leg.stat_raw || leg.market || 'Market'),
      line: leg.line != null ? String(leg.line) : '—',
      pick: String(leg.direction || leg.pick || '—'),
      odds: leg.odds != null ? String(leg.odds) : '—',
      ev: leg.ev_pct != null ? `${Number(leg.ev_pct).toFixed(1)}%` : '—',
    }));
  } catch {
    return [];
  }
}

function MarkdownPanel({ content, label }: { content: string; label: string }) {
  return (
    <article className="panel p-6">
      <div className="mb-4 text-rune text-[10px] tracking-[0.3em] text-text-muted">{label}</div>
      <div className="max-h-[48rem] overflow-y-auto whitespace-pre-wrap rounded bg-bg-deep p-4 font-mono text-xs leading-6 text-text-secondary">
        {content}
      </div>
    </article>
  );
}

export default async function TradingPage({ searchParams }: TradingPageProps) {
  const focus = searchParams?.focus ?? 'parlay';
  const { cards, latestBrief, latestParlay, latestScanBrief, latestOptions } = await getTradingDetail();
  const visibleCards = cards.filter((card) => (focus === 'brief' ? card.sourceLabel === 'BRIEF' : card.sourceLabel === 'PARLAY'));
  const slateRows = latestParlay ? formatLegRow(latestParlay.legs_json) : [];

  return (
    <div className="px-12 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-2 text-rune text-[10px] tracking-[0.3em] text-text-muted">TRADING</div>
        <h1 className="font-display text-4xl text-text-primary">Slate of Fates</h1>
        <p className="mt-3 max-w-2xl text-sm text-text-secondary">
          Live local trading signals — ParlayBot slates, TradingView morning brief, daily scan, and options analysis.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {([
            { key: 'parlay', label: 'Parlay' },
            { key: 'brief', label: 'Morning Brief' },
            { key: 'scan', label: 'Scan Brief' },
            { key: 'options', label: 'Options' },
          ] as const).map(({ key, label }) => (
            <Link
              key={key}
              href={`/trading?focus=${key}`}
              className={`rounded border px-4 py-2 text-rune text-xs tracking-wider transition-colors ${focusAccent(focus === key)}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Scan Brief */}
        {focus === 'scan' && (
          <section className="mt-8">
            {latestScanBrief ? (
              <MarkdownPanel content={latestScanBrief.content} label="LATEST SCAN BRIEF" />
            ) : (
              <div className="panel p-6 text-sm italic text-text-muted">No scan brief found. Run <code className="font-mono">py trading_brief.py</code> to generate one.</div>
            )}
          </section>
        )}

        {/* Options Analysis */}
        {focus === 'options' && (
          <section className="mt-8">
            {latestOptions ? (
              <MarkdownPanel content={latestOptions.content} label="OPTIONS CHAIN ANALYSIS" />
            ) : (
              <div className="panel p-6 text-sm italic text-text-muted">No options analysis found. Run an options chain scan and save to Command Center.</div>
            )}
          </section>
        )}

        {/* Parlay + Morning Brief (original layout) */}
        {(focus === 'parlay' || focus === 'brief') && (
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="panel p-6">
              <div className="mb-4 text-rune text-[10px] tracking-[0.3em] text-text-muted">ACTIVE SIGNALS</div>
              {visibleCards.length ? (
                <ul className="space-y-3">
                  {visibleCards.map((card, index) => (
                    <li key={`${card.sourceLabel}-${index}`} className="rounded bg-bg-deep p-4">
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <span className={`h-2 w-2 rounded-full ${card.isFresh ? 'bg-bifrost' : 'bg-ember'}`} />
                        <span>{card.isFresh ? 'fresh' : 'stale'}</span>
                        <span>·</span>
                        <span>{new Date(card.freshness.iso).toLocaleString()}</span>
                      </div>
                      <div className="mt-3 text-base font-medium text-text-primary">
                        <span className="mr-2 text-rune text-[10px] tracking-wider text-text-secondary">{card.sourceLabel}</span>
                        {card.headline}
                      </div>
                      {card.detail ? <div className="mt-1 text-sm text-text-secondary">{card.detail}</div> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm italic text-text-muted">No slate cut yet. Perseus has not cast today.</div>
              )}
            </article>

            {focus === 'brief' ? (
              <article className="panel p-6">
                <div className="mb-4 text-rune text-[10px] tracking-[0.3em] text-text-muted">LATEST BRIEF</div>
                {latestBrief ? (
                  <>
                    <div className="text-base font-medium text-text-primary">{latestBrief.headline}</div>
                    <div className="mt-2 font-numeric text-xs text-text-muted">{latestBrief.path}</div>
                    <div className="mt-4 max-h-[36rem] overflow-y-auto whitespace-pre-wrap rounded bg-bg-deep p-4 font-mono text-xs leading-6 text-text-secondary">
                      {latestBrief.content}
                    </div>
                  </>
                ) : (
                  <div className="text-sm italic text-text-muted">No brief file available.</div>
                )}
              </article>
            ) : (
              <article className="panel p-6">
                <div className="mb-4 text-rune text-[10px] tracking-[0.3em] text-text-muted">LATEST SLATE</div>
                {latestParlay ? (
                  <>
                    <div className="text-base font-medium text-text-primary">
                      {latestParlay.sport} · {latestParlay.n_legs} legs · EV +{latestParlay.ev_pct.toFixed(1)}%
                    </div>
                    <div className="mt-2 font-numeric text-xs text-text-muted">{latestParlay.created_at}</div>
                    {slateRows.length ? (
                      <div className="mt-4 overflow-hidden rounded border border-border-subtle bg-bg-deep">
                        <div className="grid grid-cols-[1.3fr_1fr_0.7fr_0.8fr_0.7fr_0.7fr] gap-3 border-b border-border-subtle px-4 py-3 text-rune text-[10px] tracking-[0.2em] text-text-muted">
                          <span>PLAYER</span>
                          <span>STAT</span>
                          <span>LINE</span>
                          <span>PICK</span>
                          <span>ODDS</span>
                          <span>EV</span>
                        </div>
                        <div className="divide-y divide-border-subtle">
                          {slateRows.map((row) => (
                            <div key={row.id} className="grid grid-cols-[1.3fr_1fr_0.7fr_0.8fr_0.7fr_0.7fr] gap-3 px-4 py-3 text-sm text-text-secondary">
                              <span className="text-text-primary">{row.subject}</span>
                              <span>{row.stat}</span>
                              <span className="font-numeric">{row.line}</span>
                              <span>{row.pick}</span>
                              <span className="font-numeric">{row.odds}</span>
                              <span className="font-numeric text-rune-gold">{row.ev}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 text-sm italic text-text-muted">The slate arrived, but its legs need another pass before they can be read.</div>
                    )}
                  </>
                ) : (
                  <div className="text-sm italic text-text-muted">No slate data available.</div>
                )}
              </article>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
