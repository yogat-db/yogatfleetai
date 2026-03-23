import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ plate: string }> }
) {
  try {
    const { plate } = await params;
    const res = await fetch(
      'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles',
      {
        method: 'POST',
        headers: {
          'x-api-key': process.env.DVLA_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ registrationNumber: plate }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'DVLA lookup failed');
    }

    // Map to our expected fields
    return NextResponse.json({
      make: data.make,
      model: data.model,
      yearOfManufacture: data.yearOfManufacture,
      fuelType: data.fuelType,
      engineCapacity: data.engineCapacity,
      vin: data.vin || null,
    });
  } catch (err: any) {
    console.error('DVLA error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}