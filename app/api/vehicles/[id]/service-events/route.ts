import { supabaseAdmin } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from('service_events') // adjust table name if needed (e.g., 'maintenance_schedules')
      .select('*')
      .eq('vehicle_id', id)
      .order('occurred_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Fetch service events error:', err);
    return NextResponse.json({ error: 'Failed to load service events' }, { status: 500 });
  }
}