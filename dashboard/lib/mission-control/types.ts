export interface AgentActivity {
  slug: string;
  category: 'aios' | 'olympus' | 'trading' | 'ops';
  emoji: string;
  codename: string;
  last_action: string;
  last_action_ts: string;
  provider: 'gemini' | 'cerebras' | 'groq' | 'deepseek' | 'none';
  calls_today: number;
  status: 'active' | 'idle' | 'error';
}
