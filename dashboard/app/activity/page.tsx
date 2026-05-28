import ActivityTimeline from '@/components/ActivityTimeline';

export const dynamic = 'force-dynamic';

export default function ActivityPage() {
  return (
    <div className="px-12 py-12">
      <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">ACTIVITY</div>
      <h1 className="mt-2 font-display text-4xl text-rune-gold">Heimdall&apos;s Watch</h1>
      <p className="mt-3 max-w-2xl text-sm italic text-text-secondary">
        The Watcher Between Worlds. He sees all that crosses the Bifrost.
      </p>
      <ActivityTimeline />
    </div>
  );
}
