import { NextResponse } from 'next/server';
import lebotJames from '@/a2a/agent-cards/lebot-james.json';
import thor from '@/a2a/agent-cards/thor.json';
import perseus from '@/a2a/agent-cards/perseus.json';
import fenrir from '@/a2a/agent-cards/fenrir.json';
import sauron from '@/a2a/agent-cards/sauron.json';

const cards: Record<string, unknown> = {
  'lebot-james': lebotJames,
  thor,
  perseus,
  fenrir,
  sauron,
};

export async function GET(
  _: Request,
  { params }: { params: { id: string } }
) {
  const card = cards[params.id];
  if (!card) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  return NextResponse.json(card, {
    headers: { 'Content-Type': 'application/json' },
  });
}
