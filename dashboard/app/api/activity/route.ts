import { NextRequest, NextResponse } from 'next/server';
import { listActivity, type ActivityKind } from '@/lib/activity';

export const dynamic = 'force-dynamic';

function parseKinds(value: string | null): ActivityKind[] | undefined {
  if (!value) return undefined;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean) as ActivityKind[];
}

export async function GET(req: NextRequest) {
  try {
    const kinds = parseKinds(req.nextUrl.searchParams.get('kind'));
    const agent = req.nextUrl.searchParams.get('agent');
    const since = req.nextUrl.searchParams.get('since');
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? '100');

    const items = await listActivity({
      kinds,
      agent: agent || null,
      since,
      limit: Number.isFinite(limit) ? limit : 100,
    });

    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Activity unavailable' },
      { status: 500 }
    );
  }
}
