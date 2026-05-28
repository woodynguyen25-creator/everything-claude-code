import { NextRequest, NextResponse } from 'next/server';
import { getCheckins, getHabitLog, toggleHabit, HABIT_KEYS, type HabitKey } from '@/lib/habits';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
  const habit = req.nextUrl.searchParams.get('habit') as HabitKey | null;

  if (habit) {
    const days = parseInt(req.nextUrl.searchParams.get('days') ?? '91', 10);
    if (!HABIT_KEYS.includes(habit)) {
      return NextResponse.json({ error: 'Invalid habit' }, { status: 400 });
    }
    return NextResponse.json(getHabitLog(habit, isNaN(days) ? 91 : days));
  }

  return NextResponse.json(getCheckins(date));
}

export async function POST(req: NextRequest) {
  let body: { date?: string; habit?: string; completed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { date, habit, completed } = body;
  if (!date || !habit || typeof completed !== 'boolean') {
    return NextResponse.json({ error: 'date, habit, completed required' }, { status: 400 });
  }
  if (!HABIT_KEYS.includes(habit as HabitKey)) {
    return NextResponse.json({ error: 'Invalid habit key' }, { status: 400 });
  }
  const updated = toggleHabit(date, habit as HabitKey, completed);
  return NextResponse.json(updated);
}
