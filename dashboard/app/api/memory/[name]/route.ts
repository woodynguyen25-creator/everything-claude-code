import { NextRequest, NextResponse } from 'next/server';
import { archiveMemory, deleteMemory, getMemoryByName, promoteMemory } from '@/lib/memory';

export const dynamic = 'force-dynamic';

type Ctx = { params: { name: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    return NextResponse.json(await getMemoryByName(params.name));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Memory unavailable' },
      { status: 404 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const body = (await req.json()) as { action?: 'promote' | 'archive' };
    if (body.action === 'promote') {
      await promoteMemory(params.name);
    } else if (body.action === 'archive') {
      await archiveMemory(params.name);
    } else {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Memory mutation failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await deleteMemory(params.name);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Memory delete failed' },
      { status: 500 }
    );
  }
}
