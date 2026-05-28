'use client';

import { PantheonCouncil } from '@/components/PantheonCouncil';
import { ThorDesk } from '@/components/ThorDesk';
import { ActivityFeed } from '@/components/ActivityFeed';

export default function CouncilTab() {
  return (
    <section className="pt-8">
      <div className="mx-12 mb-6">
        <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">MISSION CONTROL</div>
        <h2 className="mt-1 font-serif text-3xl text-white">The Council</h2>
        <p className="mt-1 text-sm text-white/55">
          Seven agents on autonomous watch. Atlas keeps them alive. Refreshes every 30 seconds.
        </p>
      </div>

      <PantheonCouncil />

      <div className="mx-12 mb-3 mt-4">
        <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">MJÖLNIR COUNCIL</div>
        <h3 className="mt-1 font-serif text-xl text-white">Thor · Magni · Modi · Thrud</h3>
        <p className="mt-1 text-xs text-white/55">Thor commands the trade. His three children each run one asset.</p>
      </div>
      <ThorDesk />

      <div className="mx-12 mb-3 mt-4">
        <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">LIVE EVENTS</div>
        <h3 className="mt-1 font-serif text-xl text-white">Activity Feed</h3>
      </div>
      <ActivityFeed />
    </section>
  );
}
