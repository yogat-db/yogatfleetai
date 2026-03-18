import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Haversine formula to calculate distance between two lat/lng points in miles
function distanceInMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// GET /api/marketplace/mechanics – search nearby mechanics
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
        },
      }
    )

    // Optional: require authentication (remove if you want public listing)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const lat = url.searchParams.get('lat')
    const lng = url.searchParams.get('lng')
    const radius = url.searchParams.get('radius') // in miles

    // If location provided, filter by distance
    if (lat && lng && radius) {
      const userLat = parseFloat(lat)
      const userLng = parseFloat(lng)
      const maxDistance = parseFloat(radius)

      // Fetch all mechanics with coordinates
      const { data: mechanics, error } = await supabase
        .from('mechanics')
        .select('*')
        .not('lat', 'is', null)
        .not('lng', 'is', null)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Filter and add distance
      const nearby = mechanics
        .map(m => ({
          ...m,
          distance: distanceInMiles(userLat, userLng, m.lat, m.lng),
        }))
        .filter(m => m.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance)

      return NextResponse.json(nearby)
    }

    // If no location, return all mechanics (optionally limit)
    const { data: mechanics, error } = await supabase
      .from('mechanics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(mechanics)
  } catch (err: any) {
    console.error('GET mechanics error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/marketplace/mechanics – register a new mechanic
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already has a mechanic profile
    const { data: existing } = await supabase
      .from('mechanics')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already registered as mechanic' }, { status: 400 })
    }

    const body = await request.json()
    const { business_name, phone, address, lat, lng, service_radius } = body

    const { data, error } = await supabase
      .from('mechanics')
      .insert([{
        user_id: user.id,
        business_name,
        phone,
        address,
        lat,
        lng,
        service_radius,
        subscription_status: 'inactive', // default
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    console.error('POST mechanics error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}