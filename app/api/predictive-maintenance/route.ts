import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * PREDICTIVE MAINTENANCE ENGINE
 * Generates cost and time estimates based on vehicle health.
 */

export async function GET() {
  try {
    const cookieStore = await cookies();

    // 1. Create Mac-Safe Supabase Client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: any; value: any; options: any; }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, { ...options })
              );
            } catch { /* SSR Safe */ }
          },
        },
        global: {
          fetch: (url: string | URL | Request, options: RequestInit | undefined) => {
            return fetch(url, {
              ...options,
              headers: {
                ...options?.headers,
                // Fix for the Mac "libcurl" feature error
                'Accept-Encoding': 'identity',
              },
            });
          },
        },
      }
    );

    // 2. Auth Check
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ predictions: [] });
    }

    // 3. Fetch Vehicles
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, make, model, health_score, mileage')
      .eq('user_id', user.id);

    if (vehiclesError) {
      console.error('Vehicles fetch error:', vehiclesError);
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }

    // 4. Generate Enhanced Predictions
    const predictions = (vehicles || []).map(vehicle => {
      const health = vehicle.health_score ?? 100;
      const mileage = vehicle.mileage ?? 0;
      
      // Calculate risk: Lower health + Higher mileage = Higher risk
      const healthRisk = (100 - health) / 100;
      const mileageModifier = Math.min(0.5, mileage / 200000); 
      const totalRisk = Math.min(1, healthRisk + (mileageModifier * 0.2));

      // Financial Estimates
      const baseCost = 150;
      const predictedCost = Math.round(baseCost + (totalRisk * 850));

      // Timeline Estimates (Days until service needed)
      // High risk = sooner (7-14 days), Low risk = later (90-180 days)
      const days = totalRisk > 0.8 
        ? Math.floor(Math.random() * 7) + 3  // Critical
        : Math.max(7, Math.round(180 * (1 - totalRisk)));

      return {
        vehicleId: vehicle.id,
        vehicleName: `${vehicle.make} ${vehicle.model}`,
        healthScore: health,
        predictedCost,
        days,
        priority: totalRisk > 0.6 ? 'high' : totalRisk > 0.3 ? 'medium' : 'low'
      };
    });

    return NextResponse.json({ predictions });
    
  } catch (err: any) {
    console.error('Predictive maintenance error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}