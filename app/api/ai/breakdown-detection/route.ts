import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { computeFleetBrain } from '@/lib/ai'
import { getDTCInfo } from '@/lib/ai/diagnostics'
import type { Vehicle } from '@/app/types/fleet'
import type { VehicleAI } from '@/lib/ai'

interface BreakdownResult {
  vehicle: {
    id: string
    license_plate: string
    make: string | null
    model: string | null
    health_score: number
  }
  breakdownProbability: number
  reasons: string[]
  imminent: boolean
}

function calculateBreakdownProbability(
  vehicle: VehicleAI,
  recentDTCs: string[] = []
): { probability: number; reasons: string[] } {
  let probability = 0
  const reasons: string[] = []

  const health = vehicle.health_score ?? 100

  if (health < 40) {
    probability += 0.6
    reasons.push('Health score critically low')
  } else if (health < 70) {
    probability += 0.3
    reasons.push('Health score below optimal')
  }

  if (recentDTCs.length > 0) {
    const criticalDTCs = recentDTCs.filter((code) => {
      const info = getDTCInfo(code)
      return info?.mechanicNeeded && info?.estimatedCost && info.estimatedCost > 500
    })
    if (criticalDTCs.length > 0) {
      probability += 0.3 * criticalDTCs.length
      reasons.push(`Critical DTC codes: ${criticalDTCs.join(', ')}`)
    }
  }

  probability = Math.min(probability, 0.95)
  return { probability, reasons }
}

export async function GET(request: Request) {
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

    const url = new URL(request.url)
    const vehicleId = url.searchParams.get('vehicleId')
    const plate = url.searchParams.get('plate')
    const all = url.searchParams.get('all') === 'true'

    let query = supabase.from('vehicles').select('*').eq('user_id', user.id)

    if (vehicleId) {
      query = query.eq('id', vehicleId)
    } else if (plate) {
      query = query.ilike('license_plate', plate)
    } else if (!all) {
      return NextResponse.json({ error: 'Specify vehicleId, plate, or all=true' }, { status: 400 })
    }

    const { data: vehicles, error: dbError } = await query
    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }
    if (!vehicles || vehicles.length === 0) {
      return NextResponse.json({ error: 'No vehicles found' }, { status: 404 })
    }

    const results: BreakdownResult[] = await Promise.all(
      vehicles.map(async (v: Vehicle) => {
        // Fetch recent DTC codes (if diagnostic_scans table exists)
        let recentDTCs: string[] = []
        try {
          const { data: scans } = await supabase
            .from('diagnostic_scans')
            .select('codes')
            .eq('vehicle_id', v.id)
            .order('created_at', { ascending: false })
            .limit(5)
          if (scans) {
            recentDTCs = scans.flatMap((s: any) => s.codes || [])
          }
        } catch {
          // Table doesn't exist – ignore
        }

        const enriched = computeFleetBrain([v])[0] as VehicleAI
        if (!enriched) {
          throw new Error(`Failed to enrich vehicle ${v.id}`)
        }

        const { probability, reasons } = calculateBreakdownProbability(enriched, recentDTCs)

        return {
          vehicle: {
            id: v.id,
            license_plate: v.license_plate,
            make: v.make,
            model: v.model,
            health_score: enriched.health_score,
          },
          breakdownProbability: probability,
          reasons,
          imminent: probability > 0.5,
        }
      })
    )

    if (vehicleId || plate) {
      return NextResponse.json(results[0])
    }
    return NextResponse.json(results)
  } catch (err: any) {
    console.error('Breakdown detection error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
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

    const body = await request.json()
    const { vehicleIds, threshold = 0.5 } = body

    if (!vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      return NextResponse.json({ error: 'vehicleIds array required' }, { status: 400 })
    }

    const { data: vehicles, error: dbError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)
      .in('id', vehicleIds)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    const results = await Promise.all(
      vehicles.map(async (v: Vehicle) => {
        let recentDTCs: string[] = []
        try {
          const { data: scans } = await supabase
            .from('diagnostic_scans')
            .select('codes')
            .eq('vehicle_id', v.id)
            .order('created_at', { ascending: false })
            .limit(5)
          if (scans) recentDTCs = scans.flatMap((s: any) => s.codes || [])
        } catch {}

        const enriched = computeFleetBrain([v])[0] as VehicleAI
        const { probability, reasons } = calculateBreakdownProbability(enriched, recentDTCs)

        return {
          vehicleId: v.id,
          license_plate: v.license_plate,
          probability,
          reasons,
          imminent: probability > threshold,
        }
      })
    )

    return NextResponse.json(results)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}