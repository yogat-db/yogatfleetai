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

    // Get mechanic profile for this user
    const { data: mechanic } = await supabase
      .from('mechanics')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!mechanic) {
      return NextResponse.json({ error: 'You must be a registered mechanic' }, { status: 403 })
    }

    const body = await req.json()
    const { bid_amount, message } = body

    // Check if already applied
    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', params.jobId)
      .eq('mechanic_id', mechanic.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already applied' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('applications')
      .insert([{
        job_id: params.jobId,
        mechanic_id: mechanic.id,
        bid_amount: bid_amount ? parseInt(bid_amount) : null,
        message,
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}