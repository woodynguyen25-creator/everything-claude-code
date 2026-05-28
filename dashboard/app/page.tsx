import dynamicImport from 'next/dynamic';
import AgenticOsTabs from '@/components/AgenticOsTabs';
import AmbientEmbers from '@/components/AmbientEmbers';
import DailyRitesPanel from '@/components/DailyRitesPanel';
import DreamingSurfaces from '@/components/DreamingSurfaces';
import HeroBand from '@/components/HeroBand';
import NextActionCard from '@/components/NextActionCard';
import SectionLabel from '@/components/SectionLabel';
import SideBySide from '@/components/SideBySide';
import SystemPulseStrip from '@/components/SystemPulseStrip';
import { ActivityRecent } from '@/components/ActivityRecent';
import { TriadCostMeter } from '@/components/TriadCostMeter';
import { TradingAgentsPanel } from '@/components/TradingAgentsPanel';
import { PantheonCouncil } from '@/components/PantheonCouncil';
import { getActiveInternshipCounts } from '@/lib/internships';
import { getRealmStatus } from '@/lib/realm-status';

const MarketPulseBar = dynamicImport(() => import('@/components/MarketPulseBar'), { ssr: false });
const InternshipPanel = dynamicImport(() => import('@/components/InternshipPanel'), {
  loading: () => <PanelSkeleton className="mx-12 h-48" />,
});
const WorkoutPanel = dynamicImport(() => import('@/components/WorkoutPanel'), {
  loading: () => <PanelSkeleton className="h-72" />,
});
const FinancePanel = dynamicImport(() => import('@/components/FinancePanel'), {
  loading: () => <PanelSkeleton className="h-72" />,
});
const UnusualOptionsPanel = dynamicImport(() => import('@/components/UnusualOptionsPanel'), {
  loading: () => <PanelSkeleton className="h-56" />,
});
const NewsFeedPanel = dynamicImport(() => import('@/components/NewsFeedPanel'), {
  loading: () => <PanelSkeleton className="h-56" />,
});

export const dynamic = 'force-dynamic';

function PanelSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-transparent shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl ${className ?? ''}`.trim()}
    >
      <div className="p-6">
        <div className="h-4 w-24 rounded bg-bg-deep shimmer" />
        <div className="mt-4 h-6 w-1/2 rounded bg-bg-deep shimmer" />
        <div className="mt-6 h-24 rounded-2xl bg-bg-deep shimmer" />
      </div>
    </div>
  );
}

export default async function Home() {
  await getRealmStatus();
  const { active, interview } = getActiveInternshipCounts();
  const today = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const realmContent = (
    <>
      <AmbientEmbers />
      <MarketPulseBar />

      <HeroBand />

      <SectionLabel label="TODAY" meta={today} />
      <DailyRitesPanel />

      <SectionLabel
        label="INTERNSHIP HUNT"
        meta={`${active} active${interview > 0 ? ` · ${interview} interview` : ''}`}
      />
      <InternshipPanel />

      <SectionLabel label="HEALTH · WEALTH" />
      <SideBySide>
        <WorkoutPanel />
        <FinancePanel />
      </SideBySide>

      <SectionLabel label="MARKETS" />
      <SideBySide>
        <UnusualOptionsPanel />
        <NewsFeedPanel />
      </SideBySide>

      <SectionLabel label="COUNCIL'S DREAMS" />
      <DreamingSurfaces />

      <SectionLabel label="NEXT ACTION" />
      <div className="mx-12 mb-8">
        <NextActionCard />
      </div>

      <SectionLabel label="SYSTEM PULSE" />
      <SystemPulseStrip />

      <SectionLabel label="TRADING DESK" meta="Thor's 3 paper workers · COUNCIL tab for full pantheon" />
      <TradingAgentsPanel />

      <SectionLabel label="HERMES" />
      <div className="mx-12 mb-12 grid grid-cols-1 gap-4 md:grid-cols-2">
        <TriadCostMeter />
        <ActivityRecent limit={8} />
      </div>
    </>
  );

  return <AgenticOsTabs realm={realmContent} />;
}
