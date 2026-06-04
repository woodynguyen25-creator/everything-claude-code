import { NextResponse } from 'next/server';
import { appendActivityLog } from '@/lib/activity-log';
import { findMember } from '@/lib/council-roster';

export const dynamic = 'force-dynamic';

type ActionBody = {
  memberId?: string;
  action?: 'nudge' | 'pause' | 'resume';
};

const ACTION_VERB: Record<string, string> = {
  nudge: 'nudged',
  pause: 'paused',
  resume: 'resumed',
};

// Interactive Council actions. For now these record a real, visible event into
// the activity log (so a nudge actually does something you can see in the feed)
// and echo back the new state. Wiring to the Droplet control plane comes next.
export async function POST(request: Request) {
  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { memberId, action } = body;
  if (!memberId || !action || !ACTION_VERB[action]) {
    return NextResponse.json({ ok: false, error: 'memberId and a valid action are required' }, { status: 400 });
  }

  const member = findMember(memberId);
  if (!member) {
    return NextResponse.json({ ok: false, error: `Unknown member: ${memberId}` }, { status: 404 });
  }

  const verb = ACTION_VERB[action];
  appendActivityLog({
    timestamp: new Date().toISOString(),
    action: `${member.loreName} ${verb} by operator`,
    agent: member.id,
    status: action === 'pause' ? 'failed' : 'completed',
  });

  return NextResponse.json({
    ok: true,
    memberId,
    action,
    paused: action === 'pause',
    message: `${member.loreName} ${verb}.`,
  });
}
