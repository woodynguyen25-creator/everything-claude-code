'use client';

import type { TradingBot } from '@/lib/olympus/types';

type TradingBotsStatusProps = {
  bots: TradingBot[];
};

function timeLabel(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function TradingBotsStatus({ bots }: TradingBotsStatusProps) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[rgba(12,10,26,0.85)] p-4 shadow-[0_16px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
      <div className="mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">🤖 Trading Bots</h2>
        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/34">Hermes execution lanes</p>
      </div>

      <div className="space-y-2">
        {bots.map((bot) => (
          <button
            key={bot.slug}
            type="button"
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-3 text-left transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
            title="Detailed bot drawer is queued for a later pass."
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{bot.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white">{bot.name}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${
                    bot.status === 'live'
                      ? 'border-emerald-300/35 bg-emerald-400/10 text-emerald-200'
                      : bot.status === 'paper'
                        ? 'border-sky-300/35 bg-sky-400/10 text-sky-200'
                        : 'border-white/15 bg-white/[0.05] text-white/55'
                  }`}>
                    {bot.status}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-white/42">{bot.last_action}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-[11px]">
              <span className={`font-mono ${bot.daily_pnl >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                {bot.daily_pnl >= 0 ? '+' : ''}{(bot.daily_pnl_pct).toFixed(1)}%
              </span>
              <span className="text-white/38">{timeLabel(bot.last_action_ts)}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
