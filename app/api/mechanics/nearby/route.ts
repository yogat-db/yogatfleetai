// app/api/mechanics/nearby/route.ts
import { NextRequest, NextResponse } from 'next/server';

// ... (same haversine function)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = searchParams.get('radius') || '10';

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat or lng' }, { status: 400 });
  }

  // ... same logic as above
  return NextResponse.json(nearby);
}
