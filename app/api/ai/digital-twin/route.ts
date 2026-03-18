import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { computeFleetBrain } from '@/lib/ai'
import type { Vehicle } from '@/app/types/fleet'

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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const vehicleId = url.searchParams.get('vehicleId')
    const plate = url.searchParams.get('plate')

    let query = supabase.from('vehicles').select('*').eq('user_id', user.id)

    if (vehicleId) {
      query = query.eq('id', vehicleId)
    } else if (plate) {
      query = query.ilike('license_plate', plate)
    } else {
      // Return all vehicles if no specific filter
    }

    const { data: vehicles, error: dbError } = await query

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    if (!vehicles || vehicles.length === 0) {
      return NextResponse.json({ error: 'No vehicles found' }, { status: 404 })
    }

    // Compute digital twin data
    const digitalTwins = computeFleetBrain(vehicles)

    // If single vehicle requested, return object, else array
    if (vehicleId || plate) {
      return NextResponse.json(digitalTwins[0])
    }

    return NextResponse.json(digitalTwins)
  } catch (err: any) {
    console.error('Digital twin API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

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

    const body = await request.json()
    const { vehicleIds } = body

    if (!vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      return NextResponse.json({ error: 'vehicleIds array required' }, { status: 400 })
    }

    const { data: vehicles, error: dbError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)
      .in('id', vehicleIds)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    const digitalTwins = computeFleetBrain(vehicles)
    return NextResponse.json(digitalTwins)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}