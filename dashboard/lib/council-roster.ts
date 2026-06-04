// Single source of truth for the Council surface — every AI grouped by the
// real-life DOMAIN it owns, with two cross-cutting roles (Chief, Guardian)
// pinned on top. Lore names always carry a plain-language function label so
// the surface stays usable (operator decision 2026-05-29).

export type CouncilAccent = 'gold' | 'bifrost' | 'blood' | 'emerald' | 'fire' | 'iron';

export type CouncilDomainKey = 'command' | 'trading' | 'research' | 'lucky-dog' | 'code';

export type CouncilMemberKind = 'agent' | 'bot' | 'council';

export type CouncilMember = {
  /** stable id used for actions + map nodes */
  id: string;
  /** lore name shown large */
  loreName: string;
  /** plain-language function — always shown next to the lore name */
  role: string;
  emoji: string;
  accent: CouncilAccent;
  kind: CouncilMemberKind;
  /** maps to /api/doctor/agents health slug, when one exists */
  healthSlug: string | null;
  /** chat / detail route, when one exists */
  href: string | null;
  /** which interactive actions this member supports */
  actions: Array<'nudge' | 'pause' | 'chat' | 'open'>;
  /** one-line "what it's doing / what it is" */
  blurb: string;
};

export type CouncilDomain = {
  key: CouncilDomainKey;
  label: string;
  /** plain-language description of the domain */
  tagline: string;
  accent: CouncilAccent;
  members: CouncilMember[];
};

export const COUNCIL_DOMAINS: CouncilDomain[] = [
  {
    key: 'command',
    label: 'COMMAND & GUARDIAN',
    tagline: 'Oversight that spans every domain',
    accent: 'gold',
    members: [
      {
        id: 'lebot-james',
        loreName: 'LeBot James',
        role: 'Chief — cost & ops',
        emoji: '👑',
        accent: 'gold',
        kind: 'agent',
        healthSlug: 'lebot-james',
        href: '/lebot-james',
        actions: ['chat', 'nudge'],
        blurb: 'Allfather of the realm. Routes work by budget, watches spend, runs the house.',
      },
      {
        id: 'atlas',
        loreName: 'Atlas',
        role: 'Guardian — keeps agents alive',
        emoji: '🛡️',
        accent: 'iron',
        kind: 'agent',
        healthSlug: null,
        href: null,
        actions: ['open'],
        blurb: 'Watchdog daemon. Health-checks every service and restarts what falls over.',
      },
    ],
  },
  {
    key: 'trading',
    label: 'TRADING',
    tagline: 'Markets, the fund, and the paper desk',
    accent: 'bifrost',
    members: [
      {
        id: 'thor',
        loreName: 'Thor',
        role: 'Head of Trading · Voice of Olympus',
        emoji: '⚒️',
        accent: 'bifrost',
        kind: 'agent',
        healthSlug: 'thor',
        href: '/thor',
        actions: ['chat', 'nudge'],
        blurb: 'Commands the trade. Speaks for the Olympus council and runs the three paper bots.',
      },
      {
        id: 'hermes-btc',
        loreName: 'Hermes BTC',
        role: 'Paper bot — Bitcoin',
        emoji: '₿',
        accent: 'bifrost',
        kind: 'bot',
        healthSlug: null,
        href: '/olympus?bot=hermes-btc',
        actions: ['open'],
        blurb: 'Autonomous paper trader on BTC. Calmar-biased scoring.',
      },
      {
        id: 'hermes-eth',
        loreName: 'Hermes ETH',
        role: 'Paper bot — Ethereum',
        emoji: 'Ξ',
        accent: 'bifrost',
        kind: 'bot',
        healthSlug: null,
        href: '/olympus?bot=hermes-eth',
        actions: ['open'],
        blurb: 'Autonomous paper trader on ETH.',
      },
      {
        id: 'hermes-spy',
        loreName: 'Hermes SPY',
        role: 'Paper bot — S&P 500',
        emoji: '🇺🇸',
        accent: 'bifrost',
        kind: 'bot',
        healthSlug: null,
        href: '/olympus?bot=hermes-spy',
        actions: ['open'],
        blurb: 'Autonomous paper trader on SPY.',
      },
      {
        id: 'olympus-council',
        loreName: 'Olympus Pantheon',
        role: 'Advisory council — debates & votes trades',
        emoji: '⚖️',
        accent: 'gold',
        kind: 'council',
        healthSlug: null,
        href: '/olympus',
        actions: ['open'],
        blurb: 'Eleven gods chaired by Anubis. Debates each play; the verdict comes to you for sign-off.',
      },
    ],
  },
  {
    key: 'research',
    label: 'RESEARCH',
    tagline: 'Sees the web so you do not have to',
    accent: 'fire',
    members: [
      {
        id: 'sauron',
        loreName: 'Sauron',
        role: 'Research — the all-seeing eye',
        emoji: '👁️',
        accent: 'fire',
        kind: 'agent',
        healthSlug: 'sauron',
        href: '/sauron',
        actions: ['chat', 'nudge'],
        blurb: 'Deep research, sourcing, and lore-gathering across the web.',
      },
    ],
  },
  {
    key: 'lucky-dog',
    label: 'LUCKY DOG',
    tagline: 'The agency business',
    accent: 'blood',
    members: [
      {
        id: 'fenrir',
        loreName: 'Fenrir',
        role: 'Business — Lucky Dog Marketing',
        emoji: '🐺',
        accent: 'blood',
        kind: 'agent',
        healthSlug: 'fenrir',
        href: '/fenrir',
        actions: ['chat', 'nudge'],
        blurb: 'Wolf of the forge. Drives the Lucky Dog landing + client work.',
      },
    ],
  },
  {
    key: 'code',
    label: 'CODE & DFS',
    tagline: 'Builds things and plays the slates',
    accent: 'emerald',
    members: [
      {
        id: 'perseus',
        loreName: 'Perseus',
        role: 'Code — prince of parleys',
        emoji: '🛡️',
        accent: 'emerald',
        kind: 'agent',
        healthSlug: 'perseus',
        href: '/perseus',
        actions: ['chat', 'nudge'],
        blurb: 'Implementation + the engine behind ParlayBot.',
      },
      {
        id: 'parlay',
        loreName: 'ParlayBot',
        role: 'DFS bot — daily slates',
        emoji: '🎲',
        accent: 'emerald',
        kind: 'bot',
        healthSlug: null,
        href: '/olympus?bot=parlay',
        actions: ['open'],
        blurb: 'PrizePicks slate builder — lineup gate, vig strip, Kelly sizing.',
      },
    ],
  },
];

export const ALL_COUNCIL_MEMBERS: CouncilMember[] = COUNCIL_DOMAINS.flatMap((d) => d.members);

export function findMember(id: string): CouncilMember | undefined {
  return ALL_COUNCIL_MEMBERS.find((m) => m.id === id);
}
