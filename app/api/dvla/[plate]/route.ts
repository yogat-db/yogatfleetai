import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ plate: string }> }
) {
  const { plate } = await params;
  try {
    const res = await fetch('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.DVLA_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ registrationNumber: plate }),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.message || 'DVLA lookup failed' }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}