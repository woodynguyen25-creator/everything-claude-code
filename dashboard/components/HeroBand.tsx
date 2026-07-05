import Image from 'next/image';
import { getModeContext } from '@/lib/mode';
import AnimatedRaven from '@/components/AnimatedRaven';
import { HeroOrb, HeroPulse } from '@/components/HeroPulse';

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
    <section className="relative min-h-[28rem] overflow-hidden">
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
        <Image src={HERO_IMAGE} alt="" fill className="object-cover" />
      ) : null}

      {/* Base atmospheric gradient — deepened gold bloom at origin point */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,oklch(var(--color-rune-gold)_/_0.22),transparent_40%),radial-gradient(circle_at_78%_24%,oklch(var(--color-ember)_/_0.12),transparent_34%),radial-gradient(circle_at_55%_80%,oklch(var(--color-bifrost)_/_0.08),transparent_38%),linear-gradient(180deg,oklch(var(--color-bg-deep))_0%,oklch(10%_0.01_250)_55%,oklch(8%_0_0)_100%)]" />
      {/* aurora sweep — slow oscillating glow across the hero */}
      <div className="aurora-drift pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_130%_60%_at_50%_0%,oklch(68%_0.16_245_/_0.12),transparent_70%)]" />
      {/* secondary ember warmth from lower-left — depth layer */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-8 -left-16 h-96 w-96 rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, oklch(72% 0.18 50 / 0.18), transparent 65%)' }}
      />
      {/* scanline texture — very faint grid gives depth without banding */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.022]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, oklch(95% 0.01 80 / 0.5) 3px, oklch(95% 0.01 80 / 0.5) 4px)',
          backgroundSize: '100% 4px',
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,oklch(8%_0_0_/_0.42)_48%,oklch(8%_0_0_/_0.85)_100%)]" />

      {/* Perspective grid floor — grounds the hero, echoes the command-deck HUD */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-44 opacity-[0.05] [mask-image:linear-gradient(to_top,black_20%,transparent)]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, oklch(75% 0.13 80) 0 1px, transparent 1px 56px), repeating-linear-gradient(0deg, oklch(75% 0.13 80) 0 1px, transparent 1px 36px)',
          transform: 'perspective(480px) rotateX(58deg) scale(1.7)',
          transformOrigin: 'bottom',
        }}
      />

      {/* Living network orb — the system's "brain"; color = live system state */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/2 hidden h-[30rem] w-[30rem] -translate-y-1/2 opacity-55 lg:block xl:-right-12 xl:h-[34rem] xl:w-[34rem]"
      >
        <HeroOrb />
      </div>

      {/* Live clock + system pulse — top-left, balancing the raven */}
      <div className="absolute left-12 top-10 z-10 hidden sm:block">
        <HeroPulse />
      </div>

      <AnimatedRaven />

      <div className="relative z-10 flex min-h-[28rem] flex-col justify-end px-12 pb-10 pt-12">
        <div className="max-w-4xl">
          {/* Rune inscription label above the greeting */}
          <p
            className="mb-3 font-mono text-[9px] uppercase tracking-[0.3em] text-rune-gold/50"
            style={{ textShadow: '0 0 12px oklch(var(--color-rune-gold) / 0.3)' }}
          >
            AIOS · Command Center
          </p>
          <h1 className="font-display text-[clamp(3rem,2rem+3vw,4.5rem)] leading-[1.08] text-rune-gold [text-shadow:_0_0_40px_oklch(var(--color-rune-gold)_/_0.25)]">
            {greeting}
          </h1>
          {/* Horizontal rune divider line */}
          <div className="mt-5 flex items-center gap-3">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-rune-gold/60" />
            <span className="font-mono text-[8px] tracking-[0.45em] text-rune-gold/35">✦</span>
            <div className="h-px flex-1 bg-gradient-to-r from-rune-gold/40 via-rune-gold/15 to-transparent" />
          </div>
          <blockquote className="mt-4 max-w-3xl text-sm italic leading-6 text-text-secondary">
            &ldquo;{quote.quote}&rdquo;
            <footer className="mt-2 not-italic text-text-muted">— {quote.source}</footer>
          </blockquote>
          <p className="mt-6 font-numeric text-xs text-text-muted">{readableDate}</p>
        </div>
      </div>
    </section>
  );
}
