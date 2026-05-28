/**
 * Incanted-mystic voice for empty states across the Olympus Realm.
 *
 * Voice rules:
 *  - Never say "No data", "Empty", "Nothing to show", or "No records"
 *  - Use realm / council / scroll / forge / vault metaphors
 *  - 1–2 lines maximum; no exclamation marks
 *  - Omniscient narrator tone — the realm is watching, not apologizing
 */
export const VOICE = {
  noPositions: 'The council sits in silence — no positions are open.',
  noDecision: 'The scroll has been lost.',
  noData: 'The realm holds no record yet.',
  scanning: 'Scanning the deep…',
  noResolutions: 'No battles have been resolved.',
  noCandidates: 'The realm awaits its next quarry.',
  noWhaleFlow: 'Scanning the deep…',
  noMacro: 'The winds are still. Zeus has not spoken.',
  noBots: 'The forge is cold — no bots are active.',
  loading: 'The realm stirs…',
  rhPending: 'The vault is still being keyed. Real-account sync awakens once Robinhood is bound.',
  error: (ctx: string) => `The realm encountered turbulence — ${ctx}.`,
} as const;
