import { NextResponse } from 'next/server';
import { spawnSync } from 'node:child_process';

export const dynamic = 'force-dynamic';

type HealthStatus = 'ok' | 'fallback' | 'offline';

type AgentHealth = {
  slug: string;
  status: HealthStatus;
  primaryProvider: string;
  activeProvider: string | null;
};

function claudeCliAvailable(): boolean {
  try {
    const result = spawnSync('where', ['claude'], { timeout: 3000, encoding: 'utf-8', windowsHide: true });
    return result.status === 0 && Boolean(result.stdout?.trim());
  } catch {
    return false;
  }
}

function providerAvailable(provider: string): boolean {
  switch (provider) {
    case 'claude-cli':
      return claudeCliAvailable();
    case 'deepseek':
      return Boolean(process.env.DEEPSEEK_API_KEY);
    case 'gemini':
      return Boolean(process.env.GEMINI_API_KEY);
    case 'cerebras':
      return Boolean(process.env.CEREBRAS_API_KEY);
    case 'groq':
      return Boolean(process.env.GROQ_API_KEY);
    case 'ollama':
      return true; // assume local — no env key required
    default:
      return false;
  }
}

const AGENT_PROVIDERS: Record<string, string[]> = {
  'lebot-james': ['claude-cli', 'cerebras', 'gemini'],
  thor: ['claude-cli', 'cerebras', 'groq', 'gemini'],
  perseus: ['deepseek', 'cerebras', 'groq', 'gemini', 'ollama'],
  fenrir: ['claude-cli', 'cerebras', 'groq', 'gemini'],
  sauron: ['gemini', 'cerebras', 'groq', 'ollama'],
};

export async function GET() {
  const health: AgentHealth[] = Object.entries(AGENT_PROVIDERS).map(([slug, providers]) => {
    const primary = providers[0];
    const activeProvider = providers.find((p) => providerAvailable(p)) ?? null;
    let status: HealthStatus = 'offline';
    if (activeProvider === primary) status = 'ok';
    else if (activeProvider !== null) status = 'fallback';
    return { slug, status, primaryProvider: primary, activeProvider };
  });

  return NextResponse.json(health);
}
