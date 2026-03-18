import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Helper to verify event belongs to user
async function verifyEventOwnership(supabase: any, eventId: string, userId: string) {
  // First, get the event's vehicle_id
  const { data: event, error: eventError } = await supabase
    .from('service_events')
    .select('vehicle_id')
    .eq('id', eventId)
    .single()

  if (eventError || !event) return false

  // Then check if that vehicle belongs to the user
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('user_id')
    .eq('id', event.vehicle_id)
    .single()

  if (vehicleError || !vehicle) return false

  return vehicle.user_id === userId
}

// GET /api/service-events/[eventId] – retrieve a single event
export async function GET(
  req: Request,
  { params }: { params: { eventId: string } }
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch event with vehicle data (optional, but needed for response)
    const { data: event, error } = await supabase
      .from('service_events')
      .select(`
        *,
        vehicle:vehicles(*)
      `)
      .eq('id', params.eventId)
      .single()

    if (error || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Verify ownership
    if (event.vehicle?.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json(event)
  } catch (err: any) {
    console.error('GET service event error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT /api/service-events/[eventId] – update an event
export async function PUT(
  req: Request,
  { params }: { params: { eventId: string } }
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const isOwner = await verifyEventOwnership(supabase, params.eventId, user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const { title, description, mileage, occurred_at, image_url } = body

    const { data, error } = await supabase
      .from('service_events')
      .update({
        title,
        description,
        mileage: mileage ? parseInt(mileage) : null,
        occurred_at,
        image_url,
      })
      .eq('id', params.eventId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('PUT service event error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/service-events/[eventId] – delete an event
export async function DELETE(
  req: Request,
  { params }: { params: { eventId: string } }
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const isOwner = await verifyEventOwnership(supabase, params.eventId, user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await supabase
      .from('service_events')
      .delete()
      .eq('id', params.eventId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE service event error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}