import { NextRequest, NextResponse } from 'next/server';
import { escalateRavens, searchRavens } from '@/lib/ravens';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const text = req.nextUrl.searchParams.get('q') ?? '';
    const forcedAgent = (req.nextUrl.searchParams.get('agent') ?? undefined) as
      | 'lebot-james'
      | 'thor'
      | 'perseus'
      | 'fenrir'
      | 'sauron'
      | undefined;

    return NextResponse.json(searchRavens({ text, forcedAgent }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ravens search unavailable' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { text?: string; agent?: 'lebot-james' | 'thor' | 'perseus' | 'fenrir' | 'sauron' };
  if (!body.text || !body.agent) {
    return NextResponse.json({ error: 'text and agent required' }, { status: 400 });
  }

  const stream = escalateRavens({ text: body.text, forcedAgent: body.agent }, body.agent);
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
