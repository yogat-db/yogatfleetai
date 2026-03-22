// app/api/marketplace/jobs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabaseAdmin.from('jobs').select('*', { count: 'exact' });
    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch jobs error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ jobs: data, count });
  } catch (err: any) {
    console.error('GET unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Parse JSON body
    let body;
    try {
      body = await request.json();
    } catch (err) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // 2. Validate
    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      return NextResponse.json({ error: 'Job title is required' }, { status: 400 });
    }

    // 3. Authenticate
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json({ error: 'Unauthorized – invalid token' }, { status: 401 });
    }

    // 4. Prepare insert
    const jobData = {
      user_id: user.id,
      vehicle_id: body.vehicle_id || null,
      title: body.title.trim(),
      description: body.description || null,
      budget: body.budget ? parseInt(body.budget) : null,
      location: body.location || null,
      lat: body.lat ? parseFloat(body.lat) : null,
      lng: body.lng ? parseFloat(body.lng) : null,
      status: 'open',
      created_at: new Date().toISOString(),
    };

    // 5. Insert into Supabase
    const { data, error } = await supabaseAdmin
      .from('jobs')
      .insert(jobData)
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ job: data }, { status: 201 });
  } catch (err: any) {
    console.error('POST unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}