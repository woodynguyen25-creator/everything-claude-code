import { NextResponse } from 'next/server';
import { readCouncilLedger, type CouncilLedgerData } from '@/lib/council-ledger-data';

export const dynamic = 'force-dynamic';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function GET(): Promise<NextResponse<ApiResponse<CouncilLedgerData>>> {
  try {
    const data = readCouncilLedger();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read council ledger';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
