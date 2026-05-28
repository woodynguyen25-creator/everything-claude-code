import { getTradingCards } from '@/lib/adapters/trading';

export type TradingItem = {
  source: 'parlay-bot' | 'morning-brief';
  title: string;
  detail: string;
  timestamp: string | null;
};

export type TradingSummary = {
  items: TradingItem[];
  hasData: boolean;
  message: string;
};

export async function readTrading(): Promise<TradingSummary> {
  const cards = await getTradingCards();

  return {
    items: cards.map((card) => ({
      source: card.sourceLabel === 'PARLAY' ? 'parlay-bot' : 'morning-brief',
      title: card.headline,
      detail: card.detail || card.source.path,
      timestamp: card.freshness.iso,
    })),
    hasData: cards.length > 0,
    message: cards.length > 0 ? `${cards.length} signal${cards.length === 1 ? '' : 's'}` : 'No trading artifacts yet',
  };
}

export { getTradingCards };
