import { NextRequest, NextResponse } from 'next/server';
import { queryMemories, type MemorySource, type MemoryType } from '@/lib/memory';

export const dynamic = 'force-dynamic';

function parseList<T extends string>(value: string | null): T[] | undefined {
  if (!value) return undefined;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean) as T[];
}

export async function GET(req: NextRequest) {
  try {
    const types = parseList<MemoryType>(req.nextUrl.searchParams.get('types'));
    const sources = parseList<MemorySource>(req.nextUrl.searchParams.get('sources'));
    const search = req.nextUrl.searchParams.get('q') ?? undefined;
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? '12');
    const offset = Number(req.nextUrl.searchParams.get('offset') ?? '0');

    const result = await queryMemories({
      types,
      sources,
      search,
      limit: Number.isFinite(limit) ? limit : 12,
      offset: Number.isFinite(offset) ? offset : 0,
    });
    return NextResponse.json(result.items, {
      headers: {
        'x-total-count': String(result.total),
        'x-memory-sync': result.syncedAt ?? '',
        'x-memory-sources': result.availableSources.join(','),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Memory list unavailable' },
      { status: 500 }
    );
  }
}
