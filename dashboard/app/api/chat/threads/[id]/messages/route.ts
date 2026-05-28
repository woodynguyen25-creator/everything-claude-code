import { NextRequest, NextResponse } from 'next/server';
import { getThread, listMessages } from '@/lib/chat';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const thread = getThread(Number(params.id));
    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const limit = Number(req.nextUrl.searchParams.get('limit') ?? '200');
    const offset = Number(req.nextUrl.searchParams.get('offset') ?? '0');
    const messages = listMessages(thread.id, limit, offset);

    return NextResponse.json({
      thread,
      items: messages,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Messages unavailable' }, { status: 500 });
  }
}
