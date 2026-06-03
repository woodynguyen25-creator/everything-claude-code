import { redirect } from 'next/navigation';

// Council merged into the War Room (2026-06-02). Redirect so old links + the command palette resolve.
export default function CouncilPage() {
  redirect('/war-room');
}
