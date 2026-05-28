import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const VAULT_ROOT =
  process.env.VAULT_ROOT ?? 'C:\\Users\\woody\\Documents\\Command Center';

const readRequestSchema = z.object({
  folder: z
    .string()
    .max(200)
    .refine((v) => !v.includes('..'), { message: 'folder must not contain ..' })
    .refine((v) => !path.isAbsolute(v), { message: 'folder must be relative' })
    .default(''),
  filename: z.string().regex(/^[\w\-. ]+\.md$/, 'filename must match [\\w\\-. ]+\\.md'),
});

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function requireAuth(req: NextRequest): string | null {
  const expected = process.env.ECC_BRIDGE_TOKEN;
  if (!expected) return 'ECC_BRIDGE_TOKEN not configured on server';
  if (req.headers.get('authorization') !== `Bearer ${expected}`) return 'unauthorized';
  return null;
}

export async function GET(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authError },
      { status: 401 }
    );
  }

  const params = {
    folder: req.nextUrl.searchParams.get('folder') ?? '',
    filename: req.nextUrl.searchParams.get('filename') ?? '',
  };

  let parsed: z.infer<typeof readRequestSchema>;
  try {
    parsed = readRequestSchema.parse(params);
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

  const dir = path.join(VAULT_ROOT, parsed.folder);
  const fullPath = path.join(dir, parsed.filename);
  const resolvedRoot = path.resolve(VAULT_ROOT);
  const resolvedFile = path.resolve(fullPath);

  if (!resolvedFile.startsWith(resolvedRoot + path.sep)) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'path resolves outside vault root' },
      { status: 400 }
    );
  }

  try {
    const content = await fs.readFile(resolvedFile, 'utf8');
    const stat = await fs.stat(resolvedFile);
    return NextResponse.json<
      ApiResponse<{ path: string; content: string; size: number; mtime: string }>
    >({
      success: true,
      data: {
        path: resolvedFile,
        content,
        size: stat.size,
        mtime: stat.mtime.toISOString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'read failed';
    const status = message.includes('ENOENT') ? 404 : 500;
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: message },
      { status }
    );
  }
}
