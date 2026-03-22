import { supabaseAdmin } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// GET all reminders for a vehicle
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from('reminders') // adjust table name if needed
      .select('*')
      .eq('vehicle_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Fetch reminders error:', err);
    return NextResponse.json({ error: 'Failed to load reminders' }, { status: 500 });
  }
}

// POST a new reminder
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;
    const body = await request.json();
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

    const { data, error } = await supabaseAdmin
      .from('reminders')
      .insert({
        vehicle_id: vehicleId,
        task,
        interval_miles: interval_miles || null,
        interval_months: interval_months || null,
        next_due_date,
        // next_due_mileage can be set later when vehicle mileage is known
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('Create reminder error:', err);
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
  }
}