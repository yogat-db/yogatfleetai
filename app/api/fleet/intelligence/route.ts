import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeFleetBrain } from '@/lib/ai'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)

    const enriched = computeFleetBrain(vehicles || [])
    return NextResponse.json(enriched)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}