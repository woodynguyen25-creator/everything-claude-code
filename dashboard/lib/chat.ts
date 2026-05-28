import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '@/lib/paths';
import type { CouncilAgent } from '@/lib/council';
import type { ChatMessageRecord, ChatRole, ChatThreadRecord, ToolCall } from '@/lib/chat-schema';

let db: Database.Database | null = null;

function nowIso() {
  return new Date().toISOString();
}

function truncateTitle(text: string) {
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > 72 ? `${compact.slice(0, 71).trim()}…` : compact;
}

function compactPreview(text: string | null) {
  if (!text) return null;
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > 120 ? `${compact.slice(0, 119).trim()}…` : compact;
}

function getDb() {
  if (db) return db;
  const dir = path.dirname(PATHS.tasksDb);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(PATHS.tasksDb);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_threads_agent ON chat_threads(agent, updated_at DESC);

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
      content TEXT NOT NULL,
      tool_calls_json TEXT,
      cost_usd REAL DEFAULT 0,
      llm_provider TEXT,
      llm_model TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_thread ON chat_messages(thread_id, created_at);
  `);
  return db;
}

function mapThread(row: {
  id: number;
  agent: CouncilAgent;
  title: string;
  created_at: string;
  updated_at: string;
  preview: string | null;
  last_message_at: string | null;
  message_count: number;
}): ChatThreadRecord {
  return {
    id: row.id,
    agent: row.agent,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    preview: compactPreview(row.preview),
    lastMessageAt: row.last_message_at,
    messageCount: row.message_count ?? 0,
  };
}

function mapMessage(row: {
  id: number;
  thread_id: number;
  role: ChatRole;
  content: string;
  tool_calls_json: string | null;
  cost_usd: number;
  llm_provider: string | null;
  llm_model: string | null;
  created_at: string;
}): ChatMessageRecord {
  return {
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    toolCalls: row.tool_calls_json ? (JSON.parse(row.tool_calls_json) as ToolCall[]) : null,
    costUsd: row.cost_usd ?? 0,
    llmProvider: row.llm_provider,
    llmModel: row.llm_model,
    createdAt: row.created_at,
  };
}

export function listThreads(agent: CouncilAgent, query = '', limit = 20, offset = 0) {
  const db = getDb();
  const like = `%${query.trim()}%`;

  const baseRows = db
    .prepare(
      `
      SELECT
        t.id,
        t.agent,
        t.title,
        t.created_at,
        t.updated_at
      FROM chat_threads t
      WHERE t.agent = ?
        AND (
          ? = ''
          OR t.title LIKE ?
          OR EXISTS (
            SELECT 1
            FROM chat_messages m
            WHERE m.thread_id = t.id
              AND m.content LIKE ?
          )
        )
      ORDER BY t.updated_at DESC, t.id DESC
      LIMIT ? OFFSET ?
      `
    )
    .all(agent, query.trim(), like, like, limit, offset) as Array<{
    id: number;
    agent: CouncilAgent;
    title: string;
    created_at: string;
    updated_at: string;
  }>;

  const totalRow = db
    .prepare(
      `
      SELECT COUNT(*) as total
      FROM chat_threads t
      WHERE t.agent = ?
        AND (
          ? = ''
          OR t.title LIKE ?
          OR EXISTS (
            SELECT 1
            FROM chat_messages m
            WHERE m.thread_id = t.id
              AND m.content LIKE ?
          )
        )
      `
    )
    .get(agent, query.trim(), like, like) as { total: number };

  return {
    items: baseRows.map((row) => {
      const lastMessage = db
        .prepare(
          `
          SELECT content, created_at
          FROM chat_messages
          WHERE thread_id = ?
          ORDER BY created_at DESC, id DESC
          LIMIT 1
          `
        )
        .get(row.id) as { content: string; created_at: string } | undefined;

      const countRow = db
        .prepare(`SELECT COUNT(*) as count FROM chat_messages WHERE thread_id = ?`)
        .get(row.id) as { count: number };

      return mapThread({
        ...row,
        preview: lastMessage?.content ?? null,
        last_message_at: lastMessage?.created_at ?? null,
        message_count: countRow.count,
      });
    }),
    total: totalRow.total,
  };
}

export function createThread(agent: CouncilAgent, title = 'New Council') {
  const db = getDb();
  const createdAt = nowIso();
  const info = db
    .prepare(`INSERT INTO chat_threads (agent, title, created_at, updated_at) VALUES (?, ?, ?, ?)`)
    .run(agent, title, createdAt, createdAt);
  return getThread(Number(info.lastInsertRowid));
}

export function getThread(id: number) {
  const row = getDb()
    .prepare(
      `
      SELECT
        t.id,
        t.agent,
        t.title,
        t.created_at,
        t.updated_at,
        (
          SELECT m.content
          FROM chat_messages m
          WHERE m.thread_id = t.id
          ORDER BY m.created_at DESC, m.id DESC
          LIMIT 1
        ) AS preview,
        (
          SELECT m.created_at
          FROM chat_messages m
          WHERE m.thread_id = t.id
          ORDER BY m.created_at DESC, m.id DESC
          LIMIT 1
        ) AS last_message_at,
        (
          SELECT COUNT(*)
          FROM chat_messages m
          WHERE m.thread_id = t.id
        ) AS message_count
      FROM chat_threads t
      WHERE t.id = ?
      `
    )
    .get(id) as
    | {
        id: number;
        agent: CouncilAgent;
        title: string;
        created_at: string;
        updated_at: string;
        preview: string | null;
        last_message_at: string | null;
        message_count: number;
      }
    | undefined;

  return row ? mapThread(row) : null;
}

export function getLatestThread(agent: CouncilAgent) {
  const { items } = listThreads(agent, '', 1, 0);
  return items[0] ?? null;
}

export function listMessages(threadId: number, limit = 200, offset = 0) {
  const rows = getDb()
    .prepare(
      `
      SELECT id, thread_id, role, content, tool_calls_json, cost_usd, llm_provider, llm_model, created_at
      FROM chat_messages
      WHERE thread_id = ?
      ORDER BY created_at ASC, id ASC
      LIMIT ? OFFSET ?
      `
    )
    .all(threadId, limit, offset) as Array<{
    id: number;
    thread_id: number;
    role: ChatRole;
    content: string;
    tool_calls_json: string | null;
    cost_usd: number;
    llm_provider: string | null;
    llm_model: string | null;
    created_at: string;
  }>;

  return rows.map(mapMessage);
}

export function createMessage(input: {
  threadId: number;
  role: ChatRole;
  content: string;
  toolCalls?: ToolCall[] | null;
  costUsd?: number;
  llmProvider?: string | null;
  llmModel?: string | null;
}) {
  const db = getDb();
  const createdAt = nowIso();
  const info = db
    .prepare(
      `
      INSERT INTO chat_messages (thread_id, role, content, tool_calls_json, cost_usd, llm_provider, llm_model, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      input.threadId,
      input.role,
      input.content,
      input.toolCalls ? JSON.stringify(input.toolCalls) : null,
      input.costUsd ?? 0,
      input.llmProvider ?? null,
      input.llmModel ?? null,
      createdAt
    );

  const hasEarlierUser = (db
    .prepare(`SELECT COUNT(*) as count FROM chat_messages WHERE thread_id = ? AND role = 'user'`)
    .get(input.threadId) as { count: number }).count;

  const nextUpdatedAt = createdAt;
  db.prepare(`UPDATE chat_threads SET updated_at = ? WHERE id = ?`).run(nextUpdatedAt, input.threadId);

  const thread = getThread(input.threadId);
  if (thread && input.role === 'user' && hasEarlierUser === 1 && thread.title === 'New Council') {
    renameThread(input.threadId, truncateTitle(input.content));
  }

  const row = db
    .prepare(
      `
      SELECT id, thread_id, role, content, tool_calls_json, cost_usd, llm_provider, llm_model, created_at
      FROM chat_messages
      WHERE id = ?
      `
    )
    .get(Number(info.lastInsertRowid)) as {
    id: number;
    thread_id: number;
    role: ChatRole;
    content: string;
    tool_calls_json: string | null;
    cost_usd: number;
    llm_provider: string | null;
    llm_model: string | null;
    created_at: string;
  };

  return mapMessage(row);
}

export function renameThread(id: number, title: string) {
  getDb().prepare(`UPDATE chat_threads SET title = ?, updated_at = ? WHERE id = ?`).run(title, nowIso(), id);
  return getThread(id);
}

export function deleteThread(id: number) {
  getDb().prepare(`DELETE FROM chat_threads WHERE id = ?`).run(id);
}

export function listAllThreads(limit = 20) {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT id, agent, title, created_at, updated_at
      FROM chat_threads
      ORDER BY updated_at DESC, id DESC
      LIMIT ?
      `
    )
    .all(limit) as Array<{
    id: number;
    agent: CouncilAgent;
    title: string;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map((row) => {
    const lastMessage = db
      .prepare(
        `
        SELECT content, created_at
        FROM chat_messages
        WHERE thread_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        `
      )
      .get(row.id) as { content: string; created_at: string } | undefined;

    const countRow = db
      .prepare(`SELECT COUNT(*) as count FROM chat_messages WHERE thread_id = ?`)
      .get(row.id) as { count: number };

    return mapThread({
      ...row,
      preview: lastMessage?.content ?? null,
      last_message_at: lastMessage?.created_at ?? null,
      message_count: countRow.count,
    });
  });
}
