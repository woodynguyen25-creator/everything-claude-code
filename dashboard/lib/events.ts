import { listActivity } from '@/lib/activity';

export type EventItem = {
  timestamp: string;
  domain: string;
  headline: string;
};

export async function getRecentEvents(limit = 12): Promise<EventItem[]> {
  const events = await listActivity({ limit });
  return events.map((event) => ({
    timestamp: event.timestamp,
    domain: event.kind,
    headline: event.title,
  }));
}
