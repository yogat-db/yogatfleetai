import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('user_id')
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicle || vehicle.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('service_events') // adjust table name as needed
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('occurred_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Fetch service events error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}