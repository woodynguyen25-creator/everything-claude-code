import Image from 'next/image';
import Link from 'next/link';
import { getSceneSource } from '@/lib/scenes';
import { getDoctorSignal } from '@/lib/doctor-signal';
import { getTradingCards } from '@/lib/adapters/trading';
import { listTasks } from '@/lib/tasks';
import { readWyrd } from '@/lib/wyrd';

type RealmHotspot = {
  name: string;
  slug: string;
  route: string;
  accent: string;
  dotClass: string;
  x: string;
  y: string;
  description: string;
  size: string;
  status: string;
};

async function buildRealms(): Promise<RealmHotspot[]> {
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
      x: '50%',
      y: '12%',
      description: 'AIOS command center',
      size: '5 agents',
      status: doctor.headline,
    },
    {
      name: 'Alfheim',
      slug: 'alfheim',
      route: '/skills/alfheim',
      accent: 'text-text-primary',
      dotClass: 'bg-text-primary shadow-[0_0_18px_rgba(240,236,224,0.45)]',
      x: '68%',
      y: '20%',
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
      x: '35%',
      y: '22%',
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
      x: '73%',
      y: '36%',
      description: 'Lucky Dog craft',
      size: 'design lane',
      status: luckyDog ? `${luckyDog.label} · ${luckyDog.status}` : 'Lucky Dog · paused',
    },
    {
      name: 'Midgard',
      slug: 'midgard',
      route: '/trading',
      accent: 'text-ember',
      dotClass: 'bg-ember shadow-[0_0_18px_rgba(235,149,73,0.5)]',
      x: '51%',
      y: '42%',
      description: 'Trading and slate',
      size: `${tradingCards.length} signals`,
      status: tradingCards[0]?.headline ?? 'No fates woven yet',
    },
    {
      name: 'Jotunheim',
      slug: 'jotunheim',
      route: '/skills/jotunheim',
      accent: 'text-blood',
      dotClass: 'bg-blood shadow-[0_0_18px_rgba(173,58,58,0.5)]',
      x: '22%',
      y: '41%',
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
      x: '59%',
      y: '63%',
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
      x: '37%',
      y: '67%',
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
      x: '49%',
      y: '83%',
      description: 'Archive and completed rites',
      size: `${listTasks().filter((task) => task.status === 'done').length} done`,
      status: `${openTasks.length} still above the soil`,
    },
  ];
}

export default async function SkillsPage() {
  const scene = getSceneSource('night');
  const realms = await buildRealms();

  if (!scene.exists) {
    return (
      <div className="px-12 py-12">
        <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">SKILLS</div>
        <h1 className="mt-2 font-display text-4xl text-rune-gold">Yggdrasil</h1>
        <p className="mt-3 max-w-2xl text-text-secondary">
          The night tree has not landed yet. Until then, the realms appear as a navigable list beneath the branches.
        </p>
        <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {realms.map((realm) => (
            <Link key={realm.name} href={realm.route} className="panel block p-5 transition-colors hover:bg-bg-hover">
              <div className={`text-lg font-semibold ${realm.accent}`}>{realm.name}</div>
              <div className="mt-1 text-sm italic text-text-secondary">{realm.description}</div>
              <div className="mt-3 text-xs text-text-muted">{realm.status}</div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-12 py-12">
      <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">SKILLS</div>
      <h1 className="mt-2 font-display text-4xl text-rune-gold">Yggdrasil</h1>
      <p className="mt-3 max-w-2xl text-text-secondary">
        Nine branches hold the working realms. Hover the lights to see what stirs beneath each bough.
      </p>

      <div className="relative mt-8 overflow-hidden rounded-lg border border-border-subtle bg-bg-deep">
        <Image src={scene.src} alt="Yggdrasil under the Norse stars" width={1600} height={900} className="h-auto w-full object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/45" />

        {realms.map((realm) => (
          <Link
            key={realm.slug}
            href={realm.route}
            className="group absolute hidden md:block"
            style={{ left: realm.x, top: realm.y, width: '56px', height: '56px', transform: 'translate(-50%, -50%)' }}
          >
            <span className="absolute inset-0 rounded-full" aria-label={realm.name} />
            <span className={`absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-200 group-hover:scale-150 ${realm.dotClass}`} />
            <span className="pointer-events-none absolute left-full top-1/2 ml-4 w-52 origin-left -translate-y-1/2 scale-95 rounded-lg border border-border-subtle bg-bg-panel/95 p-3 opacity-0 shadow-panel transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
              <span className={`block text-base font-semibold ${realm.accent}`}>{realm.name}</span>
              <span className="mt-1 block text-xs italic text-text-secondary">{realm.description}</span>
              <span className="mt-2 block font-mono text-[11px] text-text-muted">{realm.size}</span>
              <span className="mt-2 block text-xs text-text-secondary">{realm.status}</span>
            </span>
          </Link>
        ))}
        <div className="grid gap-3 p-4 md:hidden">
          {realms.map((realm) => (
            <Link key={realm.slug} href={realm.route} className="rounded-lg border border-border-subtle bg-bg-panel/90 p-3 shadow-panel">
              <span className={`block text-base font-semibold ${realm.accent}`}>{realm.name}</span>
              <span className="mt-1 block text-xs italic text-text-secondary">{realm.description}</span>
              <span className="mt-2 block font-mono text-[11px] text-text-muted">{realm.size}</span>
              <span className="mt-2 block text-xs text-text-secondary">{realm.status}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
