import dynamicImport from 'next/dynamic';
import AmbientEmbers from '@/components/AmbientEmbers';
import CommandTiles from '@/components/CommandTiles';
import HeroBand from '@/components/HeroBand';
import NextActionCard from '@/components/NextActionCard';
import OdysseusGateway from '@/components/OdysseusGateway';
import SectionLabel from '@/components/SectionLabel';
import SideBySide from '@/components/SideBySide';
import SystemPulseStrip from '@/components/SystemPulseStrip';
import DailyRitesPanel from '@/components/DailyRitesPanel';
import { getActiveInternshipCounts } from '@/lib/internships';

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
const OlympusIntelPanel = dynamicImport(() => import('@/components/OlympusIntelPanel'), {
  loading: () => <PanelSkeleton className="mx-12 h-64" />,
});
const TriadCostMeter = dynamicImport(
  () => import('@/components/TriadCostMeter').then((m) => m.TriadCostMeter),
  { ssr: false, loading: () => <PanelSkeleton className="h-40" /> },
);

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

export default function Home() {
  const { active, interview } = getActiveInternshipCounts();
  const today = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <>
      <AmbientEmbers />
      <MarketPulseBar />

      <HeroBand />

      {/* Command surface — what needs me right now */}
      <CommandTiles />

      {/* Odysseus — the AI workspace gateway (every model, on every device) */}
      <OdysseusGateway />

      {/* Personal-life hub */}
      <SectionLabel label="TODAY" meta={today} />
      <div id="today" className="scroll-mt-6">
        <DailyRitesPanel />
      </div>

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

      <SectionLabel label="OLYMPUS INTEL" meta="Live council intelligence" />
      <OlympusIntelPanel />

      <SectionLabel label="NEXT ACTION" />
      <div className="mx-12 mb-8">
        <NextActionCard />
      </div>

      <SectionLabel label="AI SPEND" meta="Council triad · daily metered" />
      <div className="mx-12 mb-8 max-w-xl">
        <TriadCostMeter />
      </div>

      <SectionLabel label="SYSTEM PULSE" />
      <SystemPulseStrip />

      <div className="h-12" />
    </>
  );
}
