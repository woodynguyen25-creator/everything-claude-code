import { NextRequest, NextResponse } from 'next/server';
import { getTradingRaw } from '@/lib/adapters/trading';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const kind = req.nextUrl.searchParams.get('kind');
    const file = req.nextUrl.searchParams.get('file');
    const id = req.nextUrl.searchParams.get('id');

    const payload = await getTradingRaw(kind, file, id);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Trading raw payload unavailable' },
      { status: 500 }
    );
  }
}
