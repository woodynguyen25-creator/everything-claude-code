import { getModeContext } from '@/lib/mode';
import AnimatedRaven from '@/components/AnimatedRaven';

const HERO_VIDEO: string | null = null; // drop /public/hero-loop.webm and set to '/hero-loop.webm'
const HERO_IMAGE: string | null = null; // fallback still image if no video

function greetingFor(mode: 'dawn' | 'day' | 'dusk' | 'night') {
  switch (mode) {
    case 'dawn':
      return 'Good morning, Woody';
    case 'day':
      return 'Good afternoon, Woody';
    case 'dusk':
    case 'night':
    default:
      return 'Good evening, Woody';
  }
}

export default async function HeroBand() {
  const { mode, quote } = await getModeContext();
  const greeting = greetingFor(mode);
  const readableDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(new Date());

  return (
    <section className="relative min-h-[36rem] overflow-hidden">
      {HERO_VIDEO ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          src={HERO_VIDEO}
          poster={HERO_IMAGE ?? undefined}
        />
      ) : HERO_IMAGE ? (
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,oklch(var(--color-rune-gold)_/_0.18),transparent_38%),radial-gradient(circle_at_78%_24%,oklch(var(--color-ember)_/_0.12),transparent_34%),radial-gradient(circle_at_55%_80%,oklch(var(--color-bifrost)_/_0.08),transparent_38%),linear-gradient(180deg,oklch(var(--color-bg-deep))_0%,oklch(10%_0.01_250)_55%,oklch(8%_0_0)_100%)]" />
      {/* aurora sweep — slow oscillating glow across the hero */}
      <div className="aurora-drift pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_120%_60%_at_50%_0%,oklch(68%_0.16_245_/_0.1),transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,oklch(8%_0_0_/_0.42)_48%,oklch(8%_0_0_/_0.85)_100%)]" />

      <AnimatedRaven />

      <div className="relative z-10 flex min-h-[36rem] flex-col justify-end px-12 py-12">
        <div className="max-w-4xl">
          <h1 className="font-display text-[clamp(3rem,2rem+3vw,4.5rem)] leading-[1.08] text-rune-gold">
            {greeting}
          </h1>
          <blockquote className="mt-6 max-w-3xl text-sm italic leading-6 text-text-secondary">
            &ldquo;{quote.quote}&rdquo;
            <footer className="mt-2 not-italic text-text-muted">— {quote.source}</footer>
          </blockquote>
          <p className="mt-6 font-numeric text-xs text-text-muted">{readableDate}</p>
        </div>
      </div>
    </section>
  );
}
