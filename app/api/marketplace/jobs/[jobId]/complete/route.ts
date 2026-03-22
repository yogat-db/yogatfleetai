import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function PATCH(
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

    // 1. Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Fetch the job and its assigned mechanic
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, status, assigned_mechanic_id, user_id')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // 3. Verify the job is in the correct state
    if (job.status !== 'assigned') {
      return NextResponse.json(
        { error: 'Job is not in assigned state' },
        { status: 400 }
      )
    }

    // 4. Verify the current user is the assigned mechanic
    if (!job.assigned_mechanic_id) {
      return NextResponse.json(
        { error: 'No mechanic assigned to this job' },
        { status: 400 }
      )
    }

    // Get the mechanic's user_id to compare
    const { data: mechanic, error: mechanicError } = await supabase
      .from('mechanics')
      .select('user_id')
      .eq('id', job.assigned_mechanic_id)
      .single()

    if (mechanicError || !mechanic) {
      return NextResponse.json(
        { error: 'Assigned mechanic not found' },
        { status: 500 }
      )
    }

    if (mechanic.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 5. Update the job status to 'completed'
    const { data: updatedJob, error: updateError } = await supabase
      .from('jobs')
      .update({ status: 'completed' })
      .eq('id', jobId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 6. (Optional) Insert a record into `earnings` table for the mechanic
    // This would typically be done after payment confirmation, but you could create a pending record here.
    // For now, we skip it.

    // 7. (Optional) Notify the job owner that the job is completed
    // This could be done via an edge function or a background job.

    return NextResponse.json(updatedJob, { status: 200 })
  } catch (err: any) {
    console.error('Complete job error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}