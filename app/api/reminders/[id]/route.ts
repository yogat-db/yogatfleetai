import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * REMINDERS MANAGEMENT ROUTE
 * Handles updating (completing) and deleting vehicle service reminders.
 */

async function getMacSafeClient(isAdmin = false) {
  const cookieStore = await cookies();
  const key = isAdmin 
    ? process.env.SUPABASE_SERVICE_ROLE_KEY 
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) throw new Error("Missing Supabase Key");

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: any; value: any; options: any; }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options })
            );
          } catch { /* SSR Safe */ }
        },
      },
      global: {
        fetch: (url: string | Request | URL, options: RequestInit | undefined) => {
          return fetch(url, {
            ...options,
            headers: {
              ...options?.headers,
              // Critical fix for Mac built-in libcurl limitations
              'Accept-Encoding': 'identity',
            },
          });
        },
      },
    }
  );
}

// PUT: Update a reminder (Complete it and calculate next due)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { last_completed_at, last_mileage } = await request.json();
    const supabase = await getMacSafeClient(true); // Using Admin for logic-heavy updates

    // 1. Fetch intervals to calculate next cycle
    const { data: existing, error: fetchError } = await supabase
      .from('reminders')
      .select('interval_miles, interval_months')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    const updates: any = { 
      last_completed_at, 
      last_mileage,
      updated_at: new Date().toISOString()
    };

    // 2. Recalculate Time-based Due Date
    if (existing.interval_months && last_completed_at) {
      const dueDate = new Date(last_completed_at);
      dueDate.setMonth(dueDate.getMonth() + existing.interval_months);
      updates.next_due_date = dueDate.toISOString();
    }

    // 3. Recalculate Mileage-based Due Date
    if (existing.interval_miles && last_mileage) {
      updates.next_due_mileage = Number(last_mileage) + existing.interval_miles;
    }

    // 4. Commit Updates
    const { data, error: updateError } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    return NextResponse.json(data);

  } catch (err: any) {
    console.error('Update reminder error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Remove a reminder
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getMacSafeClient(true);

    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Delete reminder error:', err.message);
    return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 });
  }
}