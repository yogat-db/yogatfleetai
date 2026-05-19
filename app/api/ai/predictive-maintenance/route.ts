// app/api/ai/predictive-maintenance/route.ts
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface Vehicle {
  id: string;
  user_id: string;
  license_plate: string;
  make: string | null;
  model: string | null;
  health_score: number | null;
  mileage: number | null;
  year: number | null;
}

interface Prediction {
  vehicle_id: string;
  license_plate: string;
  make: string;
  model: string;
  predicted_cost: number;
  predicted_days: number;
  confidence: 'low' | 'medium' | 'high';
}

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

function generatePrediction(vehicle: Vehicle): Prediction {
  let healthScore = vehicle.health_score ?? 100;
  healthScore = Math.min(100, Math.max(0, healthScore));

  const mileage = vehicle.mileage ?? 0;
  const year = vehicle.year ?? new Date().getFullYear();
  const age = new Date().getFullYear() - year;

  let predictedCost = Math.round((100 - healthScore) * 12);
  let predictedDays = Math.round((100 - healthScore) * 1.2);

  let mileageFactor = 0;
  if (mileage > 200000) mileageFactor = 0.8;
  else if (mileage > 100000) mileageFactor = 0.5;
  else if (mileage > 50000) mileageFactor = 0.2;

  const ageFactor = Math.min(0.5, age / 20);

  predictedCost += Math.round(mileageFactor * 150 + ageFactor * 100);
  predictedDays -= Math.round(mileageFactor * 30 + ageFactor * 20);

  predictedCost = Math.min(800, Math.max(10, predictedCost));
  predictedDays = Math.min(180, Math.max(3, predictedDays));

  let confidence: 'low' | 'medium' | 'high' = 'low';
  if (
    vehicle.health_score !== null &&
    vehicle.mileage !== null &&
    vehicle.year !== null
  ) {
    confidence = 'high';
  } else if (
    vehicle.health_score !== null ||
    vehicle.mileage !== null
  ) {
    confidence = 'medium';
  }

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

async function getAuthenticatedUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Ignore cookie write failures in unsupported contexts.
        }
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

async function isAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle<{ role: string | null }>();

  if (error) {
    console.error('[predictive-maintenance] role lookup failed:', error);
    return false;
  }

  return data?.role === 'admin';
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await isAdmin(user.id);
    const url = new URL(request.url);
    const vehicleId = url.searchParams.get('vehicleId');

    if (vehicleId) {
      let query = supabaseAdmin
        .from('vehicles')
        .select('id, user_id, license_plate, make, model, health_score, mileage, year')
        .eq('id', vehicleId);

      if (!admin) {
        query = query.eq('user_id', user.id);
      }

      const { data: vehicle, error } = await query.single();

      if (error || !vehicle) {
        return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
      }

      return NextResponse.json(generatePrediction(vehicle as Vehicle));
    }

    let query = supabaseAdmin
      .from('vehicles')
      .select('id, user_id, license_plate, make, model, health_score, mileage, year')
      .order('license_plate', { ascending: true });

    if (!admin) {
      query = query.eq('user_id', user.id);
    }

    const { data: vehicles, error: vehiclesError } = await query;

    if (vehiclesError) {
      console.error('[predictive-maintenance] failed to fetch vehicles:', vehiclesError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!vehicles || vehicles.length === 0) {
      return NextResponse.json([]);
    }

    const predictions: Prediction[] = (vehicles as Vehicle[]).map(generatePrediction);
    return NextResponse.json(predictions);
  } catch (error) {
    console.error('[predictive-maintenance] unexpected error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}