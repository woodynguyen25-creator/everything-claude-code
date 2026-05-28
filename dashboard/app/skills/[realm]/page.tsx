import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readAiosStats } from '@/lib/aios-stats';
import { listActivity } from '@/lib/activity';
import { getTradingDetail } from '@/lib/adapters/trading';
import { getDoctorSignal } from '@/lib/doctor-signal';
import { listTasks } from '@/lib/tasks';

type RealmSummary = {
  title: string;
  subtitle: string;
  accent: string;
  signal: string;
  detail: string;
  href: string;
};

async function buildRealmMeta() {
  const [doctor, trading, activity] = await Promise.all([
    getDoctorSignal(),
    getTradingDetail(),
    listActivity({ limit: 20 }),
  ]);
  const stats = readAiosStats();
  const tasks = listTasks();
  const openTasks = tasks.filter((task) => task.status !== 'done');
  const criticalTasks = openTasks.filter((task) => task.priority === 3);

  const meta: Record<string, RealmSummary> = {
    asgard: {
      title: 'Asgard',
      subtitle: 'The high seat of AIOS command, where the All-Father surveys the realm.',
      accent: 'text-rune-gold',
      signal: doctor.headline,
      detail: `${stats?.projects?.[0]?.sessions ?? 0} active sessions · ${activity.length} recent crossings`,
      href: '/',
    },
    alfheim: {
      title: 'Alfheim',
      subtitle: 'The bright branch of indexed skills, references, and living patterns.',
      accent: 'text-text-primary',
      signal: `${stats?.topSkills?.length ?? 0} skills surfaced`,
      detail: stats?.topSkills?.[0] ? `Most used: ${stats.topSkills[0].skill}` : 'The branches wait quietly.',
      href: '/skills',
    },
    niflheim: {
      title: 'Niflheim',
      subtitle: 'A frost-held surface reserved for recovery, health, and personal memory.',
      accent: 'text-bifrost',
      signal: `${criticalTasks.length} critical tasks`,
      detail: criticalTasks.length ? 'The body and the slate both need watching.' : 'Quiet under frost for now.',
      href: '/memory',
    },
    jotunheim: {
      title: 'Jotunheim',
      subtitle: 'Threats, drifts, and rough edges gather here before the next ascent.',
      accent: 'text-blood',
      signal: `${activity.filter((event) => event.kind === 'doctor').length} doctor warnings`,
      detail: doctor.nextAction ? 'Storm signs still linger at the gate.' : 'No giants presently crossing the bridge.',
      href: '/activity',
    },
    muspelheim: {
      title: 'Muspelheim',
      subtitle: 'Consulting fire and outward ambition wait here for the next forging.',
      accent: 'text-fire',
      signal: `${activity.filter((event) => event.kind === 'forge' || event.kind === 'triad').length} forgings logged`,
      detail: 'The outward fire is warm, but still selective.',
      href: '/activity',
    },
    svartalfheim: {
      title: 'Svartalfheim',
      subtitle: 'The under-forges of infrastructure, tooling, MCPs, and hidden mechanisms.',
      accent: 'text-rune-gold',
      signal: `${stats?.mcps?.length ?? 0} MCPs connected`,
      detail: stats?.mcps?.length ? `Latest strip includes ${stats.mcps.slice(0, 3).join(', ')}` : 'The forge is waiting for its next mechanism.',
      href: '/',
    },
  };

  return meta;
}

type Props = {
  params: {
    realm: string;
  };
};

export const dynamic = 'force-dynamic';

export default async function SkillRealmPage({ params }: Props) {
  const meta = await buildRealmMeta();
  const realm = meta[params.realm];
  if (!realm) notFound();

  return (
    <div className="px-12 py-12">
      <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">YGGDRASIL REALM</div>
      <h1 className={`mt-2 font-display text-4xl ${realm.accent}`}>{realm.title}</h1>
      <p className="mt-3 max-w-2xl text-text-secondary">{realm.subtitle}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <article className="panel p-6">
          <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">LIVE SIGNAL</div>
          <div className="mt-3 font-display text-2xl text-text-primary">{realm.signal}</div>
          <p className="mt-4 text-sm text-text-secondary">{realm.detail}</p>
        </article>

        <article className="panel p-6">
          <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">OPEN SURFACE</div>
          <p className="mt-3 text-sm italic text-text-secondary">
            This branch still blooms elsewhere in the realm. Use the direct surface below.
          </p>
          <div className="mt-6">
            <Link
              href={realm.href}
              className="rounded border border-border-subtle px-4 py-2 text-rune text-xs tracking-wider text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
            >
              Open linked surface
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
