import { NextRequest, NextResponse } from 'next/server';
import { deleteThread, getThread, renameThread } from '@/lib/chat';
import { renameThreadSchema } from '@/lib/chat-schema';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const thread = getThread(Number(params.id));
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }
  return NextResponse.json(thread);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const parsed = renameThreadSchema.parse(await req.json());
    const thread = renameThread(Number(params.id), parsed.title);
    return NextResponse.json(thread);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Rename failed' }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    deleteThread(Number(params.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Delete failed' }, { status: 500 });
  }
}
