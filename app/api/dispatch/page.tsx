import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET /api/dispatch – list jobs (with optional filters)
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status') // open, assigned, completed
    const mechanicId = url.searchParams.get('mechanicId')
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 50
    const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : 0

    let query = supabase
      .from('jobs')
      .select(`
        *,
        vehicle:vehicles (*),
        user:auth.users (*),
        applications:applications (*)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    // If user is a mechanic, show jobs they've applied to or all open jobs
    // For simplicity, we'll just return jobs based on user role later
    const { data, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ jobs: data, count })
  } catch (err: any) {
    console.error('Server error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/dispatch – create a new job
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      vehicle_id,
      title,
      description,
      dtc_codes,
      complexity,
      location,
      lat,
      lng,
      budget,
    } = body

    // Validation
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!vehicle_id) {
      return NextResponse.json({ error: 'Vehicle is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert([{
        user_id: user.id,
        vehicle_id,
        title,
        description,
        dtc_codes: dtc_codes || [],
        complexity: complexity || 'mechanic',
        status: 'open',
        location,
        lat,
        lng,
        budget: budget ? parseInt(budget) : null,
      }])
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    console.error('Server error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

