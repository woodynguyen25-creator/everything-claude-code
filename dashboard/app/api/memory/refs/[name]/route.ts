import { NextRequest, NextResponse } from 'next/server';
import { findCrossRefs } from '@/lib/memory';

export const dynamic = 'force-dynamic';

type Ctx = { params: { name: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    return NextResponse.json(await findCrossRefs(params.name));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cross references unavailable' },
      { status: 500 }
    );
  }
}
