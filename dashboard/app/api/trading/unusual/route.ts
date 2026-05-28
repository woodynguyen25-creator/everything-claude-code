import { NextResponse } from 'next/server';
import fs from 'fs';

export const dynamic = 'force-dynamic';

const JSON_PATH = 'C:\\Users\\woody\\TradingView Assistant\\unusual-options.json';

export interface UnusualRow {
  symbol: string;
  type: 'CALL' | 'PUT';
  strike: number;
  exp: string;
  volume: number;
  oi: number;
  voiRatio: number;
  lastPrice: number;
  iv: number;
  premiumK: number;
  signal: 'BULLISH' | 'BEARISH';
  underlyingPrice: number;
}

export interface UnusualOptionsData {
  generatedAt: string | null;
  count: number;
  rows: UnusualRow[];
}

export async function GET() {
  try {
    if (!fs.existsSync(JSON_PATH)) {
      return NextResponse.json<UnusualOptionsData>({ generatedAt: null, count: 0, rows: [] });
    }

    const raw = fs.readFileSync(JSON_PATH, 'utf8');
    const data = JSON.parse(raw) as UnusualOptionsData;

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json<UnusualOptionsData>(
      { generatedAt: null, count: 0, rows: [] },
      { status: 200 }
    );
  }
}
