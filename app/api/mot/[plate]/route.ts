import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 3600;

type MotTest = {
  completedDate?: string;
  [key: string]: unknown;
};

function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      error: null,
      data,
    },
    { status }
  );
}

function jsonError(error: string, status: number, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error,
      data: null,
      details: details ?? null,
    },
    { status }
  );
}

function normalizePlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function getLatestMotRecord(records: MotTest[]) {
  return records.reduce<MotTest | null>((latest, current) => {
    const currentDate = current.completedDate
      ? new Date(current.completedDate).getTime()
      : 0;

    const latestDate =
      latest?.completedDate ? new Date(latest.completedDate).getTime() : 0;

    return currentDate > latestDate ? current : latest;
  }, null);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ plate: string }> }
) {
  const { plate } = await params;
  const registration = normalizePlate(plate);

  if (!registration) {
    return jsonError('Registration plate is required', 400);
  }

  const apiKey = process.env.MOT_API_KEY;

  if (!apiKey) {
    console.error('[MOT_API] MOT_API_KEY missing');
    return jsonError('Server configuration error', 500);
  }

  try {
    const url = `https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration=${encodeURIComponent(
      registration
    )}`;

    const res = await fetch(url, {
      headers: {
        'X-Api-Key': apiKey,
        Accept: 'application/json',
      },
      next: { revalidate },
    });

    if (res.status === 404) {
      return jsonError('Vehicle not found or no MOT history', 404);
    }

    if (res.status === 429) {
      return jsonError('Rate limit exceeded', 429);
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      console.error(`[MOT_API] Upstream error ${res.status}:`, errorText);
      return jsonError('MOT service error', res.status);
    }

    const data = (await res.json()) as MotTest[];

    if (!Array.isArray(data) || data.length === 0) {
      return jsonError('No MOT data found', 404);
    }

    const latest = getLatestMotRecord(data);

    if (!latest) {
      return jsonError('No MOT data found', 404);
    }

    return jsonSuccess(latest);
  } catch (error) {
    console.error('[MOT_API] Lookup crash:', error);
    return jsonError('Internal server error', 500);
  }
}