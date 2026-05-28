import fs from 'node:fs/promises';
import path from 'node:path';

export type ModeName = 'dawn' | 'day' | 'dusk' | 'night';
export type SpecialDay = 'birthday' | 'monday' | 'friday' | 'market-crash' | 'win-streak' | 'normal';

type Profile = {
  displayName: string;
  timezone: string;
  birthday: string | null;
  northStars: string[];
  schedule: {
    work: {
      days: number[];
      start?: string;
      end?: string;
    };
    gym?: {
      preferred: string;
      target: string;
    };
  };
};

type Quote = {
  quote: string;
  source: string;
  theme: string;
};

const profilePath = path.join(process.cwd(), 'data', 'profile.json');
const quotesPath = path.join(process.cwd(), 'data', 'quotes.json');

function chicagoNow() {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    weekday: lookup.weekday || 'Mon',
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
  };
}

const DEFAULT_PROFILE: Profile = {
  displayName: 'Woody',
  timezone: 'America/Chicago',
  birthday: null,
  northStars: [],
  schedule: { work: { days: [1, 2, 3, 4, 5] } },
};

const DEFAULT_QUOTES: Quote[] = [
  { quote: 'The realm awaits its operator.', source: 'AIOS', theme: 'duty' },
];

export async function readProfile(): Promise<Profile> {
  try {
    const raw = await fs.readFile(profilePath, 'utf8');
    return JSON.parse(raw) as Profile;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function readQuotes(): Promise<Quote[]> {
  try {
    const raw = await fs.readFile(quotesPath, 'utf8');
    return JSON.parse(raw) as Quote[];
  } catch {
    return DEFAULT_QUOTES;
  }
}

export function getModeName(hour: number): ModeName {
  if (hour >= 5 && hour < 9) return 'dawn';
  if (hour >= 9 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'dusk';
  return 'night';
}

export async function getModeContext() {
  const profile = await readProfile();
  const quotes = await readQuotes();
  const now = chicagoNow();
  const mode = getModeName(now.hour);

  let specialDay: SpecialDay = 'normal';
  if (profile.birthday) {
    const [, month, day] = profile.birthday.split('-').map(Number);
    if (!Number.isNaN(month) && !Number.isNaN(day) && month === now.month && day === now.day) {
      specialDay = 'birthday';
    }
  }

  if (specialDay === 'normal' && now.weekday === 'Mon') specialDay = 'monday';
  if (specialDay === 'normal' && now.weekday === 'Fri') specialDay = 'friday';

  const dateKey = `${now.year}-${String(now.month).padStart(2, '0')}-${String(now.day).padStart(2, '0')}`;
  const seed = Array.from(dateKey).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const quote = quotes[seed % quotes.length];

  return {
    profile,
    mode,
    specialDay,
    quote,
    now,
  };
}
