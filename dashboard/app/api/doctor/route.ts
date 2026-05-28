import { NextResponse } from 'next/server';
import { readDoctor } from '@/lib/doctor';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const summary = await readDoctor();
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Doctor data unavailable' },
      { status: 500 }
    );
  }
}
