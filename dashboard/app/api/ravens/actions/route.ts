import { NextResponse } from 'next/server';
import { pinAsMemory, saveToSaga } from '@/lib/memory-actions';

export const dynamic = 'force-dynamic';

type ActionBody = {
  kind?: 'pin' | 'save-saga';
  agent?: string;
  query?: string;
  response?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ActionBody;

    if (!body.kind || (body.kind !== 'pin' && body.kind !== 'save-saga')) {
      return NextResponse.json({ error: 'invalid kind — expected "pin" or "save-saga"' }, { status: 400 });
    }

    if (!body.agent || !body.query || !body.response) {
      return NextResponse.json({ error: 'agent, query, and response are required' }, { status: 400 });
    }

    const payload = {
      agent: body.agent,
      query: body.query,
      response: body.response,
    };

    const result = body.kind === 'pin' ? await pinAsMemory(payload) : await saveToSaga(payload);

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 }
    );
  }
}
