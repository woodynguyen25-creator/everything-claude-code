export type ForgeActionSlug =
  | 'morning-brief'
  | 'deep-research'
  | 'plan-today'
  | 'process-inbox'
  | 'weekly-review'
  | 'build-slate'
  | 'design-pass'
  | 'vault-cleanup'
  | 'refresh-metrics'
  | 'run-doctor';

export type ForgeAction = {
  slug: ForgeActionSlug;
  label: string;
  accentClass: string;
  needsInterrogator: boolean;
  agent: 'lebot-james' | 'thor' | 'perseus' | 'fenrir' | 'sauron' | null;
  prompts?: string[];
  description: string;
};

export const FORGE_ACTIONS: ForgeAction[] = [
  {
    slug: 'morning-brief',
    label: 'Morning Brief',
    accentClass: 'border-l-bifrost',
    needsInterrogator: true,
    agent: 'thor',
    prompts: [
      'What part of tomorrow’s market do you care about most?',
      'Are there tickers or themes the brief must prioritize?',
      'What would make this briefing feel genuinely useful by the open?',
    ],
    description: 'Runs the trading brief triad.',
  },
  {
    slug: 'deep-research',
    label: 'Deep Research',
    accentClass: 'border-l-fire',
    needsInterrogator: true,
    agent: 'sauron',
    prompts: [
      'What exactly do you want researched?',
      'What decision will this research help you make?',
      'Do you want quick signal, medium depth, or exhaustive detail?',
    ],
    description: 'Runs the Sauron-led research loop.',
  },
  {
    slug: 'plan-today',
    label: 'Plan Today',
    accentClass: 'border-l-rune-gold',
    needsInterrogator: true,
    agent: 'lebot-james',
    prompts: [
      'What must be true by the end of today?',
      'Which project should dominate the day if tradeoffs appear?',
      'What constraint should the plan respect first: time, energy, or money?',
    ],
    description: 'Drafts today’s plan into the daily note.',
  },
  {
    slug: 'process-inbox',
    label: 'Process Inbox',
    accentClass: 'border-l-emerald',
    needsInterrogator: true,
    agent: 'lebot-james',
    prompts: [
      'Which inbox notes matter right now?',
      'Should notes be routed aggressively or summarized conservatively?',
      'Are there tags or projects to prioritize first?',
    ],
    description: 'Scans Obsidian inbox notes and summarizes routing.',
  },
  {
    slug: 'weekly-review',
    label: 'Weekly Review',
    accentClass: 'border-l-rune-gold',
    needsInterrogator: true,
    agent: 'lebot-james',
    prompts: [
      'What part of the week deserves the hardest truth?',
      'Should the review lean toward trading, building, or life balance?',
      'What would make next week meaningfully better?',
    ],
    description: 'Runs Weekly Wyrd.',
  },
  {
    slug: 'build-slate',
    label: 'Build Slate',
    accentClass: 'border-l-emerald',
    needsInterrogator: true,
    agent: 'perseus',
    prompts: [
      'Which market or slate are we building for?',
      'What risk level should the slate honor?',
      'What would disqualify a play before it reaches the board?',
    ],
    description: 'Runs the slate critic loop.',
  },
  {
    slug: 'design-pass',
    label: 'Design Pass',
    accentClass: 'border-l-blood',
    needsInterrogator: true,
    agent: 'fenrir',
    prompts: [
      'Which Hall or screen needs the pass?',
      'Do you want savage critique, implementation fixes, or both?',
      'What feeling should the final design leave behind?',
    ],
    description: 'Runs the design critique loop.',
  },
  {
    slug: 'vault-cleanup',
    label: 'Vault Cleanup',
    accentClass: 'border-l-fire',
    needsInterrogator: true,
    agent: 'lebot-james',
    prompts: [
      'What kind of mess should this cleanup target first?',
      'Are broken links, duplicates, or stale notes the true pain?',
      'Should cleanup produce a report only, or propose concrete follow-up?',
    ],
    description: 'Scans the Obsidian vault for drift.',
  },
  {
    slug: 'refresh-metrics',
    label: 'Refresh Metrics',
    accentClass: 'border-l-bifrost',
    needsInterrogator: false,
    agent: null,
    description: 'Re-runs renderers and usage pollers.',
  },
  {
    slug: 'run-doctor',
    label: 'Run Doctor',
    accentClass: 'border-l-blood',
    needsInterrogator: false,
    agent: null,
    description: 'Runs the AIOS Doctor wrapper.',
  },
];

export function getForgeAction(slug: string) {
  return FORGE_ACTIONS.find((action) => action.slug === slug) ?? null;
}
