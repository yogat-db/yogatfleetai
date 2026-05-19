import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = {
  params: Promise<{ plate: string }>;
};

type DvlaVehicleResponse = {
  make?: string | null;
  model?: string | null;
  yearOfManufacture?: number | null;
  fuelType?: string | null;
  engineCapacity?: number | null;
  vin?: string | null;
  registrationNumber?: string | null;
};

type ApiSuccess<T> = {
  success: true;
  error: null;
  data: T;
};

type ApiError = {
  success: false;
  error: string;
  data: null;
};

type VehicleLookupDto = {
  make: string | null;
  model: string | null;
  yearOfManufacture: number | null;
  fuelType: string | null;
  engineCapacity: number | null;
  vin: string | null;
  registrationNumber: string | null;
};

function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>(
    {
      success: true,
      error: null,
      data,
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}

function jsonError(message: string, status: number) {
  return NextResponse.json<ApiError>(
    {
      success: false,
      error: message,
      data: null,
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}

function normalizePlate(rawPlate: string | undefined | null) {
  return (rawPlate ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
}

function isValidUkPlateFormat(plate: string) {
  return /^[A-Z0-9]{2,8}$/.test(plate);
}

function mapDvlaVehicle(data: DvlaVehicleResponse): VehicleLookupDto {
  return {
    make: typeof data.make === 'string' ? data.make : null,
    model: typeof data.model === 'string' ? data.model : null,
    yearOfManufacture:
      typeof data.yearOfManufacture === 'number' ? data.yearOfManufacture : null,
    fuelType: typeof data.fuelType === 'string' ? data.fuelType : null,
    engineCapacity:
      typeof data.engineCapacity === 'number' ? data.engineCapacity : null,
    vin: typeof data.vin === 'string' ? data.vin : null,
    registrationNumber:
      typeof data.registrationNumber === 'string' ? data.registrationNumber : null,
  };
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { plate } = await params;
    const registrationNumber = normalizePlate(plate);
    const apiKey = process.env.DVLA_API_KEY;

    if (!registrationNumber) {
      return jsonError('Registration number is required', 400);
    }

    if (!isValidUkPlateFormat(registrationNumber)) {
      return jsonError('Registration number format is invalid', 400);
    }

    if (!apiKey) {
      console.error('DVLA route misconfiguration: missing DVLA_API_KEY');
      return jsonError('DVLA service is not configured', 500);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let response: Response;

    try {
      response = await fetch(
        'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles',
        {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ registrationNumber }),
          cache: 'no-store',
          signal: controller.signal,
        }
      );
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof Error && error.name === 'AbortError') {
        return jsonError('DVLA service timed out', 504);
      }

      console.error('DVLA upstream network error:', error);
      return jsonError('Unable to reach DVLA service', 502);
    }

    clearTimeout(timeout);

    const data = (await response.json().catch(() => null)) as DvlaVehicleResponse | null;

    if (!response.ok) {
      console.error('DVLA API error:', {
        status: response.status,
        registrationNumber,
        data,
      });

      if (response.status === 400) {
        return jsonError('Vehicle not found in DVLA database', 404);
      }

      if (response.status === 404) {
        return jsonError('Vehicle not found in DVLA database', 404);
      }

      if (response.status === 503) {
        return jsonError('DVLA service is temporarily unavailable', 503);
      }

      return jsonError('DVLA lookup failed', 502);
    }

    return jsonSuccess(mapDvlaVehicle(data ?? {}));
  } catch (error) {
    console.error('DVLA route error:', error);
    return jsonError('Internal server error', 500);
  }
}