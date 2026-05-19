import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeFleetBrain } from '@/lib/ai';

function jsonError(message: string, status = 500) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

function jsonSuccess(data: unknown, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('Auth error:', authError);
      return jsonError(authError.message, 401);
    }

    if (!user) {
      return jsonError('Unauthorized', 401);
    }

    const { data: vehicles, error: fetchError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id);

    if (fetchError) {
      console.error('Vehicle fetch error:', fetchError);
      return jsonError(fetchError.message, 500);
    }

    if (!vehicles || vehicles.length === 0) {
      return jsonSuccess({
        message: 'No vehicles found',
        updated: 0,
        total: 0,
      });
    }

    const enriched = computeFleetBrain(vehicles);

    const updates = enriched.map((vehicle) => ({
      id: vehicle.id,
      user_id: user.id,
      health_score: vehicle.health_score,
    }));

    const { error: upsertError } = await supabase
      .from('vehicles')
      .upsert(updates, {
        onConflict: 'id',
      });

    if (upsertError) {
      console.error('Bulk update error:', upsertError);
      return jsonError(upsertError.message, 500);
    }

    return jsonSuccess({
      message: 'Health scores updated',
      updated: updates.length,
      total: vehicles.length,
    });
  } catch (error) {
    console.error('POST /api/vehicles/health-score error:', error);
    return jsonError(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}