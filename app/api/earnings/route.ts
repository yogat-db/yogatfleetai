import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { mechanicId, jobId, amount } = await req.json()

    // Verify that the mechanic belongs to the user
    const { data: mechanic } = await supabase
      .from('mechanics')
      .select('id')
      .eq('id', mechanicId)
      .eq('user_id', user.id)
      .single()

    if (!mechanic) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { data, error } = await supabase
      .from('earnings')
      .insert({
        mechanic_id: mechanicId,
        job_id: jobId,
        amount,
        status: 'pending', // initially pending; you can mark as paid later via Stripe transfer
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}