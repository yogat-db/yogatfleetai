// app/api/jobs/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body = await req.json();
    const { title, description, budget, location, vehicle_id, status = 'open' } = body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return NextResponse.json({ error: 'Title is required (min 3 characters)' }, { status: 400 });
    }
    if (description && typeof description !== 'string') {
      return NextResponse.json({ error: 'Description must be a string' }, { status: 400 });
    }
    if (budget !== undefined && (typeof budget !== 'number' || budget <= 0)) {
      return NextResponse.json({ error: 'Budget must be a positive number' }, { status: 400 });
    }
    if (location && typeof location !== 'string') {
      return NextResponse.json({ error: 'Location must be a string' }, { status: 400 });
    }
    if (vehicle_id && typeof vehicle_id !== 'string') {
      return NextResponse.json({ error: 'Vehicle ID must be a string' }, { status: 400 });
    }

    // 3. Insert job into the database
    const { data: job, error: insertError } = await supabase
      .from('jobs')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        budget: budget || null,
        location: location?.trim() || null,
        vehicle_id: vehicle_id || null,
        user_id: user.id,
        status,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert job error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(job, { status: 201 });
  } catch (err: any) {
    console.error('Unexpected error in POST /api/jobs:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Optional: GET /api/jobs – fetch jobs (with filters)
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('jobs')
      .select('*, vehicles:vehicles(make, model, license_plate)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('GET /api/jobs error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}