// app/api/fleet/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// GET /api/fleet?status=active&type=truck&limit=20&offset=0
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabaseAdmin.from('fleet').select('*', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);

    const { data: vehicles, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fleet GET error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch fleet vehicles' },
        { status: 500 }
      );
    }

    return NextResponse.json({ vehicles, count }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in fleet GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/fleet – create a new vehicle
interface CreateFleetVehiclePayload {
  name: string;
  type: string;
  license_plate?: string;
  status?: string;
  // add other fields as needed
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateFleetVehiclePayload = await request.json();

    // Validation
    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('fleet')
      .insert({
        ...body,
        status: body.status || 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Fleet POST error:', error);
      return NextResponse.json(
        { error: 'Failed to create vehicle' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in fleet POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}