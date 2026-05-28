import { NextResponse } from 'next/server';
import { stopStreamSchema } from '@/lib/chat-schema';
import { abortCouncilStream } from '@/lib/chat-stream';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const parsed = stopStreamSchema.parse(await req.json());
    const ok = abortCouncilStream(parsed.threadId);
    return NextResponse.json({ ok });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Stop failed' }, { status: 400 });
  }
}
