import os from 'node:os';
import path from 'node:path';

// Central path registry — single place to retarget data sources later.
export const PATHS = {
  doctorLastRun: path.join(os.homedir(), '.claude', 'logs', 'aios-doctor', 'last-run.json'),
  doctorSavepoints: path.join(os.homedir(), '.claude', 'logs', 'aios-doctor', 'savepoints'),
  parlayBotRoot: 'C:\\Github Repos\\parlay-bot',
  parlayBotLogs: 'C:\\Github Repos\\parlay-bot\\logs',
  parlayBotData: 'C:\\Github Repos\\parlay-bot\\data',
  parlayBotDb: 'C:\\Github Repos\\parlay-bot\\data\\parlay_bot.db',
  tradingVault: 'C:\\Users\\woody\\Documents\\Obsidian Vault\\TradingView Assistant',
  tradingBriefs: 'C:\\Users\\woody\\Documents\\Command Center\\Trading Assistant\\Briefs',
  tradingViewAssistant: 'C:\\Users\\woody\\TradingView Assistant',
  // Command Center vault (PRIMARY — replaces retired Obsidian vault)
  commandCenterRoot: 'C:\\Users\\woody\\Documents\\Command Center',
  commandCenterAnalysis: 'C:\\Users\\woody\\Documents\\Command Center\\Trading Assistant\\Analysis',
  commandCenterBriefs: 'C:\\Users\\woody\\Documents\\Command Center\\Trading Assistant\\Briefs',
  latestTradingBrief: 'C:\\Users\\woody\\Documents\\Command Center\\Trading Assistant\\Analysis\\latest-trading-brief.md',
  latestOptionsAnalysis: 'C:\\Users\\woody\\Documents\\Command Center\\Trading Assistant\\Analysis\\latest-options-analysis.md',
  latestMorningBrief: 'C:\\Users\\woody\\Documents\\Command Center\\Trading Assistant\\Briefs\\latest-morning-brief.md',
  // Hermes scheduler
  hermesJobs: 'C:\\Users\\woody\\TradingView Assistant\\hermes-jobs.json',
  hermesStatus: 'C:\\Users\\woody\\TradingView Assistant\\hermes-status.json',
  // SQLite database for tasks panel
  tasksDb: path.join(process.cwd(), 'data', 'tasks.db'),
  // SQLite database for workout tracking (legacy — use habitsDb)
  workoutsDb: path.join(process.cwd(), 'data', 'workouts.db'),
  // SQLite database for daily habits (workout / read / podcast / stocks)
  habitsDb: path.join(process.cwd(), 'data', 'habits.db'),
  // JSON data file for finances
  financesJson: path.join(process.cwd(), 'data', 'finances.json'),
  // SQLite database for internship hunt tracking
  internshipsDb: path.join(process.cwd(), 'data', 'internships.db'),
} as const;
