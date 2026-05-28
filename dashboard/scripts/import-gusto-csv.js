'use strict';
// Parses a Gusto payroll export CSV and upserts entries into data/finances.json
// Run: node scripts/import-gusto-csv.js path/to/gusto-export.csv

const fs = require('node:fs');
const path = require('node:path');

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/import-gusto-csv.js <path-to-csv>');
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error('CSV not found:', csvPath);
  process.exit(1);
}

const FINANCES_PATH = path.join(__dirname, '..', 'data', 'finances.json');

function parseNum(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/[$,]/g, '')) || 0;
}

function parseCsv(content) {
  const lines = content.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());

  return lines.slice(1).map((line) => {
    const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
}

// Gusto CSV columns vary — try common names
function extractPaycheck(row) {
  const dateKey = Object.keys(row).find((k) => k.includes('date') || k.includes('pay date'));
  const grossKey = Object.keys(row).find((k) => k.includes('gross'));
  const netKey = Object.keys(row).find((k) => k.includes('net'));

  const rawDate = row[dateKey] ?? '';
  const date = rawDate ? new Date(rawDate).toISOString().slice(0, 10) : null;
  if (!date || date === 'Invalid Date'.slice(0, 10)) return null;

  return {
    date,
    grossPay: parseNum(row[grossKey] ?? '0'),
    netPay: parseNum(row[netKey] ?? '0'),
    employer: 'Gusto',
    notes: '',
  };
}

const csv = fs.readFileSync(csvPath, 'utf-8');
const rows = parseCsv(csv);
const parsed = rows.map(extractPaycheck).filter(Boolean);

if (parsed.length === 0) {
  console.error('No valid paychecks found. Check column names.');
  console.error('Available columns:', Object.keys(parseCsv(csv)[0] ?? {}).join(', '));
  process.exit(1);
}

let finances = { paychecks: [], monthlyBudget: { rent: 0, food: 0, subscriptions: 0, misc: 0 }, accounts: [] };
if (fs.existsSync(FINANCES_PATH)) {
  try { finances = JSON.parse(fs.readFileSync(FINANCES_PATH, 'utf-8')); } catch {}
}

const existing = new Map(finances.paychecks.map((p) => [p.date, p]));
let added = 0, updated = 0;
for (const p of parsed) {
  if (existing.has(p.date)) { existing.set(p.date, { ...existing.get(p.date), ...p }); updated++; }
  else { existing.set(p.date, p); added++; }
}

finances.paychecks = Array.from(existing.values()).sort((a, b) => b.date.localeCompare(a.date));
fs.writeFileSync(FINANCES_PATH, JSON.stringify(finances, null, 2), 'utf-8');
console.log(`Done. Added: ${added}, updated: ${updated}. Total paychecks: ${finances.paychecks.length}`);
