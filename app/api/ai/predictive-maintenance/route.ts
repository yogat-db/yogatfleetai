import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { computeFleetBrain } from '@/lib/ai';

// Helper to generate predictive maintenance data for a single vehicle
function generatePredictions(vehicle: any, enriched: any) {
  // Use health score or fallback to default
  const healthScore = enriched.health_score ?? 100;

  // Simple heuristics:
  // - Lower health => higher predicted cost
  // - Lower health => shorter time until maintenance
  const predictedCost = Math.round((100 - healthScore) * 15);
  const predictedDays = Math.round((100 - healthScore) * 1.5);

  // Additional logic: if mileage is high, increase cost/time
  const mileage = vehicle.mileage ?? 0;
  const mileageFactor = Math.max(0, (mileage - 50000) / 50000);
  const finalCost = Math.min(500, Math.max(0, predictedCost + mileageFactor * 100));
  const finalDays = Math.min(180, Math.max(7, predictedDays + mileageFactor * 30));

  return {
    vehicle_id: vehicle.id,
    license_plate: vehicle.license_plate,
    make: vehicle.make ?? 'Unknown',
    model: vehicle.model ?? 'Unknown',
    predicted_cost: Math.round(finalCost),
    predicted_days: Math.round(finalDays),
  };
}

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

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const vehicleId = url.searchParams.get('vehicleId');

    if (vehicleId) {
      // Fetch single vehicle
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .eq('user_id', user.id)
        .single();

      if (error || !vehicle) {
        return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
      }

      const enriched = computeFleetBrain([vehicle])[0];
      const predictions = generatePredictions(vehicle, enriched);
      return NextResponse.json(predictions);
    } else {
      // Fetch all vehicles for this user
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id);

      if (vehiclesError) {
        throw vehiclesError;
      }

      if (!vehicles || vehicles.length === 0) {
        return NextResponse.json([]);
      }

      const enrichedVehicles = computeFleetBrain(vehicles);
      const predictionsArray = vehicles.map((vehicle, index) =>
        generatePredictions(vehicle, enrichedVehicles[index])
      );

      return NextResponse.json(predictionsArray);
    }
  } catch (err: any) {
    console.error('Predictive maintenance API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
