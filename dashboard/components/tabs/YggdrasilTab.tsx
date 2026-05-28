'use client';

import Link from 'next/link';

const YGGDRASIL_REALMS = [
  { name: 'Asgard', slug: 'asgard', route: '/', accent: 'text-rune-gold', border: 'border-l-rune-gold', bg: 'bg-rune-gold/10', description: 'Command center · 5 agents' },
  { name: 'Alfheim', slug: 'alfheim', route: '/skills/alfheim', accent: 'text-text-primary', border: 'border-l-border-subtle', bg: 'bg-bg-hover', description: 'Skill branches · 9 realms' },
  { name: 'Niflheim', slug: 'niflheim', route: '/skills/niflheim', accent: 'text-bifrost', border: 'border-l-bifrost', bg: 'bg-bifrost/10', description: 'Personal & recovery' },
  { name: 'Midgard', slug: 'midgard', route: '/', accent: 'text-blood', border: 'border-l-blood', bg: 'bg-blood/10', description: 'Builder & craft' },
  { name: 'Muspelheim', slug: 'muspelheim', route: '/skills/muspelheim', accent: 'text-ember', border: 'border-l-ember', bg: 'bg-ember/10', description: 'Fire & offense' },
  { name: 'Jotunheim', slug: 'jotunheim', route: '/skills/jotunheim', accent: 'text-text-secondary', border: 'border-l-border-subtle', bg: 'bg-bg-hover', description: 'Research & lore' },
  { name: 'Vanaheim', slug: 'vanaheim', route: '/trading', accent: 'text-emerald', border: 'border-l-emerald', bg: 'bg-emerald/10', description: 'Health & wealth' },
  { name: 'Svartalfheim', slug: 'svartalfheim', route: '/skills/svartalfheim', accent: 'text-iron', border: 'border-l-iron', bg: 'bg-iron/10', description: 'Automation & DevOps' },
  { name: 'Helheim', slug: 'helheim', route: '/activity', accent: 'text-text-muted', border: 'border-l-border-subtle', bg: 'bg-bg-deep', description: 'Archives & legacy' },
] as const;

export default function YggdrasilTab() {
  return (
    <section className="px-12 py-8">
      <div className="mb-6">
        <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">YGGDRASIL</div>
        <h2 className="mt-2 font-display text-3xl text-text-primary">The Nine Realms</h2>
        <p className="mt-2 text-sm italic text-text-secondary">All skill branches flow from the World Tree. Each realm holds a domain of power.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {YGGDRASIL_REALMS.map((realm) => (
          <Link
            key={realm.slug}
            href={realm.route}
            className={`panel group flex flex-col gap-3 border-l-4 p-5 transition-all duration-200 hover:scale-[1.02] hover:border-rune-gold ${realm.border}`}
          >
            <div className={`self-start rounded px-2 py-1 ${realm.bg}`}>
              <span className={`text-rune text-[9px] font-semibold tracking-[0.25em] uppercase ${realm.accent}`}>
                {realm.name}
              </span>
            </div>
            <p className="flex-1 text-xs leading-5 text-text-secondary">{realm.description}</p>
            <span className={`text-xs font-semibold transition-colors group-hover:text-rune-gold ${realm.accent}`}>
              Enter →
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-6">
        <Link
          href="/skills"
          className="inline-flex rounded border border-border-subtle px-4 py-2 text-xs text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          Open full Yggdrasil map →
        </Link>
      </div>
    </section>
  );
}
