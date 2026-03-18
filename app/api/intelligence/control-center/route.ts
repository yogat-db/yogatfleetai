import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { computeFleetBrain } from '@/lib/ai'

export async function GET() {
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

    // Fetch all vehicles for the user
    const { data: vehicles, error: dbError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    const enriched = computeFleetBrain(vehicles || [])

    const stats = {
      total: vehicles.length,
      healthy: enriched.filter(v => v.health_score >= 70).length,
      warning: enriched.filter(v => v.health_score >= 40 && v.health_score < 70).length,
      critical: enriched.filter(v => v.health_score < 40).length,
    }

    const criticalAlerts = enriched.filter(v => v.health_score < 40)
    const predictedFailures = enriched.filter(v => v.risk !== 'low' && v.predictedFailureDate)

    return NextResponse.json({
      stats,
      criticalAlerts,
      predictedFailures,
    })
  } catch (err: any) {
    console.error('Control center API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}