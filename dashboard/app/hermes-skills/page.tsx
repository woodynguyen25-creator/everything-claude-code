import fs from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';

interface SkillInfo {
  name: string;
  version: string;
  description: string;
  command: string;
  triggerType: string;
  hasTests: boolean;
  hasReadme: boolean;
  manifestPath: string;
  mtime: string;
}

const SKILL_PATH_CANDIDATES = [
  process.env.HERMES_SKILLS_DIR,
  path.resolve(process.cwd(), 'hetzner', 'skills'),
  '/home/hermes/.hermes/skills',
].filter(Boolean) as string[];

async function findSkillsDir(): Promise<string | null> {
  for (const candidate of SKILL_PATH_CANDIDATES) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) return candidate;
    } catch {
      // try next
    }
  }
  return null;
}

function parseYaml(text: string): Record<string, string | Record<string, string>> {
  const result: Record<string, string | Record<string, string>> = {};
  const lines = text.split('\n');
  let inDescription = false;
  const descLines: string[] = [];
  let currentNested: Record<string, string> | null = null;

  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim() || line.trimStart().startsWith('#')) continue;

    const top = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (top) {
      const [, key, val] = top;
      const value = val.trim();
      if (inDescription) {
        result.description = descLines.join(' ').replace(/\s+/g, ' ').trim();
        descLines.length = 0;
        inDescription = false;
      }
      if (key === 'description' && (value === '' || value.startsWith('>'))) {
        inDescription = true;
        if (value.startsWith('>')) {
          const rest = value.slice(1).trim();
          if (rest) descLines.push(rest);
        }
        continue;
      }
      if (value === '') {
        currentNested = {};
        result[key] = currentNested;
      } else {
        result[key] = value.replace(/^['"]|['"]$/g, '');
        currentNested = null;
      }
      continue;
    }
    const nested = line.match(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (nested && currentNested) {
      currentNested[nested[1]] = nested[2].trim().replace(/^['"]|['"]$/g, '');
      continue;
    }
    if (inDescription) descLines.push(line.trim());
  }
  if (inDescription && descLines.length > 0) {
    result.description = descLines.join(' ').replace(/\s+/g, ' ').trim();
  }
  return result;
}

async function loadSkills(): Promise<{ skills: SkillInfo[]; source: string }> {
  const dir = await findSkillsDir();
  if (!dir) return { skills: [], source: 'no-skills-dir' };
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const skillDirs = entries.filter(
    (e) => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.')
  );

  const skills = await Promise.all(
    skillDirs.map(async (e) => {
      const skillDir = path.join(dir, e.name);
      const manifestPath = path.join(skillDir, 'skill.yaml');
      try {
        const content = await fs.readFile(manifestPath, 'utf8');
        const parsed = parseYaml(content);
        const stat = await fs.stat(manifestPath);
        const trigger = (typeof parsed.trigger === 'object' ? parsed.trigger : {}) as Record<string, string>;
        const dirContents = await fs.readdir(skillDir);
        return {
          name: String(parsed.name ?? e.name),
          version: String(parsed.version ?? '?'),
          description: String(parsed.description ?? '').trim(),
          command: trigger.command ?? '',
          triggerType: trigger.type ?? 'unknown',
          hasTests: dirContents.some((f) => f.startsWith('test_') && f.endsWith('.py')),
          hasReadme: dirContents.includes('README.md'),
          manifestPath,
          mtime: stat.mtime.toISOString(),
        };
      } catch {
        return null;
      }
    })
  );

  return {
    skills: skills.filter((s): s is SkillInfo => s !== null).sort((a, b) => a.name.localeCompare(b.name)),
    source: dir,
  };
}

function categoryFor(skill: SkillInfo): string {
  const n = skill.name;
  if (n.startsWith('aios-')) return 'AIOS Meta';
  if (['triad-router', 'forge', 'think', 'workflow-or-agent'].includes(n)) return 'Orchestration';
  if (['voice-note', 'inbox-classify', 'intake-route', 'morning-brief-status'].includes(n)) return 'Capture & Routing';
  if (['build-skill', 'skill-trim', 'skill-eval', 'codify-workflow'].includes(n)) return 'Skill Meta';
  if (['session-handoff', 'md-ingest'].includes(n)) return 'Knowledge';
  return 'Other';
}

const CATEGORY_ORDER = [
  'Orchestration',
  'AIOS Meta',
  'Capture & Routing',
  'Skill Meta',
  'Knowledge',
  'Other',
];

export default async function HermesSkillsPage() {
  const { skills, source } = await loadSkills();

  const explicitCount = skills.filter((s) => s.triggerType === 'explicit').length;
  const testedCount = skills.filter((s) => s.hasTests).length;

  const grouped = new Map<string, SkillInfo[]>();
  for (const skill of skills) {
    const cat = categoryFor(skill);
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(skill);
  }

  const orderedCategories = CATEGORY_ORDER.filter((c) => grouped.has(c));

  return (
    <div className="min-h-screen bg-bg-deep px-8 py-10 text-text-primary">
      {/* Header */}
      <header className="mb-10 max-w-6xl">
        <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">HERMES · SKILL CATALOG</div>
        <h1 className="font-display mt-1 text-4xl text-text-primary">
          Skills <span className="text-rune-gold">·</span> {skills.length}
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-text-secondary">
          Every Hermes skill installed on the Droplet. Categorized by purpose. Mirror of what
          <code className="mx-1 rounded bg-bg-panel px-1.5 py-0.5 text-xs text-rune-gold">/aios-help</code>
          returns in Telegram.
        </p>
        <div className="mt-4 flex gap-6 text-xs text-text-muted">
          <span>
            <span className="text-text-primary">{explicitCount}</span> explicit commands
          </span>
          <span>
            <span className="text-text-primary">{testedCount}</span> with pytest coverage
          </span>
          <span>
            source <code className="rounded bg-bg-panel px-1.5 py-0.5 text-rune-gold">{source}</code>
          </span>
        </div>
      </header>

      {/* Categories */}
      <main className="mx-auto max-w-6xl space-y-12">
        {skills.length === 0 ? (
          <div className="rounded-xl border border-border-subtle bg-bg-panel/60 p-10 text-center text-text-muted">
            No skills found in any candidate directory. Set{' '}
            <code className="rounded bg-bg-deep px-1.5 py-0.5 text-rune-gold">HERMES_SKILLS_DIR</code> env var.
          </div>
        ) : (
          orderedCategories.map((category) => {
            const items = grouped.get(category)!;
            return (
              <section key={category}>
                <h2 className="font-display mb-4 text-[10px] uppercase tracking-[0.3em] text-text-muted">
                  {category} <span className="text-rune-gold">·</span> {items.length}
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((skill) => (
                    <SkillCard key={skill.name} skill={skill} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>

      {/* Footer */}
      <footer className="mx-auto mt-16 max-w-6xl border-t border-border-subtle pt-6 text-xs text-text-muted">
        <span>v6 · {new Date().toLocaleDateString()}</span>
        <span className="ml-4">
          Telegram equivalent: <code className="rounded bg-bg-panel px-1.5 py-0.5 text-rune-gold">/aios-help</code>
        </span>
      </footer>
    </div>
  );
}

function SkillCard({ skill }: { skill: SkillInfo }) {
  const hasCommand = skill.command !== '';
  const displayName = skill.command || skill.name;

  return (
    <article className="group relative overflow-hidden rounded-xl border border-border-subtle bg-bg-panel/70 p-5 transition-all duration-200 hover:border-rune-gold/30 hover:bg-bg-panel">
      {/* Top edge gold gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rune-gold/30 to-transparent"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-mono text-sm text-rune-gold">
            {hasCommand ? displayName : skill.name}
          </h3>
          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-text-muted">
            <span>v{skill.version}</span>
            <span className="text-white/20">·</span>
            <span className="font-mono">{skill.triggerType}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          {skill.hasTests && (
            <span
              className="rounded-sm bg-emerald-500/10 px-1.5 py-0.5 text-emerald-400"
              title="Has pytest suite"
            >
              ✓ tests
            </span>
          )}
          {skill.hasReadme && (
            <span
              className="rounded-sm bg-bifrost/10 px-1.5 py-0.5 text-bifrost"
              title="Has README"
            >
              README
            </span>
          )}
        </div>
      </div>

      <p className="mt-3 line-clamp-3 text-sm text-text-secondary">
        {skill.description || <span className="text-text-muted italic">No description</span>}
      </p>
    </article>
  );
}
