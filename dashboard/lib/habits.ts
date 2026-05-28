import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from './paths';

export const HABIT_KEYS = ['workout', 'read', 'podcast', 'apply'] as const;
export type HabitKey = typeof HABIT_KEYS[number];

export const HABIT_LABELS: Record<HabitKey, string> = {
  workout: 'Work Out',
  read: 'Read',
  podcast: 'Podcast',
  apply: 'Apply',
};

export type DayCheckins = Record<HabitKey, boolean>;

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  const dir = path.dirname(PATHS.habitsDb);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(PATHS.habitsDb);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      habit TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      UNIQUE(date, habit)
    );
  `);
  db.exec(`UPDATE habits SET habit = 'apply' WHERE habit = 'stocks'`);
  return db;
}

function emptyDay(): DayCheckins {
  return { workout: false, read: false, podcast: false, apply: false };
}

export function getTodayCheckins(): DayCheckins {
  const today = new Date().toISOString().slice(0, 10);
  return getCheckins(today);
}

export function getCheckins(date: string): DayCheckins {
  const rows = getDb()
    .prepare(`SELECT habit, completed FROM habits WHERE date = ?`)
    .all(date) as Array<{ habit: string; completed: number }>;
  const result = emptyDay();
  rows.forEach((row) => {
    if (row.habit in result) result[row.habit as HabitKey] = Boolean(row.completed);
  });
  return result;
}

export function toggleHabit(date: string, habit: HabitKey, completed: boolean): DayCheckins {
  getDb()
    .prepare(`
      INSERT INTO habits (date, habit, completed)
      VALUES (?, ?, ?)
      ON CONFLICT(date, habit) DO UPDATE SET completed = excluded.completed
    `)
    .run(date, habit, completed ? 1 : 0);
  return getCheckins(date);
}

export function getHabitLog(habit: HabitKey, days = 91): Array<{ date: string; completed: boolean }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return (
    getDb()
      .prepare(`SELECT date, completed FROM habits WHERE habit = ? AND date >= ? ORDER BY date DESC`)
      .all(habit, cutoff.toISOString().slice(0, 10)) as Array<{ date: string; completed: number }>
  ).map((row) => ({ date: row.date, completed: Boolean(row.completed) }));
}

export function getCompletedCountToday(): number {
  return Object.values(getTodayCheckins()).filter(Boolean).length;
}

export function getWorkoutStreak(): number {
  const entries = getDb()
    .prepare(`SELECT date FROM habits WHERE habit = 'workout' AND completed = 1 ORDER BY date DESC`)
    .all() as Array<{ date: string }>;
  if (entries.length === 0) return 0;
  let streak = 0;
  const cursor = new Date(new Date().toISOString().slice(0, 10));
  for (const { date } of entries) {
    if (date === cursor.toISOString().slice(0, 10)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
