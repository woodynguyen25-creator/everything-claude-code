import fs from 'node:fs/promises';
import path from 'node:path';

export type WyrdStatus = 'on-track' | 'paused' | 'next' | 'blocked';

export type WyrdItem = {
  id: string;
  label: string;
  sigil: string;
  status: WyrdStatus;
  next: string;
};

const wyrdPath = path.join(process.cwd(), 'data', 'wyrd.json');

export async function readWyrd(): Promise<WyrdItem[]> {
  try {
    const raw = await fs.readFile(wyrdPath, 'utf8');
    return JSON.parse(raw) as WyrdItem[];
  } catch {
    return [];
  }
}
