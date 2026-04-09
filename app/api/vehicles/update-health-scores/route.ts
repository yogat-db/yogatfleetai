import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeFleetBrain } from '@/lib/ai';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all vehicles for this user
    const { data: vehicles, error: fetchError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id);

    if (fetchError) throw fetchError;
    if (!vehicles || vehicles.length === 0) {
      return NextResponse.json({ message: 'No vehicles found', updated: 0 });
    }

    // Compute enriched data (includes health_score)
    const enriched = computeFleetBrain(vehicles);

    // Update each vehicle with its health_score
    let updatedCount = 0;
    for (const vehicle of enriched) {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ health_score: vehicle.health_score })
        .eq('id', vehicle.id);

      if (!updateError) updatedCount++;
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      total: vehicles.length,
    });
  } catch (err: any) {
    console.error('Health score update error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}