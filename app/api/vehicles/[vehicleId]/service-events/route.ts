import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET /api/vehicles/[vehicleId]/service-events – list all events for a vehicle
export async function GET(
  req: Request,
  { params }: { params: { vehicleId: string } }
) {
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

    // Verify that the vehicle belongs to the user
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id')
      .eq('id', params.vehicleId)
      .eq('user_id', user.id)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    const { data: events, error: eventsError } = await supabase
      .from('service_events')
      .select('*')
      .eq('vehicle_id', params.vehicleId)
      .order('occurred_at', { ascending: false })

    if (eventsError) {
      console.error('Error fetching service events:', eventsError)
      return NextResponse.json({ error: eventsError.message }, { status: 500 })
    }

    return NextResponse.json(events || [])
  } catch (err: any) {
    console.error('GET service events error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/vehicles/[vehicleId]/service-events – create a new service event
export async function POST(
  req: Request,
  { params }: { params: { vehicleId: string } }
) {
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

    // Verify vehicle ownership
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id')
      .eq('id', params.vehicleId)
      .eq('user_id', user.id)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    const body = await req.json()
    const { title, description, mileage, occurred_at, image_url } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('service_events')
      .insert([{
        vehicle_id: params.vehicleId,
        title: title.trim(),
        description: description?.trim() || null,
        mileage: mileage ? parseInt(mileage) : null,
        occurred_at: occurred_at || new Date().toISOString(),
        image_url,
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating service event:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    console.error('POST service event error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}