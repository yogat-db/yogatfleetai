import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ plate: string }> }
) {
  try {
    const { plate } = await params;
    const res = await fetch(
      `https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration=${plate}`,
      {
        headers: {
          'X-Api-Key': process.env.MOT_API_KEY!,
          Accept: 'application/json',
        },
      }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'MOT lookup failed' }, { status: 500 });
  }
}