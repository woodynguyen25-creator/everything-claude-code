import { redirect } from 'next/navigation';

// Sessions merged into the War Room (2026-06-02). Redirect so old links + bookmarks resolve.
export default function SessionsPage() {
  redirect('/war-room');
}
