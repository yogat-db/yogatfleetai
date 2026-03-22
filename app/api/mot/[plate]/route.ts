import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ plate: string }> }
) {
  const { plate } = await params;
  try {
    const res = await fetch(`https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration=${plate}`, {
      headers: {
        'x-api-key': process.env.MOT_API_KEY!,
        'Accept': 'application/json',
      },
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.message || 'MOT lookup failed' }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}