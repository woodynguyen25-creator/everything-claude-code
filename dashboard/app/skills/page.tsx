import Link from 'next/link';
import { getDoctorSignal } from '@/lib/doctor-signal';
import { getTradingCards } from '@/lib/adapters/trading';
import { listTasks } from '@/lib/tasks';
import { readWyrd } from '@/lib/wyrd';
import CommandDeck from '@/components/CommandDeck';

type Realm = {
  name: string;
  slug: string;
  route: string;
  accent: string;
  dotClass: string;
  description: string;
  size: string;
  status: string;
  featured?: boolean;
};

async function buildRealms(): Promise<Realm[]> {
  const [doctor, tradingCards, wyrd] = await Promise.all([getDoctorSignal(), getTradingCards(), readWyrd()]);
  const openTasks = listTasks().filter((task) => task.status !== 'done');
  const luckyDog = wyrd.find((item) => item.id === 'lucky-dog');

  return [
    {
      name: 'Asgard',
      slug: 'asgard',
      route: '/',
      accent: 'text-rune-gold',
      dotClass: 'bg-rune-gold shadow-[0_0_18px_rgba(217,170,88,0.55)]',
      description: 'AIOS command center',
      size: '5 agents',
      status: doctor.headline,
      featured: true,
    },
    {
      name: 'Midgard',
      slug: 'midgard',
      route: '/olympus',
      accent: 'text-ember',
      dotClass: 'bg-ember shadow-[0_0_18px_rgba(235,149,73,0.5)]',
      description: 'Trading and slate',
      size: `${tradingCards.length} signals`,
      status: tradingCards[0]?.headline ?? 'No fates woven yet',
      featured: true,
    },
    {
      name: 'Alfheim',
      slug: 'alfheim',
      route: '/skills/alfheim',
      accent: 'text-text-primary',
      dotClass: 'bg-text-primary shadow-[0_0_18px_rgba(240,236,224,0.45)]',
      description: 'Skills and realms',
      size: '9 realms',
      status: 'Index of the branches',
    },
    {
      name: 'Niflheim',
      slug: 'niflheim',
      route: '/skills/niflheim',
      accent: 'text-bifrost',
      dotClass: 'bg-bifrost shadow-[0_0_18px_rgba(106,189,255,0.5)]',
      description: 'Personal and recovery',
      size: 'v2 surface',
      status: 'Quiet under frost',
    },
    {
      name: 'Vanaheim',
      slug: 'vanaheim',
      route: '/fenrir',
      accent: 'text-emerald',
      dotClass: 'bg-emerald shadow-[0_0_18px_rgba(90,191,135,0.5)]',
      description: 'Lucky Dog craft',
      size: 'design lane',
      status: luckyDog ? `${luckyDog.label} · ${luckyDog.status}` : 'Lucky Dog · paused',
    },
    {
      name: 'Jotunheim',
      slug: 'jotunheim',
      route: '/skills/jotunheim',
      accent: 'text-blood',
      dotClass: 'bg-blood shadow-[0_0_18px_rgba(173,58,58,0.5)]',
      description: 'Risks and threats',
      size: 'watch list',
      status: doctor.nextAction ? 'Storm signs recorded' : 'No giants at the gate',
    },
    {
      name: 'Muspelheim',
      slug: 'muspelheim',
      route: '/skills/muspelheim',
      accent: 'text-fire',
      dotClass: 'bg-fire shadow-[0_0_18px_rgba(224,110,54,0.5)]',
      description: 'Consulting and outward fire',
      size: 'next venture',
      status: 'Embers gathering',
    },
    {
      name: 'Svartalfheim',
      slug: 'svartalfheim',
      route: '/skills/svartalfheim',
      accent: 'text-rune-gold',
      dotClass: 'bg-rune-gold shadow-[0_0_18px_rgba(217,170,88,0.45)]',
      description: 'Infrastructure and tools',
      size: 'MCP + local stack',
      status: 'Forged and ready',
    },
    {
      name: 'Helheim',
      slug: 'helheim',
      route: '/activity',
      accent: 'text-text-secondary',
      dotClass: 'bg-text-secondary shadow-[0_0_18px_rgba(145,140,132,0.35)]',
      description: 'Archive and completed rites',
      size: `${listTasks().filter((task) => task.status === 'done').length} done`,
      status: `${openTasks.length} still above the soil`,
    },
  ];
}

function FeaturedRealm({ realm }: { realm: Realm }) {
  return (
    <Link
      href={realm.route}
      className="group flex flex-col justify-between rounded-xl border border-border-subtle border-l-2 border-l-rune-gold bg-bg-raised p-6 shadow-[inset_0_1px_0_0_oklch(100%_0_0_/_0.06)] transition-all duration-150 hover:border-rune-gold/40 hover:bg-bg-hover"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className={`h-2 w-2 rounded-full ${realm.dotClass}`} />
            <span className={`font-display text-3xl ${realm.accent}`}>{realm.name}</span>
          </div>
          <p className="mt-1.5 text-sm text-text-secondary">{realm.description}</p>
        </div>
        <span className="rounded-full border border-border-subtle px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
          {realm.size}
        </span>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border-subtle pt-3">
        <span className="line-clamp-1 text-xs text-text-muted">{realm.status}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted transition-colors duration-150 group-hover:text-rune-gold">
          Enter →
        </span>
      </div>
    </Link>
  );
}

function DeckRow({ realm }: { realm: Realm }) {
  return (
    <Link
      href={realm.route}
      className="group flex items-center gap-4 rounded-lg border border-border-subtle bg-bg-raised px-4 py-3 shadow-[inset_0_1px_0_0_oklch(100%_0_0_/_0.05)] transition-all duration-150 hover:border-rune-gold/40 hover:bg-bg-hover"
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${realm.dotClass}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2.5">
          <span className={`font-display text-lg leading-tight ${realm.accent}`}>{realm.name}</span>
          <span className="truncate text-[11px] text-text-muted">{realm.description}</span>
        </div>
        <div className="mt-0.5 truncate text-[11px] text-text-muted/70">{realm.status}</div>
      </div>
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">
        {realm.size}
      </span>
      <span className="shrink-0 font-mono text-xs text-text-muted/50 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-rune-gold">
        →
      </span>
    </Link>
  );
}

export default async function SkillsPage() {
  const realms = await buildRealms();
  const featured = realms.filter((realm) => realm.featured);
  const deck = realms.filter((realm) => !realm.featured);

  return (
    <div className="px-6 py-12 sm:px-12">
      <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">SKILLS</div>
      <h1 className="mt-2 font-display text-4xl text-rune-gold">Yggdrasil</h1>
      <p className="mt-3 max-w-2xl text-sm text-text-secondary">
        Nine realms, one deck. Every branch is a door — the two that matter most sit on top.
      </p>

      {/* Featured realms — the dominant modules */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {featured.map((realm) => (
          <FeaturedRealm key={realm.slug} realm={realm} />
        ))}
      </div>

      {/* The deck — dense rows, mono status, mechanical hovers */}
      <div className="mt-4 grid gap-2.5 lg:grid-cols-2">
        {deck.map((realm) => (
          <DeckRow key={realm.slug} realm={realm} />
        ))}
      </div>

      <CommandDeck />
    </div>
  );
}
