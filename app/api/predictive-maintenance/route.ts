import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Await the server client (it returns a Promise in Next.js 15)
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ predictions: [] });
    }

    // Fetch vehicles for the current user
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, make, model, health_score, mileage')
      .eq('user_id', user.id);

    if (vehiclesError) {
      console.error('Vehicles fetch error:', vehiclesError);
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }

    // Generate predictions based on health score
    const predictions = (vehicles || []).map(vehicle => {
      const health = vehicle.health_score ?? 100;
      const riskFactor = (100 - health) / 100;
      const baseCost = 200;
      const predictedCost = Math.round(baseCost + riskFactor * 500);
      const days = Math.max(7, Math.round(90 * riskFactor));
      return {
        vehicleId: vehicle.id,
        vehicleName: `${vehicle.make} ${vehicle.model}`,
        predictedCost,
        days,
      };
    });

    return NextResponse.json({ predictions });
  } catch (err) {
    console.error('Predictive maintenance error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}