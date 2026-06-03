import { redirect } from 'next/navigation';

// Renamed to the War Room (2026-06-02). Redirect keeps the prior /operations link alive.
export default function OperationsPage() {
  redirect('/war-room');
}
