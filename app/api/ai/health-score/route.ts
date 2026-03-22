import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { computeFleetBrain } from '@/lib/ai'

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
      return NextResponse.json({ error: 'vehicleId or plate required' }, { status: 400 })
    }

    const { data: vehicles, error: dbError } = await query
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
    if (!vehicles || vehicles.length === 0) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    const enriched = computeFleetBrain(vehicles)
    const result = enriched.map(v => ({
      vehicleId: v.id,
      license_plate: v.license_plate,
      health_score: v.health_score,
      risk: v.risk,
    }))

    return NextResponse.json(vehicleId || plate ? result[0] : result)
  } catch (err: any) {
    console.error('Health score error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
