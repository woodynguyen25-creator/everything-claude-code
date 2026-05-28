import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

type ConversationEntry = {
  agent: string;
  query: string;
  response: string;
};

const dbCache = new Map<string, Database.Database>();

function getDb(agent: string) {
  const key = agent.toLowerCase();
  const existing = dbCache.get(key);
  if (existing) return existing;

  const dir = path.join(process.cwd(), 'data', 'conversations');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(path.join(dir, `${key}.db`));
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      response TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  dbCache.set(key, db);
  return db;
}

export function saveConversation(entry: ConversationEntry) {
  getDb(entry.agent)
    .prepare(`INSERT INTO conversations (query, response) VALUES (?, ?)`)
    .run(entry.query, entry.response);
}
