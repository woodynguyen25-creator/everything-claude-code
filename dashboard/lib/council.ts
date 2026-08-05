import norseCopy from '@/content/norse-copy.json';
import type { ModeName } from '@/lib/mode';

export const COUNCIL_AGENTS = ['lebot-james', 'thor', 'perseus', 'fenrir', 'sauron'] as const;

export type CouncilAgent = (typeof COUNCIL_AGENTS)[number];
export type CouncilRole = 'planner' | 'critic' | 'bulkExecutor';
export type CouncilProvider = 'claude-cli' | 'codex-cli' | 'deepseek' | 'gemini';

type CouncilConfig = {
  slug: CouncilAgent;
  codename: string;
  title: string;
  accent: 'gold' | 'bifrost' | 'emerald' | 'blood' | 'fire';
  symbol: string;
  accentTextClass: string;
  accentBorderClass: string;
  accentBgClass: string;
  tintGradient: string;
  heroSrc: string;
  sigilSrc: string;
  chain: CouncilRole;
  primaryProvider: CouncilProvider;
  primaryModel: string;
  modelLabel: string;
  summonLabel: string;
  emptyHeading: string;
  thinking: string;
};

const copy = norseCopy as typeof norseCopy;

const CONFIG: Record<CouncilAgent, CouncilConfig> = {
  'lebot-james': {
    slug: 'lebot-james',
    codename: 'LEBOT JAMES',
    title: 'The All-Father',
    accent: 'gold',
    symbol: '👑',
    accentTextClass: 'text-rune-gold',
    accentBorderClass: 'border-l-rune-gold',
    accentBgClass: 'bg-rune-gold text-bg-deep',
    tintGradient: 'radial-gradient(circle at 18% 18%, oklch(var(--color-rune-gold) / 0.08), transparent 45%)',
    heroSrc: '/art/agents/heroes/lebot-james.webp',
    sigilSrc: '/art/agents/sigils/lebot-james.webp',
    chain: 'planner',
    primaryProvider: 'claude-cli',
    primaryModel: 'claude-fable-5',
    modelLabel: 'Claude CLI — Fable 5',
    summonLabel: String(copy.button.summon),
    emptyHeading: 'Speak it, my Lord.',
    thinking: String(copy.loading.agentLebot),
  },
  thor: {
    slug: 'thor',
    codename: 'THOR',
    title: 'Thunder',
    accent: 'bifrost',
    symbol: '⚡',
    accentTextClass: 'text-bifrost',
    accentBorderClass: 'border-l-bifrost',
    accentBgClass: 'bg-bifrost text-bg-deep',
    tintGradient: 'radial-gradient(circle at 22% 20%, oklch(var(--color-bifrost) / 0.08), transparent 48%)',
    heroSrc: '/art/agents/heroes/thor.webp',
    sigilSrc: '/art/agents/sigils/thor.webp',
    chain: 'critic',
    primaryProvider: 'claude-cli',
    primaryModel: 'claude-sonnet-4-6',
    modelLabel: 'Claude CLI — Sonnet',
    summonLabel: String(copy.button.summon),
    emptyHeading: 'Thor strikes',
    thinking: String(copy.loading.agentThor),
  },
  perseus: {
    slug: 'perseus',
    codename: 'PERSEUS',
    title: 'Prince of Parleys',
    accent: 'emerald',
    symbol: '💰',
    accentTextClass: 'text-emerald',
    accentBorderClass: 'border-l-emerald',
    accentBgClass: 'bg-emerald text-bg-deep',
    tintGradient: 'radial-gradient(circle at 22% 20%, oklch(var(--color-perseus-emerald) / 0.08), transparent 48%)',
    heroSrc: '/art/agents/heroes/perseus.webp',
    sigilSrc: '/art/agents/sigils/perseus.webp',
    chain: 'bulkExecutor',
    primaryProvider: 'deepseek',
    primaryModel: 'deepseek-chat',
    modelLabel: 'DeepSeek',
    summonLabel: String(copy.button.summon),
    emptyHeading: 'Perseus reports',
    thinking: String(copy.loading.agentPerseus),
  },
  fenrir: {
    slug: 'fenrir',
    codename: 'FENRIR',
    title: 'Wolf of the Forge',
    accent: 'blood',
    symbol: '🐺',
    accentTextClass: 'text-blood',
    accentBorderClass: 'border-l-blood',
    accentBgClass: 'bg-blood text-text-primary',
    tintGradient: 'radial-gradient(circle at 22% 20%, oklch(var(--color-blood) / 0.08), transparent 48%)',
    heroSrc: '/art/agents/heroes/fenrir.webp',
    sigilSrc: '/art/agents/sigils/fenrir.webp',
    chain: 'critic',
    primaryProvider: 'codex-cli',
    primaryModel: 'gpt-5.5',
    modelLabel: 'GPT-5.5 Codex',
    summonLabel: String(copy.button.summon),
    emptyHeading: 'Fenrir growls',
    thinking: String(copy.loading.agentFenrir),
  },
  sauron: {
    slug: 'sauron',
    codename: 'SAURON',
    title: 'The Eye',
    accent: 'fire',
    symbol: '👁',
    accentTextClass: 'text-fire',
    accentBorderClass: 'border-l-fire',
    accentBgClass: 'bg-fire text-bg-deep',
    tintGradient: 'radial-gradient(circle at 22% 20%, oklch(var(--color-sauron-fire) / 0.08), transparent 48%)',
    heroSrc: '/art/agents/heroes/sauron.webp',
    sigilSrc: '/art/agents/sigils/sauron.webp',
    chain: 'bulkExecutor',
    primaryProvider: 'gemini',
    // 2026-08-05 (n=5): 3.6-flash 5/5 med 1242ms range 1125-1293; 3.5-flash 5/5 but
    // range 1142-24539ms. The 08-02 "3.6 flaps 403" was the suspended project.
    primaryModel: 'gemini-3.6-flash',
    modelLabel: 'Gemini 3.6 Flash',
    summonLabel: String(copy.button.summon),
    emptyHeading: 'Sauron sees',
    thinking: String(copy.loading.agentSauron),
  },
};

export function isCouncilAgent(value: string): value is CouncilAgent {
  return COUNCIL_AGENTS.includes(value as CouncilAgent);
}

export function getCouncilConfig(agent: CouncilAgent): CouncilConfig {
  return CONFIG[agent];
}

export function getCouncilPlaceholder(mode: ModeName) {
  return String(copy.placeholder.ravensQuery[mode]);
}

export function getCouncilCost(agent: CouncilAgent, text: string) {
  const base: Record<CouncilAgent, number> = {
    'lebot-james': 0.12,
    thor: 0.08,
    perseus: 0.06,
    fenrir: 0.08,
    sauron: 0.04,
  };
  const multiplier = Math.min(1.6, 1 + text.length / 800);
  return Number((base[agent] * multiplier).toFixed(2));
}

export function getCouncilRoute(agent: CouncilAgent, threadId?: number | null) {
  return threadId ? `/${agent}/${threadId}` : `/${agent}`;
}

export function getCouncilPrimaryModelLabel(agent: CouncilAgent) {
  return CONFIG[agent].modelLabel;
}
