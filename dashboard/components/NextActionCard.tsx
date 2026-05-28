import Link from 'next/link';
import { readDoctor } from '@/lib/doctor';
import { getTradingDetail } from '@/lib/adapters/trading';
import { getOpenCriticalTask } from '@/lib/tasks';

type ActionState = {
  title: string;
  body: string;
  action: { verb: string; href: string; hotness: 1 | 2 | 3 } | null;
};

function actionTone(hotness: 1 | 2 | 3) {
  if (hotness >= 3) return 'bg-blood text-text-primary hover:bg-blood/90';
  if (hotness === 2) return 'bg-ember text-bg-deep hover:bg-ember/90';
  return 'bg-rune-gold text-bg-deep hover:bg-rune-gold/90';
}

function isMarketOpen() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = lookup.weekday || 'Mon';
  if (weekday === 'Sat' || weekday === 'Sun') return false;
  const minutes = Number(lookup.hour) * 60 + Number(lookup.minute);
  return minutes >= 4 * 60 && minutes < 20 * 60;
}

export default async function NextActionCard() {
  const [doctor, trading, criticalTask] = await Promise.all([
    readDoctor(),
    getTradingDetail(),
    Promise.resolve(getOpenCriticalTask()),
  ]);

  let state: ActionState;

  if ((doctor.lastRun?.deferred ?? 0) > 0 || doctor.status === 'crit') {
    state = {
      title: 'Open Doctor log',
      body: doctor.lastRun?.deferred
        ? `${doctor.lastRun.deferred} unresolved finding${doctor.lastRun.deferred === 1 ? '' : 's'} require immediate attention.`
        : 'System health is critical and needs review.',
      action: { verb: 'Open Doctor log', href: '/api/doctor', hotness: 3 },
    };
  } else if (criticalTask) {
    state = {
      title: criticalTask.title,
      body: 'A high-priority task is still open and should be handled before the realm drifts.',
      action: { verb: 'Open task', href: '/', hotness: 3 },
    };
  } else {
    const latestParlay = trading.latestParlay;
    let tradingReady = false;
    if (latestParlay) {
      try {
        const legs = JSON.parse(latestParlay.legs_json) as Array<{ commence_time?: string }>;
        const earliest = legs
          .map((leg) => (leg.commence_time ? new Date(leg.commence_time).getTime() : Number.POSITIVE_INFINITY))
          .reduce((min, value) => Math.min(min, value), Number.POSITIVE_INFINITY);
        if (Number.isFinite(earliest)) {
          const delta = earliest - Date.now();
          tradingReady = delta >= 0 && delta <= 15 * 60 * 1000 && isMarketOpen();
        }
      } catch {
        tradingReady = false;
      }
    }

    if (tradingReady && latestParlay) {
      state = {
        title: 'Open slate',
        body: `${latestParlay.sport} ${latestParlay.n_legs}-leg slate is within lock range and ready for review.`,
        action: { verb: 'Open slate', href: '/trading?focus=parlay', hotness: 2 },
      };
    } else if (doctor.status === 'warn' && (doctor.ageMinutes ?? 0) > 60 * 24) {
      state = {
        title: 'Run Doctor',
        body: 'Doctor is stale and should run again before the realm loses confidence in its health state.',
        action: { verb: 'Run Doctor', href: '/api/doctor', hotness: 1 },
      };
    } else {
      state = {
        title: 'Move with the day',
        body: 'No urgent command demands the throne right now.',
        action: null,
      };
    }
  }

  return (
    <article className="panel flex min-h-[12rem] flex-col justify-between p-6">
      <div>
        <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">NEXT ACTION</div>
        <h2 className="mt-3 font-display text-2xl text-text-primary">{state.title}</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary">{state.body}</p>
      </div>

      {state.action ? (
        <div className="mt-5 flex justify-end">
          <Link
            href={state.action.href}
            className={`rounded px-3 py-1.5 text-rune text-xs font-semibold tracking-wider transition-colors ${actionTone(state.action.hotness)}`}
          >
            {state.action.verb}
          </Link>
        </div>
      ) : (
        <div className="mt-5 flex items-center justify-end text-rune text-xl text-text-muted/60">ᚨ</div>
      )}
    </article>
  );
}
