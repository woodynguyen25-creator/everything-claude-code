import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { spawn, spawnSync } from 'node:child_process';
import { readDoctor } from '@/lib/doctor';
import { getTradingDetail } from '@/lib/adapters/trading';
import { listTasks } from '@/lib/tasks';
import { readWyrd } from '@/lib/wyrd';
import { readPersonaSystemPrompt } from '@/lib/personas';
import { listRecentRavensQueries, saveRavensQuery } from '@/lib/ravens-history';
import { saveConversation } from '@/lib/conversations';

export type AgentName = 'lebot-james' | 'thor' | 'perseus' | 'fenrir' | 'sauron';

export type MemoryResult = {
  id: number;
  title: string;
  type: string;
  preview: string;
  timestamp: string;
};

export type FileResult = {
  path: string;
  preview: string;
};

export type RavensQuery = {
  text: string;
  forcedAgent?: AgentName;
};

export type RavensResults = {
  memories: MemoryResult[];
  files: FileResult[];
  detectedAgent: AgentName;
  preamble: string;
  estimatedCost: Record<AgentName, number>;
  recentQueries: Array<{ id: number; query: string; agent: string | null; createdAt: string }>;
  claudeAvailable: boolean;
};

const memoryDbPath = path.join(process.env.USERPROFILE || '', '.claude-mem', 'claude-mem.db');
const fileRoots = [
  path.join(process.cwd()),
  path.join(process.env.USERPROFILE || '', 'Documents', 'Obsidian Vault'),
  path.join(process.env.USERPROFILE || '', '.claude', 'projects'),
];

const preambles: Record<AgentName, string> = {
  'lebot-james': '👑 The All-Father considers it.',
  thor: "⚡ Thor's eye is on this.",
  perseus: '💰 Perseus consults the books.',
  fenrir: '🐺 Fenrir sniffs the work.',
  sauron: '👁 The Eye turns west.',
};

function resolveClaudeBinary() {
  const explicit = path.join(process.env.USERPROFILE || '', '.local', 'bin', 'claude.exe');
  if (fs.existsSync(explicit)) return explicit;

  const result = spawnSync('where', ['claude'], {
    shell: true,
    encoding: 'utf8',
    timeout: 4000,
  });
  if (result.status === 0) {
    const first = result.stdout.split(/\r?\n/).find(Boolean);
    if (first) return first.trim();
  }

  return 'claude';
}

function looksResearchy(query: string) {
  const q = query.toLowerCase();
  return ['find', 'latest', 'compare', 'research', 'news', 'what\'s happening'].some((keyword) => q.includes(keyword));
}

function isClaudeAvailable() {
  const result = spawnSync(resolveClaudeBinary(), ['--version'], {
    timeout: 4000,
    encoding: 'utf8',
  });
  return result.status === 0;
}

function scoreAgent(query: string): AgentName {
  const q = query.toLowerCase();
  const scores: Record<AgentName, number> = {
    'lebot-james': 0,
    thor: 0,
    perseus: 0,
    fenrir: 0,
    sauron: 0,
  };

  for (const keyword of ['trade', 'stock', 'option', 'ticker', 'spy', 'nvda', 'entry', 'stop', 'earnings', 'market']) {
    if (q.includes(keyword)) scores.thor += 2;
  }
  for (const keyword of ['parlay', 'slate', 'dfs', 'prop', 'vig', 'kelly', 'sportsbook']) {
    if (q.includes(keyword)) scores.perseus += 2;
  }
  for (const keyword of ['lucky dog', 'landing', 'css', 'design', 'component', 'animation', 'figma', 'tailwind', 'hero']) {
    if (q.includes(keyword)) scores.fenrir += 2;
  }
  for (const keyword of ['find me', 'what\'s happening', 'latest', 'compare', 'competitor', 'research', 'news']) {
    if (q.includes(keyword)) scores.sauron += 2;
  }

  let best: AgentName = 'lebot-james';
  let bestScore = 0;
  for (const [agent, score] of Object.entries(scores) as Array<[AgentName, number]>) {
    if (score > bestScore) {
      best = agent;
      bestScore = score;
    }
  }

  return best;
}

function estimateCost(query: string, agent: AgentName) {
  const base: Record<AgentName, number> = {
    'lebot-james': 0.12,
    thor: 0.08,
    perseus: 0.06,
    fenrir: 0.08,
    sauron: 0.04,
  };
  const multiplier = Math.min(1.6, 1 + query.length / 800);
  return Number((base[agent] * multiplier).toFixed(2));
}

function searchMemory(query: string, limit = 5): MemoryResult[] {
  if (!fs.existsSync(memoryDbPath) || !query.trim()) return [];

  const db = new Database(memoryDbPath, { readonly: true });
  try {
    const rows = db
      .prepare(
        `SELECT o.id, COALESCE(o.title, '[untitled]') as title, COALESCE(o.type, 'memory') as type,
                COALESCE(o.narrative, o.text, '') as preview, o.created_at as timestamp
         FROM observations_fts f
         JOIN observations o ON o.id = f.rowid
         WHERE observations_fts MATCH ?
         ORDER BY rank
         LIMIT ?`
      )
      .all(query, limit) as Array<{ id: number; title: string; type: string; preview: string; timestamp: string }>;

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      preview: row.preview.slice(0, 180),
      timestamp: row.timestamp,
    }));
  } catch {
    return [];
  } finally {
    db.close();
  }
}

function searchFiles(query: string, limit = 3): FileResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results: FileResult[] = [];

  function visit(root: string) {
    if (!fs.existsSync(root) || results.length >= limit) return;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (results.length >= limit) return;
      const fullPath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.git', '.next'].includes(entry.name)) continue;
        visit(fullPath);
        continue;
      }
      if (!/\.(md|ts|tsx|json|txt|py|js)$/i.test(entry.name)) continue;
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const haystack = `${entry.name}\n${content.slice(0, 4000)}`.toLowerCase();
        if (haystack.includes(q)) {
          results.push({
            path: fullPath,
            preview: content.replace(/\s+/g, ' ').slice(0, 160),
          });
        }
      } catch {
        // Ignore unreadable files.
      }
    }
  }

  for (const root of fileRoots) {
    visit(root);
    if (results.length >= limit) break;
  }

  return results.slice(0, limit);
}

export function searchRavens(input: RavensQuery): RavensResults {
  const detectedAgent = input.forcedAgent ?? scoreAgent(input.text);
  const memories = searchMemory(input.text, 5);
  const files = searchFiles(input.text, 3);
  if (input.text.trim()) {
    saveRavensQuery(input.text, input.forcedAgent ?? detectedAgent);
  }

  return {
    memories,
    files,
    detectedAgent,
    preamble: preambles[detectedAgent],
    estimatedCost: {
      'lebot-james': estimateCost(input.text, 'lebot-james'),
      thor: estimateCost(input.text, 'thor'),
      perseus: estimateCost(input.text, 'perseus'),
      fenrir: estimateCost(input.text, 'fenrir'),
      sauron: estimateCost(input.text, 'sauron'),
    },
    recentQueries: listRecentRavensQueries(),
    claudeAvailable: isClaudeAvailable(),
  };
}

export async function buildEscalationPrompt(query: RavensQuery, agent: AgentName) {
  const [doctor, trading, wyrd] = await Promise.all([readDoctor(), getTradingDetail(), readWyrd()]);
  const tasks = listTasks().slice(0, 5);
  const results = searchRavens({ text: query.text, forcedAgent: agent });
  const systemPrompt = await readPersonaSystemPrompt(agent);

  const userPrompt = [
    `User query: ${query.text}`,
    '',
    'Current dashboard context:',
    JSON.stringify(
      {
        doctor,
        tradingCards: trading.cards,
        tasks,
        wyrd,
        memoryMatches: results.memories,
        fileMatches: results.files,
      },
      null,
      2
    ),
    '',
    'Answer as the selected agent. Be concise and useful.',
  ].join('\n');

  return { systemPrompt, userPrompt };
}

export function escalateRavens(query: RavensQuery, agent: AgentName): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const { systemPrompt, userPrompt } = await buildEscalationPrompt(query, agent);
        let responseBuffer = '';
        const child = spawn(
          resolveClaudeBinary(),
          ['-p', '--output-format', 'text', '--append-system-prompt', systemPrompt, userPrompt],
          {
            cwd: process.cwd(),
            shell: false,
            stdio: ['ignore', 'pipe', 'pipe'],
          }
        );

        child.stdout.on('data', (chunk) => {
          const text = chunk.toString();
          responseBuffer += text;
          controller.enqueue(encoder.encode(text));
        });
        child.stderr.on('data', (chunk) => controller.enqueue(encoder.encode(`\n[stderr] ${chunk.toString()}`)));
        child.on('close', () => {
          if (responseBuffer.trim()) {
            saveConversation({
              agent,
              query: query.text,
              response: responseBuffer.trim(),
            });
          }
          controller.close();
        });
        child.on('error', (error) => {
          controller.enqueue(encoder.encode(`\n[error] ${error.message}`));
          controller.close();
        });
      } catch (error) {
        controller.enqueue(encoder.encode(`\n[error] ${error instanceof Error ? error.message : 'Failed to escalate'}`));
        controller.close();
      }
    },
  });
}

export { looksResearchy };
