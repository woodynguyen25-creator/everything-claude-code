import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export type MemoryType = 'user' | 'feedback' | 'project' | 'reference' | 'unknown';
export type MemorySource = 'claude-mem' | 'memory-md' | 'obsidian';

export type Memory = {
  name: string;
  title: string;
  description: string;
  type: MemoryType;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  source: MemorySource;
  bodyPath: string;
  preview: string;
};

type MemoryFilter = {
  types?: MemoryType[];
  sources?: MemorySource[];
  search?: string;
  limit?: number;
  offset?: number;
};

export type MemoryQueryResult = {
  items: Memory[];
  total: number;
  syncedAt: string | null;
  availableSources: MemorySource[];
};

const memoryRoot = path.join(os.homedir(), '.claude', 'projects', 'c--Github-Repos-everything-claude-code', 'memory');
const archiveRoot = path.join(memoryRoot, 'archived');
const memoryIndexPath = path.join(memoryRoot, 'MEMORY.md');

let cache: { at: number; items: Memory[] } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

function invalidateCache() {
  cache = null;
}

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: raw };
  }

  const body = match[2];
  const data: Record<string, unknown> = {};
  let currentNestedKey: string | null = null;
  const nested: Record<string, Record<string, string>> = {};

  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const nestedMatch = line.match(/^([A-Za-z0-9_]+):\s*$/);
    if (nestedMatch) {
      currentNestedKey = nestedMatch[1];
      nested[currentNestedKey] = {};
      continue;
    }

    const childMatch = line.match(/^\s{2,}([A-Za-z0-9_.-]+):\s*(.+)$/);
    if (childMatch && currentNestedKey) {
      nested[currentNestedKey][childMatch[1]] = childMatch[2].trim();
      continue;
    }

    const pair = line.match(/^([A-Za-z0-9_.-]+):\s*(.+)$/);
    if (pair) {
      currentNestedKey = null;
      data[pair[1]] = pair[2].trim();
    }
  }

  for (const [key, value] of Object.entries(nested)) {
    data[key] = value;
  }

  return { data, body };
}

function firstHeading(body: string) {
  const heading = body.split(/\r?\n/).find((line) => /^#\s+/.test(line.trim()));
  return heading ? heading.replace(/^#\s+/, '').trim() : null;
}

function normalizeType(value: unknown): MemoryType {
  const raw = typeof value === 'string' ? value.toLowerCase() : '';
  if (raw === 'user' || raw === 'feedback' || raw === 'project' || raw === 'reference') return raw;
  return 'unknown';
}

async function readPinnedIndex() {
  try {
    const raw = await fs.readFile(memoryIndexPath, 'utf8');
    const lines = raw.split(/\r?\n/);
    const pinned = new Set<string>();
    for (const line of lines) {
      const match = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        pinned.add(match[2].trim());
      }
    }
    return { raw, pinned };
  } catch {
    return { raw: '# Memory Index\n', pinned: new Set<string>() };
  }
}

async function listMemoryFiles(root: string, prefixSource: MemorySource): Promise<Memory[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const { pinned } = await readPinnedIndex();
  const items: Memory[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.md')) continue;
    if (entry.name === 'MEMORY.md' || entry.name === 'MEMORY-HEALTH.md') continue;

    const fullPath = path.join(root, entry.name);
    try {
      const raw = await fs.readFile(fullPath, 'utf8');
      const { data, body } = parseFrontmatter(raw);
      const stat = await fs.stat(fullPath);
      const title = firstHeading(body) || String(data.name || path.basename(entry.name, '.md'));
      const type = normalizeType(
        (data.metadata && typeof data.metadata === 'object' && data.metadata !== null && 'type' in data.metadata
          ? (data.metadata as Record<string, unknown>).type
          : data.type) ?? 'unknown'
      );
      const preview = body.replace(/\s+/g, ' ').trim().slice(0, 180);
      const relative = path.relative(memoryRoot, fullPath).replace(/\\/g, '/');

      items.push({
        name: path.basename(entry.name, '.md'),
        title,
        description: String(data.description || ''),
        type,
        createdAt: stat.birthtime.toISOString(),
        updatedAt: stat.mtime.toISOString(),
        pinned: pinned.has(entry.name),
        source: prefixSource === 'obsidian' ? 'obsidian' : pinned.has(entry.name) ? 'memory-md' : 'claude-mem',
        bodyPath: fullPath,
        preview,
      });
      void relative;
    } catch {
      // Skip malformed memory files for v1.
    }
  }

  return items;
}

async function loadCorpus(): Promise<Memory[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.items;
  }

  const [active, archived] = await Promise.all([
    listMemoryFiles(memoryRoot, 'claude-mem'),
    fs
      .access(archiveRoot)
      .then(() => listMemoryFiles(archiveRoot, 'claude-mem'))
      .catch(() => [] as Memory[]),
  ]);

  const items = [...active, ...archived].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  cache = { at: Date.now(), items };
  return items;
}

export async function listMemories(filter: MemoryFilter = {}): Promise<Memory[]> {
  const items = await loadCorpus();
  let result = items;

  if (filter.types?.length) {
    const typeSet = new Set(filter.types);
    result = result.filter((item) => typeSet.has(item.type));
  }

  if (filter.sources?.length) {
    const sourceSet = new Set(filter.sources);
    result = result.filter((item) => sourceSet.has(item.source));
  }

  if (filter.search?.trim()) {
    const q = filter.search.toLowerCase();
    result = result.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.preview.toLowerCase().includes(q)
      );
    });
  }

  const offset = filter.offset ?? 0;
  const limit = filter.limit ?? 12;
  return result.slice(offset, offset + limit);
}

export async function queryMemories(filter: MemoryFilter = {}): Promise<MemoryQueryResult> {
  const items = await loadCorpus();
  let result = items;

  if (filter.types?.length) {
    const typeSet = new Set(filter.types);
    result = result.filter((item) => typeSet.has(item.type));
  }

  if (filter.sources?.length) {
    const sourceSet = new Set(filter.sources);
    result = result.filter((item) => sourceSet.has(item.source));
  }

  if (filter.search?.trim()) {
    const q = filter.search.toLowerCase();
    result = result.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.preview.toLowerCase().includes(q)
      );
    });
  }

  const offset = filter.offset ?? 0;
  const limit = filter.limit ?? 12;

  return {
    items: result.slice(offset, offset + limit),
    total: result.length,
    syncedAt: cache?.at ? new Date(cache.at).toISOString() : null,
    availableSources: ['claude-mem', 'memory-md'],
  };
}

export async function getMemoryByName(name: string): Promise<Memory & { body: string }> {
  const items = await loadCorpus();
  const memory = items.find((item) => item.name === name);
  if (!memory) {
    throw new Error(`Memory not found: ${name}`);
  }

  const raw = await fs.readFile(memory.bodyPath, 'utf8');
  const { body } = parseFrontmatter(raw);

  return {
    ...memory,
    body,
  };
}

async function writeMemoryIndex(mutator: (raw: string) => string) {
  const { raw } = await readPinnedIndex();
  const next = mutator(raw);
  await fs.writeFile(memoryIndexPath, next, 'utf8');
  invalidateCache();
}

export async function promoteMemory(name: string): Promise<void> {
  const memory = await getMemoryByName(name);
  const fileName = path.basename(memory.bodyPath);

  await writeMemoryIndex((raw) => {
    const already = new RegExp(`\\(${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`).test(raw);
    if (already) {
      return raw
        .split(/\r?\n/)
        .filter((line) => !line.includes(`(${fileName})`))
        .join('\n')
        .trimEnd() + '\n';
    }

    const line = `- [${memory.title}](${fileName}) — ${memory.description || memory.preview}`;
    return `${raw.trimEnd()}\n${line}\n`;
  });
}

export async function archiveMemory(name: string): Promise<void> {
  const memory = await getMemoryByName(name);
  await fs.mkdir(archiveRoot, { recursive: true });
  const target = path.join(archiveRoot, path.basename(memory.bodyPath));
  await fs.rename(memory.bodyPath, target);
  await writeMemoryIndex((raw) =>
    raw
      .split(/\r?\n/)
      .filter((line) => !line.includes(`(${path.basename(memory.bodyPath)})`))
      .join('\n')
      .trimEnd() + '\n'
  );
}

export async function deleteMemory(name: string): Promise<void> {
  const memory = await getMemoryByName(name);
  await fs.rm(memory.bodyPath, { force: true });
  await writeMemoryIndex((raw) =>
    raw
      .split(/\r?\n/)
      .filter((line) => !line.includes(`(${path.basename(memory.bodyPath)})`))
      .join('\n')
      .trimEnd() + '\n'
  );
}

export async function findCrossRefs(name: string): Promise<Memory[]> {
  const items = await loadCorpus();
  const refs: Memory[] = [];

  for (const item of items) {
    try {
      const raw = await fs.readFile(item.bodyPath, 'utf8');
      if (raw.includes(`[[${name}]]`) || raw.includes(`[[${name}.md]]`)) {
        refs.push(item);
      }
    } catch {
      // ignore unreadable
    }
  }

  return refs;
}
