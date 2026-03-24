import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;
    const supabase = await createClient();

    // Authenticate
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify vehicle belongs to user
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('user_id')
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicle || vehicle.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch reminders
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Fetch reminders error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;
    const supabase = await createClient();

    // Authenticate
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

    const body = await req.json();
    const { task, interval_miles, interval_months } = body;

    if (!task) {
      return NextResponse.json({ error: 'Task is required' }, { status: 400 });
    }

    // Calculate initial next due date (if interval_months provided)
    let next_due_date: string | null = null;
    if (interval_months) {
      const date = new Date();
      date.setMonth(date.getMonth() + interval_months);
      next_due_date = date.toISOString();
    }

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        vehicle_id: vehicleId,
        user_id: user.id,
        task,
        interval_miles: interval_miles || null,
        interval_months: interval_months || null,
        next_due_date,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('Create reminder error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}