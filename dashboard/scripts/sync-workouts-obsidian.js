'use strict';
// Syncs daily habits (workout, read, podcast, apply) → Obsidian Command Center
// Run: node scripts/sync-workouts-obsidian.js

const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

const HABITS_DB = path.join(__dirname, '..', 'data', 'habits.db');
const OUT_DIR = 'C:\\Users\\woody\\Documents\\Command Center\\AIOS';
const WORKOUT_OUT = path.join(OUT_DIR, 'workout-log.md');
const HABITS_OUT = path.join(OUT_DIR, 'daily-habits.md');

if (!fs.existsSync(HABITS_DB)) {
  console.error('habits.db not found at', HABITS_DB);
  process.exit(1);
}

const db = new Database(HABITS_DB, { readonly: true });

const workoutRows = db
  .prepare(`SELECT date, completed FROM habits WHERE habit = 'workout' ORDER BY date DESC LIMIT 365`)
  .all();

let streak = 0;
const today = new Date().toISOString().slice(0, 10);
const cursor = new Date(today);
const doneSet = new Set(workoutRows.filter((row) => row.completed).map((row) => row.date));
for (let i = 0; i < 365; i++) {
  const dateString = cursor.toISOString().slice(0, 10);
  if (doneSet.has(dateString)) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  } else {
    break;
  }
}

const heatmapEntries = workoutRows
  .map((row) => `  - date: ${row.date}\n    value: ${row.completed ? 1 : 0}`)
  .join('\n');

const workoutContent = `---
heatmap:
${heatmapEntries}
---

# Workout Log

**Streak:** ${streak} day${streak !== 1 ? 's' : ''}
**Total logged:** ${workoutRows.length} sessions
**Completed:** ${workoutRows.filter((row) => row.completed).length} sessions
**Last sync:** ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}
`;

const HABIT_KEYS = ['workout', 'read', 'podcast', 'apply'];
const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - 30);
const allRows = db
  .prepare(`SELECT date, habit, completed FROM habits WHERE date >= ? ORDER BY date DESC`)
  .all(cutoff.toISOString().slice(0, 10));
db.close();

const byDate = {};
allRows.forEach(({ date, habit, completed }) => {
  if (!byDate[date]) byDate[date] = {};
  byDate[date][habit] = Boolean(completed);
});

const habitLines = Object.entries(byDate)
  .sort(([a], [b]) => b.localeCompare(a))
  .map(([date, habits]) => {
    const checks = HABIT_KEYS.map((key) => (habits[key] ? '✓' : '○'));
    return `| ${date} | ${checks.join(' | ')} |`;
  })
  .join('\n');

const habitsContent = `# Daily Habits

| Date | Workout | Read | Podcast | Apply |
|------|---------|------|---------|-------|
${habitLines || '| — | — | — | — | — |'}

*Last 30 days · Last sync: ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}*
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(WORKOUT_OUT, workoutContent, 'utf-8');
fs.writeFileSync(HABITS_OUT, habitsContent, 'utf-8');

console.log(`workout-log.md → ${WORKOUT_OUT}`);
console.log(`daily-habits.md → ${HABITS_OUT}`);
console.log(`Streak: ${streak} days | Total: ${workoutRows.filter((row) => row.completed).length} sessions`);
