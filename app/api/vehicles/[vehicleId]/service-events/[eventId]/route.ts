import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch event with vehicle data to verify ownership
    const { data: event, error } = await supabase
      .from('service_events')
      .select(`
        *,
        vehicle:vehicles (*)
      `)
      .eq('id', params.eventId)
      .single()

    if (error || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Verify that the associated vehicle belongs to the user
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, fetch the event to verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('service_events')
      .select('vehicle:vehicles(user_id)')
      .eq('id', params.eventId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // @ts-ignore – the nested select returns vehicle as an object with user_id
    if (existing.vehicle?.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const { title, description, mileage, occurred_at, image_url } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('service_events')
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        mileage: mileage ? parseInt(mileage) : null,
        occurred_at,
        image_url,
      })
      .eq('id', params.eventId)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership via vehicle (similar to PUT)
    const { data: existing, error: fetchError } = await supabase
      .from('service_events')
      .select('vehicle:vehicles(user_id)')
      .eq('id', params.eventId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // @ts-ignore
    if (existing.vehicle?.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await supabase
      .from('service_events')
      .delete()
      .eq('id', params.eventId)

    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE service event error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}