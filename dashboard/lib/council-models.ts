import type { CouncilAgent } from '@/lib/council';

export type CouncilModelMode = 'normal' | 'supercharged';

type CouncilModelConfig = {
  normal: {
    provider: 'claude-cli' | 'deepseek' | 'gemini';
    model: string;
    label: string;
  };
  supercharged: {
    provider: 'claude-cli';
    model: 'claude-opus-4-7';
    label: string;
  };
  godModeLabel: string;
};

const COUNCIL_MODELS: Record<CouncilAgent, CouncilModelConfig> = {
  'lebot-james': {
    normal: { provider: 'claude-cli', model: 'claude-sonnet-4-6', label: 'Claude CLI — Sonnet' },
    supercharged: { provider: 'claude-cli', model: 'claude-opus-4-7', label: 'Claude CLI — Opus' },
    godModeLabel: 'All-Father Mode',
  },
  thor: {
    normal: { provider: 'claude-cli', model: 'claude-sonnet-4-6', label: 'Claude CLI — Sonnet' },
    supercharged: { provider: 'claude-cli', model: 'claude-opus-4-7', label: 'Claude CLI — Opus' },
    godModeLabel: 'Thunder God Mode',
  },
  perseus: {
    normal: { provider: 'deepseek', model: 'deepseek-chat', label: 'DeepSeek — Chat' },
    supercharged: { provider: 'claude-cli', model: 'claude-opus-4-7', label: 'Claude CLI — Opus' },
    godModeLabel: 'Oracle Mode',
  },
  fenrir: {
    normal: { provider: 'claude-cli', model: 'claude-sonnet-4-6', label: 'Claude CLI — Sonnet' },
    supercharged: { provider: 'claude-cli', model: 'claude-opus-4-7', label: 'Claude CLI — Opus' },
    godModeLabel: 'Fenrir Unchained',
  },
  sauron: {
    normal: { provider: 'gemini', model: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    supercharged: { provider: 'claude-cli', model: 'claude-opus-4-7', label: 'Claude CLI — Opus' },
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
