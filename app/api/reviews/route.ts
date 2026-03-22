import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const url = new URL(req.url)
    const mechanicId = url.searchParams.get('mechanicId')

    if (!mechanicId) {
      return NextResponse.json({ error: 'mechanicId is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        user:auth.users!user_id(email)
      `)
      .eq('mechanic_id', mechanicId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err: any) {
    console.error('Reviews GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { mechanic_id, job_id, rating, comment } = await req.json()

    if (!mechanic_id || !job_id || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the user completed a job with this mechanic
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('user_id, assigned_mechanic_id')
      .eq('id', job_id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.user_id !== user.id) {
      return NextResponse.json({ error: 'You are not the owner of this job' }, { status: 403 })
    }

    if (job.assigned_mechanic_id !== mechanic_id) {
      return NextResponse.json({ error: 'This mechanic was not assigned to the job' }, { status: 403 })
    }

    // Check if a review already exists for this job
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('job_id', job_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Review already exists for this job' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        user_id: user.id,
        mechanic_id,
        job_id,
        rating,
        comment,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    console.error('Reviews POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}