import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: any; value: any; options: any; }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    );

    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    // Default to 50,000 meters (50km) if not specified
    const radiusInMeters = parseFloat(searchParams.get('radius') || '50') * 1609.34;

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'Latitude and Longitude are required for discovery' }, { status: 400 });
    }

    // Use the RPC function for precise geospatial sorting and filtering
    const { data, error } = await supabase.rpc('get_nearby_mechanics', {
      target_lat: lat,
      target_lng: lng,
      radius_meters: radiusInMeters
    });

    if (error) {
      console.error('[GEOSPATIAL_ERROR]:', error.message);
      return NextResponse.json({ error: 'Database geospatial query failed' }, { status: 500 });
    }

    return NextResponse.json({
      count: data.length,
      mechanics: data
    });

  } catch (err: any) {
    console.error('[NEARBY_API_CRASH]:', err);
    return NextResponse.json({ error: 'Internal server error during discovery' }, { status: 500 });
  }
}