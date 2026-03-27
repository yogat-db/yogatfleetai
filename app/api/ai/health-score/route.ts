import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Helper to compute a health score based on vehicle data
function computeHealthScore(vehicle: any): number {
  // Start with a baseline of 100
  let score = 100;

  // Mileage factor (higher mileage reduces score)
  if (vehicle.mileage) {
    const mileageDeduction = Math.min(30, Math.floor(vehicle.mileage / 5000));
    score -= mileageDeduction;
  }

  // Age factor (older vehicles lose points)
  if (vehicle.year) {
    const age = new Date().getFullYear() - vehicle.year;
    const ageDeduction = Math.min(20, age * 2);
    score -= ageDeduction;
  }

  // Status adjustments
  if (vehicle.status === 'warning') score -= 10;
  if (vehicle.status === 'critical') score -= 20;

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const vehicleId = url.searchParams.get('vehicleId');

    if (!vehicleId) {
      return NextResponse.json({ error: 'Vehicle ID is required' }, { status: 400 });
    }

    // Fetch vehicle data (ensure ownership)
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .eq('user_id', user.id)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Compute health score
    const healthScore = computeHealthScore(vehicle);

    // Generate a brief insight (can be replaced with AI)
    let insight = '';
    if (healthScore >= 80) {
      insight = 'Your vehicle is in great condition. Continue with regular maintenance.';
    } else if (healthScore >= 60) {
      insight = 'Your vehicle is in good condition but some maintenance may be due soon.';
    } else if (healthScore >= 40) {
      insight = 'Your vehicle needs attention soon. Consider scheduling a check‑up.';
    } else {
      insight = 'Your vehicle requires immediate service to avoid breakdown.';
    }

    // Optional: include a list of recommended actions
    const recommendations: string[] = [];
    if (healthScore < 80) recommendations.push('Check engine and transmission fluids');
    if (healthScore < 70) recommendations.push('Inspect brakes and tires');
    if (healthScore < 60) recommendations.push('Schedule a full diagnostic');
    if (healthScore < 40) recommendations.push('Immediate service recommended');

    return NextResponse.json({
      healthScore,
      insight,
      recommendations,
      vehicle: {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        mileage: vehicle.mileage,
        status: vehicle.status,
      },
    });
  } catch (err: any) {
    console.error('Health score API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}