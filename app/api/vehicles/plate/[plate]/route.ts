import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { computeFleetBrain } from '@/lib/ai'

export async function GET(
  req: Request,
  { params }: { params: { plate: string } }
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const plate = params.plate.toUpperCase().replace(/\s+/g, '')
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .ilike('license_plate', plate)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    const enriched = computeFleetBrain([data])[0]
    return NextResponse.json(enriched)
  } catch (err: any) {
    console.error('Plate lookup error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}