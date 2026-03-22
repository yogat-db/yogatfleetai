import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { computeFleetBrain } from '@/lib/ai'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })

    const twin = computeFleetBrain([vehicle])[0]
    return NextResponse.json(twin)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}