import { NextResponse } from 'next/server';
import { execFileSync } from 'child_process';

export const dynamic = 'force-dynamic';

const FINVIZ_CLI = 'C:\\Users\\woody\\go\\bin\\finviz-pp-cli.exe';
const LIMIT = 8;

export interface NewsItem {
  date: string;
  headline: string;
  url: string;
  source: string;
}

export async function GET() {
  try {
    const raw = execFileSync(FINVIZ_CLI, ['news', '--limit', String(LIMIT), '--json'], {
      timeout: 10000,
      encoding: 'utf8',
    });

    const items: NewsItem[] = JSON.parse(raw);

    return NextResponse.json(
      { generatedAt: new Date().toISOString(), items },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { generatedAt: null, items: [] },
      { status: 200 }
    );
  }
}
