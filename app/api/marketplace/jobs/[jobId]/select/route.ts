import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
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

    // Verify this user owns the job
    const { data: job } = await supabase
      .from('jobs')
      .select('user_id')
      .eq('id', params.jobId)
      .single()

    if (!job || job.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const { mechanicId } = body

    // Update job status to assigned
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'assigned' })
      .eq('id', params.jobId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // (Optional) Mark all other applications as rejected
    await supabase
      .from('applications')
      .update({ status: 'rejected' })
      .eq('job_id', params.jobId)
      .neq('mechanic_id', mechanicId)

    // Accept the selected application
    await supabase
      .from('applications')
      .update({ status: 'accepted' })
      .eq('job_id', params.jobId)
      .eq('mechanic_id', mechanicId)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}