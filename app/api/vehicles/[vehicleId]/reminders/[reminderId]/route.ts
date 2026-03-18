import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { computeFleetBrain } from '@/lib/ai'
import type { Vehicle } from '@/app/types/fleet'

// Helper to create Supabase client with cookies
async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set() {},
        remove() {},
      },
    }
  )
}

// GET /api/vehicles/[vehicleId] – retrieve a single vehicle
export async function GET(
  req: Request,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const supabase = await getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', params.vehicleId)
      .eq('user_id', user.id) // enforce ownership
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    // Enrich with AI data
    const enriched = computeFleetBrain([data])[0]
    return NextResponse.json(enriched)
  } catch (err: any) {
    console.error('GET vehicle error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT /api/vehicles/[vehicleId] – update a vehicle
export async function PUT(
  req: Request,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const supabase = await getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership first
    const { data: existing, error: fetchError } = await supabase
      .from('vehicles')
      .select('id')
      .eq('id', params.vehicleId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Vehicle not found or access denied' }, { status: 404 })
    }

    const body = await req.json()
    const { license_plate, make, model, year, mileage, lat, lng, image_url } = body

    // Basic validation
    if (!license_plate) {
      return NextResponse.json({ error: 'License plate is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('vehicles')
      .update({
        license_plate: license_plate.toUpperCase().replace(/\s+/g, ''),
        make,
        model,
        year: year ? parseInt(year) : null,
        mileage: mileage ? parseInt(mileage) : null,
        lat,
        lng,
        image_url,
      })
      .eq('id', params.vehicleId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const enriched = computeFleetBrain([data])[0]
    return NextResponse.json(enriched)
  } catch (err: any) {
    console.error('PUT vehicle error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/vehicles/[vehicleId] – delete a vehicle
export async function DELETE(
  req: Request,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const supabase = await getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', params.vehicleId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE vehicle error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}