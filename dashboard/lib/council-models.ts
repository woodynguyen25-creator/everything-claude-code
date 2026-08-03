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
    // gemini-3.6-flash was dead here: the old key's project was suspended AND
    // the id flapped 403 (2/3 calls) even on the new key. 3.5-flash went 3/3.
    normal: { provider: 'gemini', model: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
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
