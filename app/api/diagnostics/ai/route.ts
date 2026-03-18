import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { diagnose } from '@/lib/diagnostics' // your large diagnostics engine
import type { DiagnoseInput, DiagnoseResult } from '@/lib/diagnostics'

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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { codes, symptoms, vehicleId, lat, lng } = body as {
      codes?: string[]
      symptoms?: string
      vehicleId?: string
      lat?: number
      lng?: number
    }

    // Prepare input for diagnose()
    const input: DiagnoseInput = {
      obdCodes: codes,
      symptoms,
    }

    // If vehicleId provided, enrich with vehicle data and optional MOT/DVLA
    if (vehicleId) {
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .eq('user_id', user.id)
        .single()

      if (!vehicleError && vehicle) {
        input.vehicle = {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          mileage: vehicle.mileage,
          fuel: vehicle.fuel_type,
          transmission: vehicle.transmission,
          engine: vehicle.engine,
        }

        // Optionally fetch MOT & DVLA data (if you have those tables/APIs)
        // For now, leave them empty; the engine will work without them.
      }
    }

    // If location provided, add for context (optional, not used by engine yet)
    if (lat && lng) {
      // could be used for local parts/mechanic suggestions later
    }

    // Run diagnostics
    const result: DiagnoseResult = diagnose(input)

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Diagnostics AI error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Optional GET for simple DTC lookup (delegates to /api/dtc/[code])
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 })
  }
  // Forward to the DTC endpoint
  const dtcRes = await fetch(new URL(`/api/dtc/${code}`, request.url).toString())
  const dtcData = await dtcRes.json()
  return NextResponse.json(dtcData, { status: dtcRes.status })
}