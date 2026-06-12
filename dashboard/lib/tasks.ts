import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from './paths';
import type { PanelSignal } from '@/types/panel-card';

export type Task = {
  id: number;
  title: string;
  status: 'pending' | 'doing' | 'done';
  priority: 1 | 2 | 3;
  createdAt: string;
  updatedAt: string;
};

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  const dir = path.dirname(PATHS.tasksDb);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(PATHS.tasksDb);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','doing','done')),
      priority INTEGER NOT NULL DEFAULT 2 CHECK (priority IN (1,2,3)),
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  const columns = db.prepare(`PRAGMA table_info(tasks)`).all() as Array<{ name: string }>;
  const hasUpdatedAt = columns.some((column) => column.name === 'updatedAt');
  if (!hasUpdatedAt) {
    db.exec(`ALTER TABLE tasks ADD COLUMN updatedAt TEXT`);
    db.exec(`UPDATE tasks SET updatedAt = createdAt WHERE updatedAt IS NULL`);
  }
  return db;
}

export function listTasks(): Task[] {
  return getDb()
    .prepare(
      `SELECT id, title, status, priority, createdAt, COALESCE(updatedAt, createdAt) as updatedAt
       FROM tasks
       ORDER BY status='done', priority DESC, id DESC
       LIMIT 200`
    )
    .all() as Task[];
}

export function createTask(title: string, priority: 1 | 2 | 3 = 2): Task {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('Title required');
  const info = getDb()
    .prepare(`INSERT INTO tasks (title, priority, updatedAt) VALUES (?, ?, datetime('now'))`)
    .run(trimmed, priority);
  return getDb()
    .prepare(`SELECT id, title, status, priority, createdAt, COALESCE(updatedAt, createdAt) as updatedAt FROM tasks WHERE id = ?`)
    .get(info.lastInsertRowid as number) as Task;
}

export function updateTaskStatus(id: number, status: Task['status']): Task | null {
  getDb().prepare(`UPDATE tasks SET status = ?, updatedAt = datetime('now') WHERE id = ?`).run(status, id);
  return (getDb()
    .prepare(`SELECT id, title, status, priority, createdAt, COALESCE(updatedAt, createdAt) as updatedAt FROM tasks WHERE id = ?`)
    .get(id) as Task) ?? null;
}

export function deleteTask(id: number): void {
  getDb().prepare(`DELETE FROM tasks WHERE id = ?`).run(id);
}

export function getOpenCriticalTask(): Task | null {
  return (
    (getDb()
      .prepare(
        `SELECT id, title, status, priority, createdAt, COALESCE(updatedAt, createdAt) as updatedAt
         FROM tasks
         WHERE priority = 3 AND status != 'done'
         ORDER BY updatedAt DESC, id DESC
         LIMIT 1`
      )
      .get() as Task | undefined) ?? null
  );
}

export function getTasksSignal(): PanelSignal {
  const tasks = listTasks();
  const openTasks = tasks.filter((task) => task.status !== 'done');
  const criticalTasks = openTasks.filter((task) => task.priority === 3);
  const topTask = openTasks[0];
  const mostRecent = tasks[0]?.updatedAt ?? new Date().toISOString();

  return {
    freshness: {
      iso: mostRecent,
      staleAfterMs: 7 * 24 * 60 * 60 * 1000,
    },
    isFresh: true,
    headline: `${openTasks.length} open · ${criticalTasks.length} priority`,
    detail: openTasks.length === 0 ? 'The forge is empty.' : `Top: ${topTask?.title ?? 'No task'}`,
    nextAction: topTask
      ? {
          verb: 'Open task',
          href: '/',
          hotness: topTask.priority === 3 ? 3 : 1,
        }
      : null,
    source: {
      kind: 'sqlite',
      path: PATHS.tasksDb,
    },
  };
}

export function listRecentTaskEvents(limit = 4): Array<{ timestamp: string; headline: string }> {
  const tasks = getDb()
    .prepare(
      `SELECT id, title, status, priority, createdAt, COALESCE(updatedAt, createdAt) as updatedAt
       FROM tasks
       ORDER BY updatedAt DESC, id DESC
       LIMIT ?`
    )
    .all(limit) as Task[];

  return tasks.map((task) => {
    const eventType = task.status === 'done' && task.updatedAt !== task.createdAt ? 'completed' : 'updated';
    const createdHeadline = `${task.status === 'done' && task.updatedAt !== task.createdAt ? 'completed' : 'created'} "${task.title}"`;

    return {
      timestamp: eventType === 'completed' ? task.updatedAt : task.createdAt,
      headline: createdHeadline,
    };
  });
}
