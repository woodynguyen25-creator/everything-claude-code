import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const MEMORY_DIR =
  process.env.MEMORY_DIR ||
  path.join(os.homedir(), '.claude', 'projects', 'c--Github-Repos-everything-claude-code', 'memory');
const MEMORY_INDEX_PATH = path.join(MEMORY_DIR, 'MEMORY.md');

const OBSIDIAN_VAULT = process.env.OBSIDIAN_VAULT || 'C:\\Users\\woody\\Documents\\Obsidian Vault';
const SAGA_DIR = path.join(OBSIDIAN_VAULT, 'Daily Notes');

export type PinPayload = {
  agent: string;
  query: string;
  response: string;
};

export type ActionResult = {
  ok: boolean;
  path: string;
  message: string;
};

function timestampSlug(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function todayKey(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trim() + '…';
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function readOrEmpty(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return '';
  }
}

export async function pinAsMemory(payload: PinPayload): Promise<ActionResult> {
  const { agent, query, response } = payload;
  const trimmedQuery = query.trim();
  const trimmedResponse = response.trim();

  if (!trimmedQuery || !trimmedResponse) {
    return { ok: false, path: '', message: 'Query and response required to pin.' };
  }

  await ensureDir(MEMORY_DIR);

  const slug = `ravens-${agent}-${timestampSlug()}`;
  const memoryFileName = `${slug}.md`;
  const memoryFilePath = path.join(MEMORY_DIR, memoryFileName);
  const nowIso = new Date().toISOString();

  const titleSummary = truncate(trimmedQuery, 60);
  const indexSummary = truncate(trimmedQuery, 80);

  const frontmatter = `---
name: ${slug}
description: "Ravens conversation with ${agent} — ${titleSummary.replace(/"/g, '\\"')}"
metadata:
  node_type: memory
  type: project
  source: ravens-drawer
  agent: ${agent}
  pinned_at: ${nowIso}
---

`;

  const body = `# ${agent} · ${titleSummary}

**Pinned via Ravens drawer · ${nowIso}**

## Query

${trimmedQuery}

## Response

${trimmedResponse}
`;

  await fs.writeFile(memoryFilePath, frontmatter + body, 'utf8');

  // Append a line to MEMORY.md index (idempotent — only adds if not already present)
  const indexContent = await readOrEmpty(MEMORY_INDEX_PATH);
  const indexLine = `- [Ravens · ${agent} · ${todayKey()}](${memoryFileName}) — ${indexSummary}`;

  if (!indexContent.includes(memoryFileName)) {
    const next = indexContent.endsWith('\n') || indexContent === '' ? indexContent : indexContent + '\n';
    await fs.writeFile(MEMORY_INDEX_PATH, next + indexLine + '\n', 'utf8');
  }

  return {
    ok: true,
    path: memoryFilePath,
    message: `Pinned to ${memoryFileName}`,
  };
}

export async function saveToSaga(payload: PinPayload): Promise<ActionResult> {
  const { agent, query, response } = payload;
  const trimmedQuery = query.trim();
  const trimmedResponse = response.trim();

  if (!trimmedQuery || !trimmedResponse) {
    return { ok: false, path: '', message: 'Query and response required to save.' };
  }

  await ensureDir(SAGA_DIR);

  const dateKey = todayKey();
  const sagaFilePath = path.join(SAGA_DIR, `${dateKey}.md`);

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timeOnly = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const existing = await readOrEmpty(sagaFilePath);

  let prefix = '';
  if (!existing) {
    prefix = `---
date: ${dateKey}
source: saga
---

# ${dateKey}

`;
  }

  const section = `

## Ravens · ${agent} · ${timeOnly}

**Q:** ${trimmedQuery}

**A:**

${trimmedResponse}
`;

  const next = existing ? existing.replace(/\s+$/, '') + '\n' + section + '\n' : prefix + section + '\n';
  await fs.writeFile(sagaFilePath, next, 'utf8');

  return {
    ok: true,
    path: sagaFilePath,
    message: `Saved to Saga · ${dateKey}.md`,
  };
}
