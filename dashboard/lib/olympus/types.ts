export interface AgentCallMetadata {
  provider: 'gemini' | 'cerebras' | 'groq' | 'deepseek';
  ts: string; // ISO with -05:00 offset for CT
  input_tokens: number;
  output_tokens: number;
}

export type AgentName =
  | 'zeus'
  | 'poseidon'
  | 'artemis'
  | 'apollo'
  | 'athena'
  | 'ares'
  | 'loki'
  | 'anubis'
  | 'hades'
  | 'hephaestus'
  | 'calliope';

export type DecisionStatus =
  | 'active'
  | 'win'
  | 'loss'
  | 'expired'
  | 'rejected'
  | 'candidate';

export interface Decision {
  decision_id: string;
  ticker: string;
  strike: number;
  right: 'call' | 'put';
  expiry: string;
  conviction: number;
  status: DecisionStatus;
  target_price: number | null;
  stop_price: number | null;
  entry_price: number | null;
  exit_price: number | null;
  approved_at: string | null;
  resolved_at: string | null;
  outcome: 'win' | 'loss' | 'expired' | null;
  realized_pnl: number | null;
  realized_r: number | null;
  council: {
    apollo_bull?: string;
    athena_bear?: string;
    ares_catalyst?: string;
    loki_redteam?: string;
    zeus_macro?: string;
  };
  rationale: string | null;
  resolution_basis?: 'option_price' | 'underlying_price';
  council_metadata?: {
    apollo?: AgentCallMetadata;
    athena?: AgentCallMetadata;
    ares?: AgentCallMetadata;
    loki?: AgentCallMetadata;
    zeus?: AgentCallMetadata;
  };
}

export interface EquityPoint {
  ts: string;
  equity: number;
  event?: 'start' | 'win' | 'loss' | 'expired' | 'snapshot';
  ticker?: string;
  r?: number;
}

export interface EdgeBar {
  win_rate_30d: number;
  avg_r_30d: number;
  trade_count_30d: number;
  win_rate_target: number;
  avg_r_target: number;
  trade_count_target: number;
  edge_bar_hit: boolean;
}

export interface AgentActivity {
  agent: AgentName;
  last_action: string;
  last_action_ts: string;
  calls_today: number;
  provider_last: 'cerebras' | 'gemini' | 'groq' | 'deepseek' | null;
  status: 'active' | 'idle' | 'error';
}

export interface WhaleFlowItem {
  id: string;
  ts: string;
  ticker: string;
  type: 'sweep' | 'block' | 'dark_pool';
  right: 'call' | 'put';
  strike: number;
  expiry: string;
  size: number;
  premium: number;
  side: 'bid' | 'ask' | 'mid';
  notable: boolean;
}

export interface TradingBot {
  slug: string;
  emoji: string;
  name: string;
  daily_pnl: number;
  daily_pnl_pct: number;
  status: 'paper' | 'live' | 'idle' | 'error';
  last_action_ts: string;
  last_action: string;
}

export interface MacroBrief {
  regime: 'risk-on' | 'risk-off' | 'mixed';
  vix: number;
  fomc_distance_days: number;
  key_levels: string[];
  brief: string;
  updated_ts: string;
  author: 'zeus';
}

export interface StrategicAction {
  action_id: string;
  decision_id: string;
  ticker: string;
  owner: string;
  action_type: 'ENTER' | 'EXIT' | 'HOLD' | 'WATCH' | 'RESEARCH';
  description: string;
  dollar_impact_est: number | null;
  timeline: 'now' | 'open' | 'EOD' | 'this_week';
  priority: number;
  completed: boolean;
  ts: string;
}

export interface OlympusState {
  ts: string;
  current_equity: number;
  starting_equity: number;
  total_realized_pnl: number;
  total_unrealized_pnl: number;
  open_positions_count: number;
  edge_bar: EdgeBar;
  equity_curve: EquityPoint[];
  decisions: {
    candidates: Decision[];
    approved: Decision[];
    rejected: Decision[];
    resolved: Decision[];
  };
  agents: AgentActivity[];
  whale_flow?: WhaleFlowItem[];
  trading_bots?: TradingBot[];
  macro_brief?: MacroBrief | null;
  /** Provenance of the macro brief: 'live' from the Droplet, 'sample' = mock fallback (badged in UI). */
  macro_brief_source?: 'live' | 'sample';
  strategic_actions?: StrategicAction[];
  /**
   * Provenance of the equity figures. 'live' = real movement from the Droplet;
   * 'sample' = demo/mock fallback (no live PnL movement or Droplet unreachable).
   * Drives the data-honesty badge on the dashboard so mock equity never reads as real.
   */
  equity_source?: 'live' | 'sample';
}
