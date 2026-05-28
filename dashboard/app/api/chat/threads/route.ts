import { NextRequest, NextResponse } from 'next/server';
import { createThread, listThreads } from '@/lib/chat';
import { isCouncilAgent } from '@/lib/council';
import { createThreadSchema } from '@/lib/chat-schema';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const agent = req.nextUrl.searchParams.get('agent');
    if (!agent) {
      return NextResponse.json({ error: 'agent is required' }, { status: 400 });
    }
    if (!isCouncilAgent(agent)) {
      return NextResponse.json({ error: 'unknown council' }, { status: 404 });
    }
    const q = req.nextUrl.searchParams.get('q') ?? '';
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? '20');
    const offset = Number(req.nextUrl.searchParams.get('offset') ?? '0');
    const result = listThreads(agent, q, limit, offset);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Thread list unavailable' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = createThreadSchema.parse(await req.json());
    const thread = createThread(parsed.agent, parsed.title ?? 'New Council');
    return NextResponse.json(thread);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Thread creation failed' }, { status: 400 });
  }
}
