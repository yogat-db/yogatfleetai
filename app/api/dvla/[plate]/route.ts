import { NextResponse } from 'next/server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ plate: string }> }
) {
  try {
    const { plate } = await params;
    const apiKey = process.env.DVLA_API_KEY;

    // If no API key is set, return mock data for development/testing
    if (!apiKey) {
      console.warn('DVLA_API_KEY missing – using mock data');
      return NextResponse.json({
        make: 'Mock',
        model: 'Vehicle',
        yearOfManufacture: 2020,
        fuelType: 'Petrol',
        engineCapacity: '1600',
        vin: 'MOCKVIN123456789',
      });
    }

    const response = await fetch(
      'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles',
      {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ registrationNumber: plate }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('DVLA API error:', response.status, data);
      // Return a generic vehicle so the frontend doesn't break
      return NextResponse.json({
        make: 'Unknown',
        model: 'Car',
        yearOfManufacture: new Date().getFullYear(),
        fuelType: 'Unknown',
        engineCapacity: '?',
        vin: null,
      });
    }

    return NextResponse.json({
      make: data.make,
      model: data.model,
      yearOfManufacture: data.yearOfManufacture,
      fuelType: data.fuelType,
      engineCapacity: data.engineCapacity,
      vin: data.vin || null,
    });
  } catch (err: any) {
    console.error('DVLA route error:', err);
    // Fallback to mock data in case of network failure
    return NextResponse.json({
      make: 'Fallback',
      model: 'Vehicle',
      yearOfManufacture: 2020,
      fuelType: 'Unknown',
      engineCapacity: '?',
      vin: null,
    });
  }
}