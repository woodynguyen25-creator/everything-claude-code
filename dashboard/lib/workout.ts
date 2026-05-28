import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from './paths';

export type WorkoutEntry = {
  id: number;
  date: string;
  completed: boolean;
  notes: string | null;
  createdAt: string;
};

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  const dir = path.dirname(PATHS.workoutsDb);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(PATHS.workoutsDb);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

export function logWorkout(date: string, completed: boolean, notes?: string): WorkoutEntry {
  const db = getDb();
  db.prepare(`
    INSERT INTO workouts (date, completed, notes)
    VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET completed = excluded.completed, notes = excluded.notes
  `).run(date, completed ? 1 : 0, notes ?? null);
  return db.prepare(`SELECT id, date, completed, notes, createdAt FROM workouts WHERE date = ?`).get(date) as WorkoutEntry;
}

export function getWorkoutLog(days = 90): WorkoutEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return getDb()
    .prepare(`SELECT id, date, completed, notes, createdAt FROM workouts WHERE date >= ? ORDER BY date DESC`)
    .all(cutoffStr) as WorkoutEntry[];
}

export function getTodayWorkout(): WorkoutEntry | null {
  const today = new Date().toISOString().slice(0, 10);
  return (getDb()
    .prepare(`SELECT id, date, completed, notes, createdAt FROM workouts WHERE date = ?`)
    .get(today) as WorkoutEntry | undefined) ?? null;
}

export function getWorkoutStreak(): number {
  const entries = getDb()
    .prepare(`SELECT date, completed FROM workouts WHERE completed = 1 ORDER BY date DESC`)
    .all() as Array<{ date: string; completed: number }>;

  if (entries.length === 0) return 0;

  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  let cursor = new Date(today);

  for (const entry of entries) {
    const entryDate = entry.date;
    const cursorDate = cursor.toISOString().slice(0, 10);
    if (entryDate === cursorDate) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
