import { COUNCIL_DOMAINS } from '@/lib/council-roster';
import { readAiosStats } from '@/lib/aios-stats';
import { OperationsSurface } from '@/components/operations/OperationsSurface';

export const dynamic = 'force-dynamic';

// The War Room — merged Sessions + Council command center (LeBot James' cockpit).
export default function WarRoomPage() {
  const dreams = readAiosStats()?.dreams ?? [];
  return <OperationsSurface domains={COUNCIL_DOMAINS} dreams={dreams} />;
}
