import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ---------- Types ----------
interface Vehicle {
  id: string;
  license_plate: string;
  make: string | null;
  model: string | null;
  health_score: number | null;
  mileage: number | null;
  year: number | null;
  // ... other fields
}

interface Prediction {
  vehicle_id: string;
  license_plate: string;
  make: string;
  model: string;
  predicted_cost: number;    // GBP
  predicted_days: number;    // days until maintenance recommended
  confidence: 'low' | 'medium' | 'high';
}

// ---------- Core prediction logic (no external AI lib required) ----------
function generatePrediction(vehicle: Vehicle): Prediction {
  // Default values
  let healthScore = vehicle.health_score ?? 100;
  // Clamp between 0 and 100
  healthScore = Math.min(100, Math.max(0, healthScore));

  const mileage = vehicle.mileage ?? 0;
  const year = vehicle.year ?? new Date().getFullYear();
  const age = new Date().getFullYear() - year;

  // Heuristics:
  // - Lower health = higher cost, sooner
  // - Higher mileage = increased cost and urgency
  // - Older vehicle = higher cost

  let predictedCost = Math.round((100 - healthScore) * 12);
  let predictedDays = Math.round((100 - healthScore) * 1.2);

  // Mileage factor (0 to 1)
  let mileageFactor = 0;
  if (mileage > 200000) mileageFactor = 0.8;
  else if (mileage > 100000) mileageFactor = 0.5;
  else if (mileage > 50000) mileageFactor = 0.2;

  // Age factor (0 to 0.5)
  const ageFactor = Math.min(0.5, age / 20);

  predictedCost += Math.round(mileageFactor * 150 + ageFactor * 100);
  predictedDays -= Math.round(mileageFactor * 30 + ageFactor * 20);

  // Bounds
  predictedCost = Math.min(800, Math.max(10, predictedCost));
  predictedDays = Math.min(180, Math.max(3, predictedDays));

  // Confidence based on data completeness
  let confidence: 'low' | 'medium' | 'high' = 'low';
  if (vehicle.health_score !== null && vehicle.mileage !== null && vehicle.year !== null)
    confidence = 'high';
  else if (vehicle.health_score !== null || vehicle.mileage !== null)
    confidence = 'medium';

  return {
    vehicle_id: vehicle.id,
    license_plate: vehicle.license_plate,
    make: vehicle.make ?? 'Unknown',
    model: vehicle.model ?? 'Unknown',
    predicted_cost: predictedCost,
    predicted_days: predictedDays,
    confidence,
  };
}

// ---------- GET Handler ----------
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Predictive maintenance auth error:', userError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const vehicleId = url.searchParams.get('vehicleId');

    if (vehicleId) {
      // Fetch single vehicle
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .select('id, license_plate, make, model, health_score, mileage, year')
        .eq('id', vehicleId)
        .eq('user_id', user.id)
        .single();

      if (error || !vehicle) {
        return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
      }

      const prediction = generatePrediction(vehicle);
      return NextResponse.json(prediction);
    } else {
      // Fetch all vehicles for this user
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, license_plate, make, model, health_score, mileage, year')
        .eq('user_id', user.id);

      if (vehiclesError) {
        console.error('Failed to fetch vehicles:', vehiclesError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      if (!vehicles || vehicles.length === 0) {
        return NextResponse.json([]);
      }

      const predictions: Prediction[] = vehicles.map(generatePrediction);
      return NextResponse.json(predictions);
    }
  } catch (err: any) {
    console.error('Predictive maintenance API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}