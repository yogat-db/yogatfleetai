import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // 1. Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Check if user is a mechanic with active subscription
    const { data: mechanic, error: mechanicError } = await supabase
      .from('mechanics')
      .select('id, subscription_status')
      .eq('user_id', user.id)
      .single()

    if (mechanicError || !mechanic) {
      return NextResponse.json({ error: 'Not a registered mechanic' }, { status: 403 })
    }
    if (mechanic.subscription_status !== 'active') {
      return NextResponse.json({ error: 'Subscription not active' }, { status: 402 })
    }

    // 3. Fetch the job to check it exists and is open
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, status')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    if (job.status !== 'open') {
      return NextResponse.json({ error: 'Job is no longer open' }, { status: 400 })
    }

    // 4. Check if mechanic has already applied
    const { data: existing, error: existingError } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('mechanic_id', mechanic.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Already applied to this job' }, { status: 409 })
    }

    // 5. Parse request body
    const body = await request.json()
    const { bid_amount, message } = body

    // Validate bid_amount is a positive number
    if (bid_amount === undefined || typeof bid_amount !== 'number' || bid_amount <= 0) {
      return NextResponse.json({ error: 'Valid bid amount required' }, { status: 400 })
    }

    // 6. Insert the application
    const { data: application, error: insertError } = await supabase
      .from('applications')
      .insert({
        job_id: jobId,
        mechanic_id: mechanic.id,
        bid_amount,
        message: message || null,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    // 7. Optionally, you could trigger a notification here (e.g., send email to job owner)
    // This could be done via an edge function or a separate background job.

    return NextResponse.json(application, { status: 201 })
  } catch (err: any) {
    console.error('Apply to job error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}