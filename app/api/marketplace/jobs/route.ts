import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
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

    // First, try to fetch jobs with a simpler query to isolate issues
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    if (jobsError) {
      console.error('Jobs fetch error:', jobsError)
      return NextResponse.json({ error: jobsError.message }, { status: 500 })
    }

    // If jobs exist, manually fetch related data to avoid complex joins
    const enrichedJobs = await Promise.all(
      jobs.map(async (job) => {
        const enriched: any = { ...job }

        // Fetch vehicle if vehicle_id exists
        if (job.vehicle_id) {
          const { data: vehicle } = await supabase
            .from('vehicles')
            .select('make, model, license_plate')
            .eq('id', job.vehicle_id)
            .single()
          enriched.vehicle = vehicle || null
        }

        // Fetch user email if needed (optional)
        // const { data: user } = await supabase.auth.admin.getUserById(job.user_id)
        // enriched.user = { email: user?.user?.email }

        return enriched
      })
    )

    return NextResponse.json(enrichedJobs)
  } catch (err: any) {
    console.error('Server error in GET /api/marketplace/jobs:', err)
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
    const { vehicle_id, title, description, budget, location, lat, lng } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert([{
        user_id: user.id,
        vehicle_id,
        title,
        description,
        budget: budget ? parseInt(budget) : null,
        location,
        lat,
        lng,
      }])
      .select()
      .single()

    if (error) {
      console.error('Job insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    console.error('Server error in POST /api/marketplace/jobs:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}