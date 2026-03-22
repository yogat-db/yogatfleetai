import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { computeFleetBrain } from '@/lib/ai'
import type { VehicleAI } from '@/lib/ai'

// Helper to calculate months until MOT due
function monthsUntilDue(expiryDate: string | null): number | null {
  if (!expiryDate) return null
  const now = new Date()
  const expiry = new Date(expiryDate)
  const diffMs = expiry.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30))
}

// Estimate pass probability based on health score and age
function estimatePassProbability(healthScore: number, age: number): number {
  // Base probability from health score (0-100)
  let probability = healthScore / 100
  // Older vehicles have slightly lower probability
  if (age > 10) probability *= 0.9
  else if (age > 5) probability *= 0.95
  // Cap between 0.1 and 0.98
  return Math.max(0.1, Math.min(0.98, probability))
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
    const plate = url.searchParams.get('plate')
    const vehicleId = url.searchParams.get('vehicleId')

    if (!plate && !vehicleId) {
      return NextResponse.json(
        { error: 'Either plate or vehicleId is required' },
        { status: 400 }
      )
    }

    // Build query
    let query = supabase.from('vehicles').select('*').eq('user_id', user.id)
    if (vehicleId) {
      query = query.eq('id', vehicleId)
    } else {
      query = query.ilike('license_plate', plate!)
    }

    const { data: vehicles, error: dbError } = await query
    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }
    if (!vehicles || vehicles.length === 0) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    const vehicle = vehicles[0]

    // Enrich with AI data (health_score, risk)
    const enrichedArray = computeFleetBrain([vehicle])
    if (!enrichedArray || enrichedArray.length === 0) {
      return NextResponse.json({ error: 'Failed to compute AI data' }, { status: 500 })
    }
    const enriched = enrichedArray[0] as VehicleAI;

    // In a real implementation, you might fetch the latest MOT expiry from the MOT API
    // or from a stored field in the vehicle table. For now, we'll simulate it.
    // You can replace this with a call to your /api/mot/[plate] endpoint or a database field.
    const motExpiryDate = vehicle.mot_expiry || null // assuming you have this field

    const monthsLeft = monthsUntilDue(motExpiryDate)
    const nextDueDate = motExpiryDate
      ? new Date(new Date(motExpiryDate).setFullYear(new Date(motExpiryDate).getFullYear() + 1))
          .toISOString()
          .split('T')[0]
      : null

    const age = vehicle.year ? new Date().getFullYear() - vehicle.year : 0
    const passProbability = estimatePassProbability(enriched.health_score, age)

    return NextResponse.json({
      vehicleId: vehicle.id,
      license_plate: vehicle.license_plate,
      currentMotExpiry: motExpiryDate,
      monthsUntilDue: monthsLeft,
      predictedNextDueDate: nextDueDate,
      passProbability,
      healthScore: enriched.health_score,
      risk: enriched.risk,
    })
  } catch (err: any) {
    console.error('MOT prediction error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

