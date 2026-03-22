import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeFleetBrain } from '@/lib/ai'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ plate: string }> }
) {
  try {
    const { plate } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .select('*')
      .ilike('license_plate', plate)
      .eq('user_id', user.id)
      .single()

    if (error || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    const enriched = computeFleetBrain([vehicle])[0]
    return NextResponse.json(enriched)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}