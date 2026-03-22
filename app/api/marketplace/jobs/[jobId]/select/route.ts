import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { mechanicId } = body
    if (!mechanicId) {
      return NextResponse.json({ error: 'mechanicId required' }, { status: 400 })
    }

    // Check job ownership
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('user_id')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    if (job.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update job with assigned mechanic and change status to 'assigned'
    const { error } = await supabase
      .from('jobs')
      .update({ assigned_mechanic_id: mechanicId, status: 'assigned' })
      .eq('id', jobId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}