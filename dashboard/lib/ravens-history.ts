import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

type RavensHistoryRow = {
  id: number;
  query: string;
  agent: string | null;
  createdAt: string;
};

let db: Database.Database | null = null;

function getDb() {
  if (db) return db;
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(path.join(dir, 'ravens-history.db'));
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS ravens_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      agent TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

export function saveRavensQuery(query: string, agent?: string | null) {
  const trimmed = query.trim();
  if (!trimmed) return;
  getDb()
    .prepare(`INSERT INTO ravens_history (query, agent) VALUES (?, ?)`)
    .run(trimmed, agent ?? null);
}

export function listRecentRavensQueries(limit = 5): RavensHistoryRow[] {
  return getDb()
    .prepare(`SELECT id, query, agent, createdAt FROM ravens_history ORDER BY id DESC LIMIT ?`)
    .all(limit) as RavensHistoryRow[];
}
