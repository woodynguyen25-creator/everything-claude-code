import fs from 'node:fs';
import path from 'node:path';
import { getTradingDetail } from '@/lib/adapters/trading';

export type AgentStatusTone = 'iron' | 'bifrost' | 'ember' | 'blood' | 'emerald' | 'fire';

export type AgentStatus = {
  slug: 'lebot-james' | 'thor' | 'perseus' | 'fenrir' | 'sauron';
  href: string;
  codename: string;
  persona: string;
  accent: 'gold' | 'blood' | 'bifrost' | 'emerald' | 'fire';
  tone: AgentStatusTone;
  symbol: string;
  imageSrc: string | null;
};

function marketTone(): AgentStatusTone {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = lookup.weekday || 'Mon';
  if (weekday === 'Sat' || weekday === 'Sun') return 'iron';
  const minutes = Number(lookup.hour) * 60 + Number(lookup.minute);
  if (minutes >= 9 * 60 + 30 && minutes < 16 * 60) return 'bifrost';
  if (minutes >= 4 * 60 && minutes < 20 * 60) return 'ember';
  return 'iron';
}

function publicImage(relativePath: string) {
  const fullPath = path.join(process.cwd(), 'public', relativePath);
  return fs.existsSync(fullPath) ? `/${relativePath.replace(/\\/g, '/')}` : null;
}

export async function getAgentStatuses(): Promise<AgentStatus[]> {
  const trading = await getTradingDetail();
  const hasFreshSlate = Boolean(trading.cards.find((card) => card.sourceLabel === 'PARLAY' && card.isFresh));

  return [
    {
      slug: 'lebot-james',
      href: '/lebot-james',
      codename: '🤴 LEBOT JAMES',
      persona: 'The AIOS Allfather',
      accent: 'gold',
      tone: 'iron',
      symbol: '👑',
      imageSrc: publicImage(path.join('art', 'agents', 'sigils', 'lebot-james.webp')),
    },
    {
      slug: 'thor',
      href: '/thor',
      codename: '⚒️ THOR',
      persona: 'Head of Trading · Voice of Olympus',
      accent: 'bifrost',
      tone: marketTone(),
      symbol: '⚡',
      imageSrc: publicImage(path.join('art', 'agents', 'sigils', 'thor.webp')),
    },
    {
      slug: 'perseus',
      href: '/perseus',
      codename: '🛡️ PERSEUS',
      persona: 'Prince of Parleys',
      accent: 'emerald',
      tone: hasFreshSlate ? 'bifrost' : 'iron',
      symbol: '💰',
      imageSrc: publicImage(path.join('art', 'agents', 'sigils', 'perseus.webp')),
    },
    {
      slug: 'fenrir',
      href: '/fenrir',
      codename: '🐺 FENRIR',
      persona: 'Wolf of the Forge',
      accent: 'blood',
      tone: 'iron',
      symbol: '🐺',
      imageSrc: publicImage(path.join('art', 'agents', 'sigils', 'fenrir.webp')),
    },
    {
      slug: 'sauron',
      href: '/sauron',
      codename: '👁️ SAURON',
      persona: 'All-Seeing Eye',
      accent: 'fire',
      tone: 'iron',
      symbol: '👁',
      imageSrc: publicImage(path.join('art', 'agents', 'sigils', 'sauron.webp')),
    },
  ];
}
