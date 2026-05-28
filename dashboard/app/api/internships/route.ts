import { NextRequest, NextResponse } from 'next/server';
import { createInternship, INTERNSHIP_STATUSES, listInternships, type InternshipStatus } from '@/lib/internships';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const includeArchived = req.nextUrl.searchParams.get('includeArchived') === '1';
  return NextResponse.json(listInternships(includeArchived));
}

export async function POST(req: NextRequest) {
  let body: {
    company?: string;
    role?: string;
    location?: string | null;
    status?: InternshipStatus;
    deadline?: string | null;
    nextAction?: string | null;
    nextActionDate?: string | null;
    url?: string | null;
    notes?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!body.company?.trim() || !body.role?.trim()) {
    return NextResponse.json({ error: 'company and role are required' }, { status: 400 });
  }

  if (body.status && !INTERNSHIP_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid internship status' }, { status: 400 });
  }

  try {
    const created = createInternship({
      company: body.company.trim(),
      role: body.role.trim(),
      location: body.location,
      status: body.status,
      deadline: body.deadline,
      nextAction: body.nextAction,
      nextActionDate: body.nextActionDate,
      url: body.url,
      notes: body.notes,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create internship';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
