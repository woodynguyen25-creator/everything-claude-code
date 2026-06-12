import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '@/lib/paths';

export const INTERNSHIP_STATUSES = [
  'saved',
  'applied',
  'phone-screen',
  'interview',
  'offer',
  'rejected',
  'ghosted',
] as const;

export type InternshipStatus = (typeof INTERNSHIP_STATUSES)[number];

export type Internship = {
  id: number;
  company: string;
  role: string;
  location: string | null;
  status: InternshipStatus;
  appliedDate: string | null;
  deadline: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
  url: string | null;
  notes: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

type InternshipRow = Omit<Internship, 'archived'> & { archived: number };

let db: Database.Database | null = null;

function ensureColumn(database: Database.Database, name: string, definition: string) {
  const columns = database.prepare(`PRAGMA table_info(internships)`).all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === name)) {
    database.exec(`ALTER TABLE internships ADD COLUMN ${name} ${definition}`);
  }
}

function statusPriority(status: InternshipStatus) {
  switch (status) {
    case 'offer':
      return 0;
    case 'interview':
      return 1;
    case 'phone-screen':
      return 2;
    case 'applied':
      return 3;
    case 'saved':
      return 4;
    case 'ghosted':
      return 5;
    case 'rejected':
      return 6;
    default:
      return 9;
  }
}

function mapRow(row: InternshipRow): Internship {
  return {
    ...row,
    archived: Boolean(row.archived),
  };
}

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeStatus(value?: string | null): InternshipStatus {
  return INTERNSHIP_STATUSES.includes(value as InternshipStatus) ? (value as InternshipStatus) : 'saved';
}

function getDb() {
  if (db) return db;
  const dir = path.dirname(PATHS.internshipsDb);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(PATHS.internshipsDb);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS internships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      location TEXT,
      status TEXT NOT NULL DEFAULT 'saved',
      appliedDate TEXT,
      deadline TEXT,
      nextAction TEXT,
      nextActionDate TEXT,
      url TEXT,
      notes TEXT,
      archived INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  ensureColumn(db, 'location', 'TEXT');
  ensureColumn(db, 'appliedDate', 'TEXT');
  ensureColumn(db, 'deadline', 'TEXT');
  ensureColumn(db, 'nextAction', 'TEXT');
  ensureColumn(db, 'nextActionDate', 'TEXT');
  ensureColumn(db, 'url', 'TEXT');
  ensureColumn(db, 'notes', 'TEXT');
  ensureColumn(db, 'archived', 'INTEGER NOT NULL DEFAULT 0');

  return db;
}

export function listInternships(includeArchived = false): Internship[] {
  const rows = getDb()
    .prepare(
      `SELECT id, company, role, location, status, appliedDate, deadline, nextAction, nextActionDate, url, notes, archived, createdAt, updatedAt
       FROM internships
       ${includeArchived ? '' : 'WHERE archived = 0'}
       ORDER BY archived ASC, updatedAt DESC, id DESC
       LIMIT 200`
    )
    .all() as InternshipRow[];

  return rows
    .map(mapRow)
    .sort((a, b) => {
      const priorityDiff = statusPriority(a.status) - statusPriority(b.status);
      if (priorityDiff !== 0) return priorityDiff;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}

export function getInternshipById(id: number): Internship | null {
  const row = getDb()
    .prepare(
      `SELECT id, company, role, location, status, appliedDate, deadline, nextAction, nextActionDate, url, notes, archived, createdAt, updatedAt
       FROM internships
       WHERE id = ?`
    )
    .get(id) as InternshipRow | undefined;
  return row ? mapRow(row) : null;
}

export function createInternship(input: {
  company: string;
  role: string;
  location?: string | null;
  status?: InternshipStatus;
  appliedDate?: string | null;
  deadline?: string | null;
  nextAction?: string | null;
  nextActionDate?: string | null;
  url?: string | null;
  notes?: string | null;
}) {
  const company = input.company.trim();
  const role = input.role.trim();
  if (!company || !role) {
    throw new Error('company and role are required');
  }

  const info = getDb()
    .prepare(
      `INSERT INTO internships (
        company, role, location, status, appliedDate, deadline, nextAction, nextActionDate, url, notes, archived, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))`
    )
    .run(
      company,
      role,
      normalizeText(input.location),
      normalizeStatus(input.status),
      normalizeText(input.appliedDate),
      normalizeText(input.deadline),
      normalizeText(input.nextAction),
      normalizeText(input.nextActionDate),
      normalizeText(input.url),
      normalizeText(input.notes)
    );

  return getInternshipById(Number(info.lastInsertRowid));
}

export function updateInternship(
  id: number,
  patch: Partial<Omit<Internship, 'id' | 'createdAt' | 'updatedAt'>>
) {
  const current = getInternshipById(id);
  if (!current) return null;

  const next = {
    company: patch.company?.trim() || current.company,
    role: patch.role?.trim() || current.role,
    location: patch.location === undefined ? current.location : normalizeText(patch.location),
    status: patch.status ? normalizeStatus(patch.status) : current.status,
    appliedDate: patch.appliedDate === undefined ? current.appliedDate : normalizeText(patch.appliedDate),
    deadline: patch.deadline === undefined ? current.deadline : normalizeText(patch.deadline),
    nextAction: patch.nextAction === undefined ? current.nextAction : normalizeText(patch.nextAction),
    nextActionDate:
      patch.nextActionDate === undefined ? current.nextActionDate : normalizeText(patch.nextActionDate),
    url: patch.url === undefined ? current.url : normalizeText(patch.url),
    notes: patch.notes === undefined ? current.notes : normalizeText(patch.notes),
    archived: typeof patch.archived === 'boolean' ? patch.archived : current.archived,
  };

  getDb()
    .prepare(
      `UPDATE internships
       SET company = ?, role = ?, location = ?, status = ?, appliedDate = ?, deadline = ?, nextAction = ?, nextActionDate = ?, url = ?, notes = ?, archived = ?, updatedAt = datetime('now')
       WHERE id = ?`
    )
    .run(
      next.company,
      next.role,
      next.location,
      next.status,
      next.appliedDate,
      next.deadline,
      next.nextAction,
      next.nextActionDate,
      next.url,
      next.notes,
      next.archived ? 1 : 0,
      id
    );

  return getInternshipById(id);
}

export function deleteInternship(id: number) {
  return updateInternship(id, { status: 'rejected', archived: true });
}

export function getActiveInternshipCounts(): { active: number; interview: number } {
  const rows = getDb()
    .prepare(`SELECT status FROM internships WHERE archived = 0 AND status NOT IN ('rejected', 'ghosted')`)
    .all() as Array<{ status: string }>;

  return {
    active: rows.length,
    interview: rows.filter((row) => row.status === 'interview').length,
  };
}
