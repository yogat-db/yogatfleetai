import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
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

    // Only job owner can see applications
    const { data: job } = await supabase
      .from('jobs')
      .select('user_id')
      .eq('id', jobId)
      .single()

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    if (job.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        mechanic:mechanics(*)
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(
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

    // Check if user is a mechanic
    const { data: mechanic } = await supabase
      .from('mechanics')
      .select('id, subscription_status')
      .eq('user_id', user.id)
      .single()

    if (!mechanic) {
      return NextResponse.json({ error: 'Not a mechanic' }, { status: 403 })
    }
    if (mechanic.subscription_status !== 'active') {
      return NextResponse.json({ error: 'Subscription not active' }, { status: 402 })
    }

    const body = await req.json()
    const { bid_amount, message } = body

    const { data, error } = await supabase
      .from('applications')
      .insert({
        job_id: jobId,
        mechanic_id: mechanic.id,
        bid_amount,
        message,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}