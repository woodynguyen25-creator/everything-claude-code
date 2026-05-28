import { NextResponse } from 'next/server';
import lebotJames from '@/a2a/agent-cards/lebot-james.json';
import thor from '@/a2a/agent-cards/thor.json';
import perseus from '@/a2a/agent-cards/perseus.json';
import fenrir from '@/a2a/agent-cards/fenrir.json';
import sauron from '@/a2a/agent-cards/sauron.json';

const agents = [lebotJames, thor, perseus, fenrir, sauron];

export async function GET() {
  return NextResponse.json(
    { agents },
    { headers: { 'Content-Type': 'application/json' } }
  );
}
