import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeFleetBrain } from '@/lib/ai'
import type { Vehicle } from '@/app/types/fleet'

// GET /api/vehicles – returns all vehicles for the authenticated user
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: vehicles, error: dbError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Enrich vehicles with AI data
    const enriched = computeFleetBrain(vehicles || [])
    return NextResponse.json(enriched)
  } catch (err: any) {
    console.error('Server error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/vehicles – adds a new vehicle
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Received payload:', body) // helpful for debugging

    const { registration, make, model, year, mileage, lat, lng, image_url } = body

    if (!registration) {
      return NextResponse.json({ error: 'Registration is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('vehicles')
      .insert([{
        user_id: user.id,
        license_plate: registration.toUpperCase(),
        make,
        model,
        year: year ? parseInt(year) : null,
        mileage: mileage ? parseInt(mileage) : null,
        lat,
        lng,
        image_url,
      }])
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const enriched = computeFleetBrain([data])[0]
    return NextResponse.json(enriched, { status: 201 })
  } catch (err: any) {
    console.error('Server error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

