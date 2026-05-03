// app/api/mot/[plate]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ plate: string }> }
) {
  const { plate } = await params;
  const registration = plate.toUpperCase().replace(/\s+/g, '');

  if (!registration) {
    return NextResponse.json({ error: 'Registration plate is required' }, { status: 400 });
  }

  const apiKey = process.env.MOT_API_KEY;
  if (!apiKey) {
    console.error('MOT_API_KEY missing');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    // DVLA MOT API endpoint
    const url = `https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration=${registration}`;
    
    const res = await fetch(url, {
      headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 },
    });

    if (res.status === 404) {
      return NextResponse.json({ error: 'Vehicle not found or no MOT history' }, { status: 404 });
    }
    if (res.status === 429) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`MOT API error (${res.status}):`, errorText);
      return NextResponse.json({ error: 'MOT service error' }, { status: res.status });
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'No MOT data found' }, { status: 404 });
    }

    // Return the most recent MOT test result
    const sorted = data.sort((a: any, b: any) => 
      new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime()
    );
    return NextResponse.json(sorted[0]);
  } catch (err: any) {
    console.error('MOT lookup crash:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}