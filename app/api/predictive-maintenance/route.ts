import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type VehicleRow = {
  id: string;
  make: string | null;
  model: string | null;
  health_score: number | null;
  mileage: number | null;
};

type PredictionPriority = 'low' | 'medium' | 'high';

type Prediction = {
  vehicleId: string;
  vehicleName: string;
  healthScore: number;
  predictedCost: number;
  days: number;
  priority: PredictionPriority;
  riskScore: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function safeVehicleName(make: string | null, model: string | null) {
  const name = [make, model].filter(Boolean).join(' ').trim();
  return name || 'Unknown vehicle';
}

function buildPrediction(vehicle: VehicleRow): Prediction {
  const health = clamp(vehicle.health_score ?? 100, 0, 100);
  const mileage = Math.max(0, vehicle.mileage ?? 0);

  const healthRisk = (100 - health) / 100;
  const mileageRisk = Math.min(1, mileage / 200000);

  const riskScore = clamp(healthRisk * 0.8 + mileageRisk * 0.2, 0, 1);

  const predictedCost = Math.round(150 + riskScore * 850);

  const days = clamp(Math.round(180 - riskScore * 170), 3, 180);

  let priority: PredictionPriority = 'low';
  if (riskScore > 0.6) priority = 'high';
  else if (riskScore > 0.3) priority = 'medium';

  return {
    vehicleId: vehicle.id,
    vehicleName: safeVehicleName(vehicle.make, vehicle.model),
    healthScore: health,
    predictedCost,
    days,
    priority,
    riskScore: Number(riskScore.toFixed(2)),
  };
}

export async function GET() {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: any; value: any; options: any; }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Safe in contexts where cookies cannot be written
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: true,
          predictions: [],
          error: null,
        },
        { status: 200 }
      );
    }

    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, make, model, health_score, mileage')
      .eq('user_id', user.id)
      .returns<VehicleRow[]>();

    if (vehiclesError) {
      console.error('[predictive-maintenance] Vehicles fetch error:', vehiclesError);

      return NextResponse.json(
        {
          success: false,
          predictions: [],
          error: 'Failed to fetch vehicles',
        },
        { status: 500 }
      );
    }

    const predictions = (vehicles ?? []).map(buildPrediction);

    return NextResponse.json(
      {
        success: true,
        predictions,
        error: null,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('[predictive-maintenance] Unexpected error:', error);

    return NextResponse.json(
      {
        success: false,
        predictions: [],
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}