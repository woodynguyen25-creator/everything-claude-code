import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const codexRequestSchema = z.object({
  prompt: z.string().min(1).max(40_000),
  system: z.string().max(20_000).optional(),
  max_tokens: z.number().int().positive().max(8192).default(2048),
  timeout_ms: z.number().int().positive().max(120_000).default(45_000),
});

type CodexRequest = z.infer<typeof codexRequestSchema>;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const CODEX_BIN = process.env.CODEX_BIN ?? 'codex';
const CODEX_ALLOWED = (process.env.CODEX_ENABLED ?? 'true').toLowerCase() !== 'false';

function requireAuth(req: NextRequest): string | null {
  const expected = process.env.ECC_BRIDGE_TOKEN;
  if (!expected) return 'ECC_BRIDGE_TOKEN not configured on server';
  if (req.headers.get('authorization') !== `Bearer ${expected}`) return 'unauthorized';
  return null;
}

interface CodexResult {
  text: string;
  exit_code: number;
  duration_ms: number;
  tokens_in: number;
  tokens_out: number;
}

function runCodex(req: CodexRequest): Promise<CodexResult> {
  return new Promise((resolve, reject) => {
    const args = ['--non-interactive', '--quiet'];
    const child = spawn(CODEX_BIN, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const start = Date.now();
    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
    }, req.timeout_ms);

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`codex spawn failed: ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (killed) {
        return reject(new Error(`codex timed out after ${req.timeout_ms}ms`));
      }
      const exitCode = code ?? -1;
      if (exitCode !== 0) {
        return reject(new Error(`codex exit ${exitCode}: ${stderr.slice(0, 400)}`));
      }
      // Rough token estimate when CLI doesn't report it: 1 token per ~4 chars.
      const tokensIn = Math.ceil((req.prompt.length + (req.system?.length ?? 0)) / 4);
      const tokensOut = Math.ceil(stdout.length / 4);
      resolve({
        text: stdout.trim(),
        exit_code: exitCode,
        duration_ms: Date.now() - start,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
      });
    });

    // Feed prompt on stdin so we never hit ARG_MAX
    const fullPrompt = req.system
      ? `SYSTEM:\n${req.system}\n\nUSER:\n${req.prompt}\n`
      : req.prompt;
    child.stdin?.write(fullPrompt);
    child.stdin?.end();
  });
}

export async function POST(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authError },
      { status: 401 }
    );
  }

  if (!CODEX_ALLOWED) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'codex endpoint disabled via CODEX_ENABLED=false' },
      { status: 503 }
    );
  }

  let body: CodexRequest;
  try {
    const raw: unknown = await req.json();
    body = codexRequestSchema.parse(raw);
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
    const result = await runCodex(body);
    return NextResponse.json<ApiResponse<CodexResult>>({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'codex failed';
    const status = message.includes('timed out') ? 504 : 500;
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: message },
      { status }
    );
  }
}

export async function GET() {
  return NextResponse.json<ApiResponse<{ codex_enabled: boolean; bin: string }>>({
    success: true,
    data: { codex_enabled: CODEX_ALLOWED, bin: CODEX_BIN },
  });
}
