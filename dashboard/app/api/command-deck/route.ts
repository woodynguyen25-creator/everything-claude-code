import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { COMMAND_DECK, findCommandDeckEntry, runCommandDeckEntry } from '@/lib/command-deck';

export const dynamic = 'force-dynamic';

const COMMAND_DECK_ENABLED = (process.env.COMMAND_DECK_ENABLED ?? 'true').toLowerCase() !== 'false';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const runRequestSchema = z.object({
  commandId: z.string().min(1).max(64),
});

export async function GET() {
  return NextResponse.json<ApiResponse<{ enabled: boolean; commands: typeof COMMAND_DECK }>>({
    success: true,
    data: { enabled: COMMAND_DECK_ENABLED, commands: COMMAND_DECK },
  });
}

export async function POST(req: NextRequest) {
  if (!COMMAND_DECK_ENABLED) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: 'Command Deck disabled via COMMAND_DECK_ENABLED=false' },
      { status: 503 }
    );
  }

  let commandId: string;
  try {
    const raw: unknown = await req.json();
    commandId = runRequestSchema.parse(raw).commandId;
  } catch (err: unknown) {
    const message =
      err instanceof z.ZodError
        ? err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        : 'invalid request body';
    return NextResponse.json<ApiResponse<never>>({ success: false, error: message }, { status: 400 });
  }

  // commandId must resolve against the fixed server-side allowlist — no
  // client-supplied prompt text is ever passed to the spawned process.
  const entry = findCommandDeckEntry(commandId);
  if (!entry) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: `Unknown command: ${commandId}` },
      { status: 404 }
    );
  }

  try {
    const result = await runCommandDeckEntry(entry);
    return NextResponse.json<ApiResponse<typeof result>>({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'command deck run failed';
    return NextResponse.json<ApiResponse<never>>({ success: false, error: message }, { status: 500 });
  }
}
