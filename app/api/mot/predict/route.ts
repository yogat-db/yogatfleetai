import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function monthsUntilDue(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMonths = (expiry.getFullYear() - now.getFullYear()) * 12 + (expiry.getMonth() - now.getMonth());
  return diffMonths;
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

    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, make, model, license_plate, mot_expiry_date')
      .eq('id', vehicleId)
      .eq('user_id', user.id)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    let prediction = {
      isDueSoon: false,
      monthsRemaining: null as number | null,
      advice: '',
    };

    if (vehicle.mot_expiry_date) {
      const months = monthsUntilDue(vehicle.mot_expiry_date);
      prediction.monthsRemaining = months;
      if (months !== null && months <= 1) {
        prediction.isDueSoon = true;
        prediction.advice = 'Your MOT is due within 1 month. Schedule a test soon.';
      } else if (months !== null && months <= 3) {
        prediction.isDueSoon = true;
        prediction.advice = `Your MOT is due in ${months} months. Book a test to avoid last‑minute rush.`;
      } else if (months !== null && months <= 6) {
        prediction.advice = `Your MOT is due in ${months} months. You can still book ahead.`;
      } else {
        prediction.advice = 'Your MOT is not due soon. Continue regular maintenance.';
      }
    } else {
      prediction.advice = 'No MOT expiry date on file. Please update your vehicle record.';
    }

    return NextResponse.json({
      vehicle: {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        license_plate: vehicle.license_plate,
      },
      prediction,
    });
  } catch (err: any) {
    console.error('MOT prediction error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}