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
  last_service_date?: string | null;
}

interface EnrichedVehicle {
  id: string;
  license_plate: string;
  health_score: number;
  risk: 'low' | 'medium' | 'high';
  predicted_cost?: number;
  predicted_days?: number;
}

// ---------- Core logic (no external AI lib) ----------
function computeVehicleHealthAndRisk(vehicle: Vehicle): EnrichedVehicle {
  let healthScore = vehicle.health_score ?? 100;
  // Clamp
  healthScore = Math.min(100, Math.max(0, healthScore));

  // Risk assessment based on health score
  let risk: 'low' | 'medium' | 'high' = 'low';
  if (healthScore < 40) risk = 'high';
  else if (healthScore < 70) risk = 'medium';

  // Additional logic: if mileage is high, increase risk
  const mileage = vehicle.mileage ?? 0;
  if (mileage > 100000 && risk !== 'high') risk = 'medium';
  if (mileage > 200000) risk = 'high';

  // Optional: adjust health score downwards if mileage very high
  if (mileage > 150000 && healthScore > 50) {
    healthScore = Math.max(20, healthScore - 10);
  }

  // Generate simple predictions for frontend
  const predictedCost = Math.round((100 - healthScore) * 12);
  const predictedDays = Math.round((100 - healthScore) * 1.2);

  return {
    id: vehicle.id,
    license_plate: vehicle.license_plate,
    health_score: Math.round(healthScore),
    risk,
    predicted_cost: Math.min(800, Math.max(10, predictedCost)),
    predicted_days: Math.min(180, Math.max(3, predictedDays)),
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
          get(name: string) { return cookieStore.get(name)?.value; },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const vehicleId = url.searchParams.get('vehicleId');
    const plate = url.searchParams.get('plate');

    let query = supabase
      .from('vehicles')
      .select('id, license_plate, make, model, health_score, mileage, year, last_service_date')
      .eq('user_id', user.id);

    if (vehicleId) {
      query = query.eq('id', vehicleId);
    } else if (plate) {
      query = query.ilike('license_plate', `%${plate}%`);
    } else {
      // If neither provided, return all vehicles (optional)
      const { data: allVehicles, error: allError } = await query;
      if (allError) return NextResponse.json({ error: allError.message }, { status: 500 });
      if (!allVehicles || allVehicles.length === 0) {
        return NextResponse.json([]);
      }
      const enrichedAll = allVehicles.map(computeVehicleHealthAndRisk);
      return NextResponse.json(enrichedAll);
    }

    const { data: vehicles, error: dbError } = await query;
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    if (!vehicles || vehicles.length === 0) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const enriched = vehicles.map(computeVehicleHealthAndRisk);
    // Return single object if we queried by specific ID or plate, else array
    const result = vehicleId || plate ? enriched[0] : enriched;
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Health score API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}