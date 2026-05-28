import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const VAULT_ROOT =
  process.env.VAULT_ROOT ?? 'C:\\Users\\woody\\Documents\\Command Center';

const listRequestSchema = z.object({
  folder: z
    .string()
    .max(200)
    .refine((v) => !v.includes('..'), { message: 'folder must not contain ..' })
    .refine((v) => !path.isAbsolute(v), { message: 'folder must be relative' })
    .default(''),
  glob: z.string().max(80).default('*.md'),
  recursive: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().positive().max(2_000).default(500),
});

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface VaultEntry {
  path: string;
  relativePath: string;
  size: number;
  mtime: string;
}

function requireAuth(req: NextRequest): string | null {
  const expected = process.env.ECC_BRIDGE_TOKEN;
  if (!expected) return 'ECC_BRIDGE_TOKEN not configured on server';
  if (req.headers.get('authorization') !== `Bearer ${expected}`) return 'unauthorized';
  return null;
}

function globToRegex(globPattern: string): RegExp {
  // Conservative glob: only `*` (anything-no-slash) and literal chars.
  const escaped = globPattern
    .split('')
    .map((c) => {
      if (c === '*') return '[^/\\\\]*';
      if ('.+?^${}()|[]\\'.includes(c)) return '\\' + c;
      return c;
    })
    .join('');
  return new RegExp('^' + escaped + '$', 'i');
}

async function walk(
  baseDir: string,
  resolvedRoot: string,
  globRegex: RegExp,
  recursive: boolean,
  limit: number
): Promise<VaultEntry[]> {
  const results: VaultEntry[] = [];
  const queue: string[] = [baseDir];

  while (queue.length && results.length < limit) {
    const dir = queue.shift()!;
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (results.length >= limit) break;
      if (entry.name.startsWith('.')) continue; // skip dot dirs/files
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (recursive) queue.push(full);
        continue;
      }
      if (!globRegex.test(entry.name)) continue;
      const stat = await fs.stat(full);
      results.push({
        path: full,
        relativePath: path.relative(resolvedRoot, full),
        size: stat.size,
        mtime: stat.mtime.toISOString(),
      });
    }
  }

  results.sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
  return results;
}

export async function GET(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authError },
      { status: 401 }
    );
  }

  let parsed: z.infer<typeof listRequestSchema>;
  try {
    parsed = listRequestSchema.parse({
      folder: req.nextUrl.searchParams.get('folder') ?? '',
      glob: req.nextUrl.searchParams.get('glob') ?? '*.md',
      recursive: req.nextUrl.searchParams.get('recursive') ?? false,
      limit: req.nextUrl.searchParams.get('limit') ?? 500,
    });
  } catch (err: unknown) {
    const message =
      err instanceof z.ZodError
        ? err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        : 'invalid query params';
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: message },
      { status: 400 }
    );
  }

  const baseDir = path.join(VAULT_ROOT, parsed.folder);
  const resolvedRoot = path.resolve(VAULT_ROOT);
  const resolvedBase = path.resolve(baseDir);

  if (
    !resolvedBase.startsWith(resolvedRoot + path.sep) &&
    resolvedBase !== resolvedRoot
  ) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'folder resolves outside vault root' },
      { status: 400 }
    );
  }

  try {
    const entries = await walk(
      resolvedBase,
      resolvedRoot,
      globToRegex(parsed.glob),
      parsed.recursive,
      parsed.limit
    );
    return NextResponse.json<ApiResponse<{ vault_root: string; entries: VaultEntry[] }>>({
      success: true,
      data: { vault_root: resolvedRoot, entries },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'list failed';
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
