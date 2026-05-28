import { NextResponse } from 'next/server';

// Stub endpoint — returns 404 until Phase B wires the Robinhood backend.
// Once wired, this route will proxy to hermes-gateway /portfolio/robinhood/state.
export async function GET() {
  return NextResponse.json(
    {
      error:
        'The vault is still being keyed. Real-account sync awakens once Robinhood is bound.',
    },
    { status: 404 },
  );
}

export async function HEAD() {
  return new NextResponse(null, { status: 404 });
}
