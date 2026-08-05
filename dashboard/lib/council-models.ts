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
    normal: { provider: 'codex-cli', model: 'gpt-5.5', label: 'GPT-5.5 Codex' },
    supercharged: { provider: 'claude-cli', model: 'claude-fable-5', label: 'Claude CLI — Fable 5' },
    godModeLabel: 'Fenrir Unchained',
  },
  sauron: {
    // Re-measured 2026-08-05 (n=5 each): 3.6-flash 5/5 med 1242ms range 1125-1293;
    // 3.5-flash 5/5 med 2026ms but range 1142-24539 — a 20x tail that stalls the
    // council past its own timeout. The earlier "3.6 flaps 403 2/3" note was the
    // SUSPENDED project on the old key, not the model. Back on 3.6.
    normal: { provider: 'gemini', model: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
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
