#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const vault = process.env.OBSIDIAN_VAULT || path.join(os.homedir(), 'Documents', 'Obsidian Vault');
const dailyDir = path.join(vault, 'Daily Notes');
const dataDir = path.resolve(__dirname, '../../data');
const statsPath = path.join(dataDir, 'aios-stats.json');
const tasksDbPath = path.join(dataDir, 'tasks.db');
const context = process.env.FORGE_CONTEXT || '';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function listOpenTasks() {
  try {
    const Database = require('better-sqlite3');
    const db = new Database(tasksDbPath, { readonly: true });
    const rows = db.prepare("SELECT title, priority, status FROM tasks WHERE status != 'done' ORDER BY priority DESC, id DESC LIMIT 5").all();
    db.close();
    return rows;
  } catch {
    return [];
  }
}

const stats = readJson(statsPath, null);
const tasks = listOpenTasks();
const topProject = stats?.projects?.sort((a, b) => b.prompts - a.prompts)[0] ?? null;
const dailyFile = path.join(dailyDir, `${todayKey()}.md`);

ensureDir(dailyDir);

const section = `

## Plan Today

**Context gathered:** ${context || 'No extra answers supplied.'}

### Focus
- Protect the day around ${topProject?.name || 'the active Hall'} first.
- Move the highest-friction task before momentum leaks.
- Keep the realm honest: one strong finish beats five half-starts.

### Open Tasks
${tasks.length ? tasks.map((task) => `- [ ] ${task.title} (p${task.priority})`).join('\n') : '- [ ] No open tasks surfaced from the slate.'}
`;

const existing = fs.existsSync(dailyFile) ? fs.readFileSync(dailyFile, 'utf8') : `# ${todayKey()}\n`;
const next = existing.includes('## Plan Today') ? existing : `${existing.trimEnd()}\n${section}\n`;
fs.writeFileSync(dailyFile, next, 'utf8');

console.log(`Plan written to ${dailyFile}`);
