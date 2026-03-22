import { supabaseAdmin } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// Update a reminder (complete it)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { last_completed_at, last_mileage } = body;

    // First fetch the reminder to get its intervals
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('reminders')
      .select('interval_miles, interval_months')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const updates: any = { last_completed_at, last_mileage };

    // Recalculate next due dates based on intervals
    if (existing.interval_months && last_completed_at) {
      const dueDate = new Date(last_completed_at);
      dueDate.setMonth(dueDate.getMonth() + existing.interval_months);
      updates.next_due_date = dueDate.toISOString();
    }
    if (existing.interval_miles && last_mileage) {
      updates.next_due_mileage = last_mileage + existing.interval_miles;
    }

    const { data, error } = await supabaseAdmin
      .from('reminders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('Update reminder error:', err);
    return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
  }
}

// Delete a reminder
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin
      .from('reminders')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete reminder error:', err);
    return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 });
  }
}