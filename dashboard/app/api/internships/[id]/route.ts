import { NextRequest, NextResponse } from 'next/server';
import {
  deleteInternship,
  getInternshipById,
  INTERNSHIP_STATUSES,
  updateInternship,
  type InternshipStatus,
} from '@/lib/internships';

export const dynamic = 'force-dynamic';

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'Invalid internship id' }, { status: 400 });
  const internship = getInternshipById(id);
  if (!internship) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(internship);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'Invalid internship id' }, { status: 400 });

  let body: {
    company?: string;
    role?: string;
    location?: string | null;
    status?: InternshipStatus;
    appliedDate?: string | null;
    deadline?: string | null;
    nextAction?: string | null;
    nextActionDate?: string | null;
    url?: string | null;
    notes?: string | null;
    archived?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (body.status && !INTERNSHIP_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid internship status' }, { status: 400 });
  }

  const updated = updateInternship(id, body);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'Invalid internship id' }, { status: 400 });
  const deleted = deleteInternship(id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, internship: deleted });
}
