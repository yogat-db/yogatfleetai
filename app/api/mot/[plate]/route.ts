import { NextRequest, NextResponse } from 'next/server';

/**
 * Production DVLA/MOT Lookup
 * Handles API-specific errors to prevent generic 500 crashes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ plate: string }> }
) {
  const { plate } = await params;
  const registration = plate.toUpperCase().replace(/\s+/g, ''); // Clean the plate format

  if (!registration) {
    return NextResponse.json({ error: 'Registration plate is required' }, { status: 400 });
  }

  try {
    const apiKey = process.env.MOT_API_KEY;

    if (!apiKey) {
      console.error('[MOT_API_CONFIG_ERROR]: MOT_API_KEY is missing in environment variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const res = await fetch(
      `https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration=${registration}`,
      {
        headers: {
          'X-Api-Key': apiKey,
          'Accept': 'application/json',
        },
        next: { revalidate: 3600 } // Cache results for 1 hour to save API credits
      }
    );

    // 1. Handle non-200 responses from DVLA
    if (res.status === 404) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    if (res.status === 429) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[MOT_API_REMOTE_ERROR] ${res.status}:`, errorText);
      return NextResponse.json({ error: 'External MOT service unavailable' }, { status: res.status });
    }

    const data = await res.json();

    // 2. Data Sanitization
    // The MOT API returns an array; we usually only want the primary vehicle info
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'No MOT history available for this vehicle' }, { status: 404 });
    }

    // Return the latest record and vehicle specs
    return NextResponse.json(data[0]);

  } catch (err: any) {
    console.error('[MOT_INTERNAL_CRASH]:', err.message);
    return NextResponse.json({ error: 'Internal system error during lookup' }, { status: 500 });
  }
}