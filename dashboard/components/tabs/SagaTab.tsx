'use client';

import dynamicImport from 'next/dynamic';

const ActivityTimeline = dynamicImport(() => import('@/components/ActivityTimeline'));

export default function SagaTab() {
  return (
    <>
      <section className="px-12 py-8 pb-2">
        <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">SAGA</div>
        <h2 className="mt-2 font-display text-3xl text-text-primary">The Chronicle</h2>
        <p className="mt-2 text-sm italic text-text-secondary">Every forge, council, and loop — recorded for Heimdall.</p>
      </section>
      <ActivityTimeline />
    </>
  );
}
