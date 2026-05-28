import { NextResponse } from 'next/server';
import { getTradingCards } from '@/lib/adapters/trading';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cards = await getTradingCards();
    return NextResponse.json({
      cards,
      count: cards.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Trading data unavailable' },
      { status: 500 }
    );
  }
}
