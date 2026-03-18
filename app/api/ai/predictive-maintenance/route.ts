import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { computeFleetBrain } from '@/lib/ai'
import type { Vehicle } from '@/app/types/fleet'

// Define maintenance intervals (can be expanded or moved to a config)
const MAINTENANCE_ITEMS = [
  { name: 'Oil change', intervalMiles: 5000, intervalMonths: 6 },
  { name: 'Tire rotation', intervalMiles: 6000, intervalMonths: 6 },
  { name: 'Brake fluid flush', intervalMiles: 20000, intervalMonths: 24 },
  { name: 'Coolant flush', intervalMiles: 30000, intervalMonths: 36 },
  { name: 'Transmission service', intervalMiles: 60000, intervalMonths: 60 },
  { name: 'Timing belt', intervalMiles: 60000, intervalMonths: 60 },
]

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

    if (!vehicleId && !plate) {
      return NextResponse.json({ error: 'vehicleId or plate required' }, { status: 400 })
    }

    // Build query
    let query = supabase.from('vehicles').select('*').eq('user_id', user.id)
    if (vehicleId) query = query.eq('id', vehicleId)
    else query = query.ilike('license_plate', )

    const { data: vehicles, error: dbError } = await query
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
    if (!vehicles || vehicles.length === 0) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    const vehicle = vehicles[0]

    // Fetch service events for this vehicle
    const { data: events, error: eventsError } = await supabase
      .from('service_events')
      .select('*')
      .eq('vehicle_id', vehicle.id)
      .order('occurred_at', { ascending: false })

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 500 })
    }

    // Enrich vehicle with AI data (optional)
    const enriched = computeFleetBrain([vehicle])[0]

    const currentDate = new Date()
    const currentMileage = vehicle.mileage || 0

    // Build maintenance schedule
    const schedule = MAINTENANCE_ITEMS.map(item => {
      // Find the most recent event matching this task (case‑insensitive)
      const lastEvent = events?.find(e =>
        e.title.toLowerCase().includes(item.name.toLowerCase())
      )

      const lastMileage = lastEvent?.mileage ?? null
      const lastDate = lastEvent ? new Date(lastEvent.occurred_at) : null

      // Calculate next due mileage
      let dueMileage: number | null = null
      if (lastMileage != null) {
        dueMileage = lastMileage + item.intervalMiles
      } else {
        // No record: assume it's due based on current mileage (e.g., first time)
        dueMileage = currentMileage + item.intervalMiles
      }

      // Calculate next due date
      let dueDate: Date | null = null
      if (lastDate != null) {
        dueDate = new Date(lastDate)
        dueDate.setMonth(dueDate.getMonth() + item.intervalMonths)
      } else {
        dueDate = new Date(currentDate)
        dueDate.setMonth(dueDate.getMonth() + item.intervalMonths)
      }

      // Remaining miles and days
      const milesLeft = dueMileage != null ? Math.max(0, dueMileage - currentMileage) : null
      const daysLeft = dueDate != null ? Math.max(0, Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))) : null

      const overdue = (milesLeft !== null && milesLeft <= 0) || (daysLeft !== null && daysLeft <= 0)

      return {
        task: item.name,
        lastPerformedAt: lastEvent?.occurred_at || null,
        lastMileage: lastMileage,
        nextDueMileage: dueMileage,
        nextDueDate: dueDate?.toISOString().split('T')[0] || null,
        milesLeft,
        daysLeft,
        overdue,
      }
    })

    return NextResponse.json({
      vehicleId: vehicle.id,
      license_plate: vehicle.license_plate,
      currentMileage,
      health_score: enriched.health_score,
      schedule,
    })
  } catch (err: any) {
    console.error('Maintenance schedule error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}