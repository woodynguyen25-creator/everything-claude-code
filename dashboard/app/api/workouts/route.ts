import { NextRequest, NextResponse } from 'next/server';
import { getWorkoutLog, logWorkout } from '@/lib/workout';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const days = parseInt(req.nextUrl.searchParams.get('days') ?? '90', 10);
  const log = getWorkoutLog(isNaN(days) ? 90 : days);
  return NextResponse.json(
    log.map((e) => ({ date: e.date, completed: Boolean(e.completed), notes: e.notes }))
  );
}

export async function POST(req: NextRequest) {
  let body: { date?: string; completed?: boolean; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { date, completed, notes } = body;
  if (!date || typeof completed !== 'boolean') {
    return NextResponse.json({ error: 'date and completed required' }, { status: 400 });
  }
  const entry = logWorkout(date, completed, notes);
  return NextResponse.json({ date: entry.date, completed: Boolean(entry.completed), notes: entry.notes });
}
