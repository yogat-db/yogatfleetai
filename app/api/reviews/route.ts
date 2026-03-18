import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Helper to validate UUID format
function isValidUUID(uuid: string) {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return regex.test(uuid)
}

export async function POST(request: Request) {
  try {
   const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { job_id, rating, comment, to_user_id, mechanic_id } = body

    if (!job_id || !rating || !to_user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate UUIDs
    if (!isValidUUID(job_id) || !isValidUUID(to_user_id) || (mechanic_id && !isValidUUID(mechanic_id))) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    // Check if job is completed and belongs to user or mechanic
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('status, user_id')
      .eq('id', job_id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    if (job.status !== 'completed') {
      return NextResponse.json({ error: 'Cannot review incomplete job' }, { status: 400 })
    }

    // Check if user is allowed to review (must be job owner or assigned mechanic)
    const isJobOwner = job.user_id === user.id
    let isMechanic = false
    if (!isJobOwner) {
      const { data: mechanic } = await supabase
        .from('mechanics')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (mechanic) {
        const { data: app } = await supabase
          .from('applications')
          .select('id')
          .eq('job_id', job_id)
          .eq('mechanic_id', mechanic.id)
          .eq('status', 'accepted')
          .maybeSingle()
        isMechanic = !!app
      }
    }

    if (!isJobOwner && !isMechanic) {
      return NextResponse.json({ error: 'Not authorized to review this job' }, { status: 403 })
    }

    // Check for existing review
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('job_id', job_id)
      .eq('from_user_id', user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You have already reviewed this job' }, { status: 400 })
    }

    // Insert review
    const { data, error } = await supabase
      .from('reviews')
      .insert([{
        job_id,
        from_user_id: user.id,
        to_user_id,
        mechanic_id,
        rating,
        comment,
      }])
      .select()
      .single()

    if (error) {
      console.error('Insert review error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    console.error('POST review error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const mechanicId = searchParams.get('mechanicId')
    const jobId = searchParams.get('jobId')

    // Validate UUIDs if provided
    if (userId && !isValidUUID(userId)) {
      return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 })
    }
    if (mechanicId && !isValidUUID(mechanicId)) {
      return NextResponse.json({ error: 'Invalid mechanicId format' }, { status: 400 })
    }
    if (jobId && !isValidUUID(jobId)) {
      return NextResponse.json({ error: 'Invalid jobId format' }, { status: 400 })
    }

    // Use service role client to bypass RLS for reading reviews (but not for user data)
    const supabase = await createClient()

    let query = supabase
      .from('reviews')
      .select(`
        *,
        job:jobs (title)
      `)

    if (userId) {
      query = query.or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    }
    if (mechanicId) {
      query = query.eq('mechanic_id', mechanicId)
    }
    if (jobId) {
      query = query.eq('job_id', jobId)
    }

    const { data: reviews, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Reviews fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return reviews (without user emails – frontend will handle display)
    return NextResponse.json(reviews || [])
  } catch (err: any) {
    console.error('GET reviews error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}