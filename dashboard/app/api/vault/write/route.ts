import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const VAULT_ROOT =
  process.env.VAULT_ROOT ?? 'C:\\Users\\woody\\Documents\\Command Center';

const writeRequestSchema = z.object({
  folder: z
    .string()
    .min(1)
    .max(200)
    .refine((v) => !v.includes('..'), { message: 'folder must not contain ..' })
    .refine((v) => !path.isAbsolute(v), { message: 'folder must be relative' }),
  filename: z
    .string()
    .regex(/^[\w\-. ]+\.md$/, 'filename must match [\\w\\-. ]+\\.md'),
  content: z.string().min(1).max(200_000),
  mode: z.enum(['create', 'overwrite', 'append']).default('create'),
});

type WriteRequest = z.infer<typeof writeRequestSchema>;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function requireAuth(req: NextRequest): string | null {
  const expected = process.env.ECC_BRIDGE_TOKEN;
  if (!expected) {
    return 'ECC_BRIDGE_TOKEN not configured on server';
  }
  const header = req.headers.get('authorization');
  if (header !== `Bearer ${expected}`) {
    return 'unauthorized';
  }
  return null;
}

async function writeVaultFile(req: WriteRequest): Promise<string> {
  const dir = path.join(VAULT_ROOT, req.folder);
  const resolvedDir = path.resolve(dir);
  const resolvedRoot = path.resolve(VAULT_ROOT);

  if (!resolvedDir.startsWith(resolvedRoot + path.sep) && resolvedDir !== resolvedRoot) {
    throw new Error('folder resolves outside vault root');
  }

  await fs.mkdir(resolvedDir, { recursive: true });
  const fullPath = path.join(resolvedDir, req.filename);

  if (req.mode === 'create') {
    try {
      await fs.access(fullPath);
      throw new Error('file already exists; use mode=overwrite or mode=append');
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('file already exists')) {
        throw err;
      }
      // ENOENT is what we want — fall through to write
    }
    await fs.writeFile(fullPath, req.content, 'utf8');
  } else if (req.mode === 'overwrite') {
    await fs.writeFile(fullPath, req.content, 'utf8');
  } else {
    await fs.appendFile(fullPath, req.content, 'utf8');
  }

  return fullPath;
}

export async function POST(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authError },
      { status: 401 }
    );
  }

  let body: WriteRequest;
  try {
    const raw: unknown = await req.json();
    body = writeRequestSchema.parse(raw);
  } catch (err: unknown) {
    const message =
      err instanceof z.ZodError
        ? err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        : err instanceof Error
          ? err.message
          : 'invalid request body';
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: message },
      { status: 400 }
    );
  }

  try {
    const fullPath = await writeVaultFile(body);
    return NextResponse.json<ApiResponse<{ path: string; mode: string }>>({
      success: true,
      data: { path: fullPath, mode: body.mode },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'write failed';
    const status = message.includes('already exists') ? 409 : 500;
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: message },
      { status }
    );
  }
}

export async function GET() {
  return NextResponse.json<ApiResponse<{ vault_root: string; endpoints: string[] }>>({
    success: true,
    data: {
      vault_root: VAULT_ROOT,
      endpoints: ['POST /api/vault/write'],
    },
  });
}
