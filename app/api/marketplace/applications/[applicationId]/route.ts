import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function PUT(
  req: Request,
  { params }: { params: { applicationId: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set() {},
          remove() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { status } = body  // expected: 'accepted' or 'rejected'

    if (!['accepted', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Get application with job details
    const { data: application, error: fetchError } = await supabase
      .from('applications')
      .select('job_id, mechanic_id')
      .eq('id', params.applicationId)
      .single()

    if (fetchError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Get job to check ownership
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('user_id')
      .eq('id', application.job_id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.user_id !== user.id) {
      return NextResponse.json({ error: 'Only job owner can update application status' }, { status: 403 })
    }

    // Update application status
    const { data: updatedApp, error: updateError } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', params.applicationId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    // If accepted, update job status to 'assigned'
    if (status === 'accepted') {
      await supabase
        .from('jobs')
        .update({ status: 'assigned' })
        .eq('id', application.job_id)
    }

    return NextResponse.json(updatedApp)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}