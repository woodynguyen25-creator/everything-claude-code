'use client';

import dynamicImport from 'next/dynamic';
import { useState } from 'react';

type TabKey = 'realm' | 'council' | 'olympus' | 'saga' | 'yggdrasil';

type Props = {
  realm: React.ReactNode;
};

const CouncilTab = dynamicImport(() => import('@/components/tabs/CouncilTab'));
const OlympusTab = dynamicImport(() => import('@/components/tabs/OlympusTab'));
const SagaTab = dynamicImport(() => import('@/components/tabs/SagaTab'));
const YggdrasilTab = dynamicImport(() => import('@/components/tabs/YggdrasilTab'));

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'realm', label: 'REALM' },
  { key: 'council', label: 'COUNCIL' },
  { key: 'olympus', label: 'OLYMPUS' },
  { key: 'saga', label: 'SAGA' },
  { key: 'yggdrasil', label: 'YGGDRASIL' },
];

export default function AgenticOsTabs({ realm }: Props) {
  const [active, setActive] = useState<TabKey>('realm');

  return (
    <>
      <section className="px-12 pt-8">
        <div className="flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`rounded px-4 py-2 text-rune text-xs tracking-[0.3em] transition-colors ${
                active === tab.key ? 'bg-rune-gold text-bg-deep' : 'bg-bg-deep text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {active === 'realm' ? realm : null}
      {active === 'council' ? <CouncilTab /> : null}
      {active === 'olympus' ? <OlympusTab /> : null}
      {active === 'saga' ? <SagaTab /> : null}
      {active === 'yggdrasil' ? <YggdrasilTab /> : null}
    </>
  );
}
