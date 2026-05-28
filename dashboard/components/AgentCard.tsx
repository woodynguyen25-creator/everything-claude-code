'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BorderBeam } from '@/components/ui/BorderBeam';

type StatusTone = 'iron' | 'bifrost' | 'ember' | 'blood' | 'emerald' | 'fire';

type HealthStatus = 'ok' | 'fallback' | 'offline' | null;

type AgentCardProps = {
  href: string;
  codename: string;
  persona: string;
  accent: 'gold' | 'blood' | 'bifrost' | 'emerald' | 'fire';
  tone: StatusTone;
  symbol: string;
  imageSrc?: string | null;
  active: boolean;
  healthStatus?: HealthStatus;
};

function toneClasses(tone: StatusTone) {
  switch (tone) {
    case 'bifrost':
      return 'bg-bifrost';
    case 'ember':
      return 'bg-ember';
    case 'blood':
      return 'bg-blood';
    case 'emerald':
      return 'bg-emerald';
    case 'fire':
      return 'bg-fire';
    case 'iron':
    default:
      return 'bg-iron';
  }
}

function accentClasses(accent: AgentCardProps['accent']) {
  switch (accent) {
    case 'blood':
      return { text: 'text-blood', border: 'border-l-blood', hover: 'hover:border-l-blood' };
    case 'bifrost':
      return { text: 'text-bifrost', border: 'border-l-bifrost', hover: 'hover:border-l-bifrost' };
    case 'emerald':
      return { text: 'text-emerald', border: 'border-l-emerald', hover: 'hover:border-l-emerald' };
    case 'fire':
      return { text: 'text-fire', border: 'border-l-fire', hover: 'hover:border-l-fire' };
    case 'gold':
    default:
      return { text: 'text-rune-gold', border: 'border-l-rune-gold', hover: 'hover:border-l-rune-gold' };
  }
}

function healthDotClasses(status: HealthStatus) {
  if (status === 'ok') return 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.6)]';
  if (status === 'fallback') return 'bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.5)]';
  if (status === 'offline') return 'bg-rose-500';
  return null;
}

export default function AgentCard({ href, codename, persona, accent, tone, symbol, imageSrc, active, healthStatus = null }: AgentCardProps) {
  const accents = accentClasses(accent);
  const glowColor =
    accent === 'bifrost'
      ? 'oklch(var(--color-bifrost) / 0.45)'
      : accent === 'emerald'
        ? 'oklch(var(--color-perseus-emerald) / 0.45)'
        : accent === 'blood'
          ? 'oklch(var(--color-blood) / 0.45)'
          : accent === 'fire'
            ? 'oklch(var(--color-sauron-fire) / 0.45)'
            : 'oklch(var(--color-rune-gold) / 0.45)';

  return (
    <Link
      href={href}
      data-agent-card="true"
      className={`group relative block rounded border-l-2 p-3 transition-all duration-200 ease-out active:scale-[0.98] hover:scale-[1.02] ${
        active
          ? `bg-bg-hover ${accents.border}`
          : `border-l-transparent bg-bg-raised opacity-90 hover:bg-bg-hover hover:opacity-100 ${accents.hover}`
      }`}
    >
      {active ? <BorderBeam colorTo={glowColor} /> : null}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-bg-deep text-lg text-text-primary">
          {imageSrc ? (
            <Image src={imageSrc} alt="" width={40} height={40} className="h-10 w-10 object-cover" />
          ) : (
            <span>{symbol}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className={`text-rune text-xs tracking-wider ${active ? 'text-text-primary' : accents.text}`}>{codename}</div>
          <div className="mt-1 text-[11px] text-text-muted">{persona}</div>
        </div>

        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <span className={`h-2 w-2 rounded-full ${toneClasses(active ? 'bifrost' : tone)} ${active ? 'animate-ember-pulse' : 'group-hover:animate-ember-pulse'}`} />
          {healthDotClasses(healthStatus) && (
            <span
              className={`h-1.5 w-1.5 rounded-full ${healthDotClasses(healthStatus)}`}
              title={healthStatus === 'ok' ? 'Provider online' : healthStatus === 'fallback' ? 'Using fallback provider' : 'No provider available'}
            />
          )}
        </div>
      </div>
    </Link>
  );
}
