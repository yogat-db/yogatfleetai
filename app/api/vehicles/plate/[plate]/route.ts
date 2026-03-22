// app/api/vehicles/plate/[plate]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // use the server client

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ plate: string }> }
) {
  try {
    const { plate } = await params;
    console.log('Looking up vehicle with plate:', plate); // helpful for debugging

    const supabase = await createClient(); // await if your createClient is async

    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .ilike('license_plate', plate)
      .maybeSingle();

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Vehicle API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}