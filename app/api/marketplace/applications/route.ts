import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    // Regular user client (for auth and fetching)
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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { jobId, mechanicId, bidAmount, message } = await req.json()

    if (!jobId || !mechanicId || !bidAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify mechanic belongs to user
    const { data: mechanic } = await supabase
      .from('mechanics')
      .select('id')
      .eq('id', mechanicId)
      .eq('user_id', user.id)
      .single()

    if (!mechanic) {
      return NextResponse.json({ error: 'Invalid mechanic' }, { status: 403 })
    }

    // Check if already applied
    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('mechanic_id', mechanicId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You have already applied to this job' }, { status: 400 })
    }

    // Insert application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .insert({
        job_id: jobId,
        mechanic_id: mechanicId,
        bid_amount: bidAmount,
        message,
        status: 'pending',
      })
      .select('*, job:jobs(user_id, title)')
      .single()

    if (appError) return NextResponse.json({ error: appError.message }, { status: 400 })

    // --- Create notification for job owner ---
    // Use service role client to bypass RLS
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
        },
      }
    )

    const jobOwnerId = application.job.user_id
    const jobTitle = application.job.title

    await supabaseAdmin.from('notifications').insert({
      user_id: jobOwnerId,
      type: 'job_application',
      title: 'New Job Application',
      message: `A mechanic applied to your job "${jobTitle}" with a bid of £${bidAmount}.`,
      link: `/marketplace/jobs/${jobId}`,
    })

    return NextResponse.json(application, { status: 201 })
  } catch (err: any) {
    console.error('Application error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}