import type { CouncilAgent } from '@/lib/council';

export type CouncilModelMode = 'normal' | 'supercharged';

type CouncilModelConfig = {
  normal: {
    provider: 'claude-cli' | 'codex-cli' | 'deepseek' | 'gemini';
    model: string;
    label: string;
  };
  supercharged: {
    provider: 'claude-cli';
    model: 'claude-fable-5';
    label: string;
  };
  godModeLabel: string;
};

const COUNCIL_MODELS: Record<CouncilAgent, CouncilModelConfig> = {
  'lebot-james': {
    normal: { provider: 'claude-cli', model: 'claude-fable-5', label: 'Claude CLI — Fable 5' },
    supercharged: { provider: 'claude-cli', model: 'claude-fable-5', label: 'Claude CLI — Fable 5' },
    godModeLabel: 'All-Father Mode',
  },
  thor: {
    normal: { provider: 'claude-cli', model: 'claude-sonnet-4-6', label: 'Claude CLI — Sonnet' },
    supercharged: { provider: 'claude-cli', model: 'claude-fable-5', label: 'Claude CLI — Fable 5' },
    godModeLabel: 'Thunder God Mode',
  },
  perseus: {
    normal: { provider: 'deepseek', model: 'deepseek-chat', label: 'DeepSeek — Chat' },
    supercharged: { provider: 'claude-cli', model: 'claude-fable-5', label: 'Claude CLI — Fable 5' },
    godModeLabel: 'Oracle Mode',
  },
  fenrir: {
    // gpt-5.5 400s on ChatGPT-account codex — gpt-5.6-sol is the validated id (2026-08-21)
    normal: { provider: 'codex-cli', model: 'gpt-5.6-sol', label: 'GPT-5.6 Sol' },
    supercharged: { provider: 'claude-cli', model: 'claude-fable-5', label: 'Claude CLI — Fable 5' },
    godModeLabel: 'Fenrir Unchained',
  },
  sauron: {
    // Re-measured 2026-08-05 (n=5 each): 3.6-flash 5/5 med 1242ms range 1125-1293;
    // 3.5-flash 5/5 med 2026ms but range 1142-24539 — a 20x tail that stalls the
    // council past its own timeout. The earlier "3.6 flaps 403 2/3" note was the
    // SUSPENDED project on the old key, not the model. Back on 3.6.
    // SWAPPED OFF free-tier Gemini 2026-08-21: the council benched that path because
    // Google states free-tier input is used for product improvement, and dashboard
    // chats carry the same personal/trading content as council prompts. Haiku on the
    // Claude CLI is $0 marginal on the Max sub and verified-private.
    normal: { provider: 'claude-cli', model: 'claude-haiku-4-5-20251001', label: 'Claude CLI — Haiku 4.5' },
    supercharged: { provider: 'claude-cli', model: 'claude-fable-5', label: 'Claude CLI — Fable 5' },
    godModeLabel: 'The Eye Opens',
  },
};

export function getCouncilModelConfig(agent: CouncilAgent) {
  return COUNCIL_MODELS[agent];
}

export function getCouncilModelLabel(agent: CouncilAgent, mode: CouncilModelMode = 'normal') {
  return COUNCIL_MODELS[agent][mode].label;
}

export function getCouncilGodModeLabel(agent: CouncilAgent) {
  return COUNCIL_MODELS[agent].godModeLabel;
}
