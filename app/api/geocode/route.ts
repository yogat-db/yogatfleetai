// app/api/geocode/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');

  // 1. Validate input
  if (!address || typeof address !== 'string' || address.trim().length < 3) {
    return NextResponse.json(
      { error: 'Invalid address. Please provide a meaningful street name or place.' },
      { status: 400 }
    );
  }

  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) {
    console.error('Mapbox access token is missing');
    return NextResponse.json(
      { error: 'Mapbox configuration error' },
      { status: 500 }
    );
  }

  const encodedAddress = encodeURIComponent(address.trim());

  // 2. Request with Next.js caching (revalidated every 7 days)
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${token}&limit=1`,
    {
      next: {
        revalidate: 604800, // 7 days
        tags: ['geocode'],  // optional: for on‑demand revalidation
      },
    }
  );

  // 3. Handle different HTTP statuses
  if (!response.ok) {
    console.error('Mapbox API error:', response.status);
    if (response.status === 401) {
      return NextResponse.json(
        { error: 'Mapbox authentication failed. Please check your API key.' },
        { status: 401 }
      );
    }
    if (response.status === 429) {
      return NextResponse.json(
        { error: 'Too many geocoding requests. Please try again later.' },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: 'Mapbox service error. Please try again later.' },
      { status: response.status }
    );
  }

  const data = await response.json();

  // 4. Extract coordinates safely
  if (data.features && data.features.length > 0) {
    const [lng, lat] = data.features[0].center;
    return NextResponse.json({ lat, lng });
  }

  // 5. No results found
  return NextResponse.json(
    { error: 'Address not found' },
    { status: 404 }
  );
}