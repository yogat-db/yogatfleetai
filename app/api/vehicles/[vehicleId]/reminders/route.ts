import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  req: Request,
  { params }: { params: { vehicleId: string } }
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify vehicle belongs to user
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, user_id, mileage')
      .eq('id', params.vehicleId)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }
    if (vehicle.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: reminders, error: remindersError } = await supabase
      .from('service_reminders')
      .select('*')
      .eq('vehicle_id', params.vehicleId)
      .order('created_at', { ascending: false })

    if (remindersError) {
      return NextResponse.json({ error: remindersError.message }, { status: 500 })
    }

    // Compute next due dates
    const now = new Date()
    const remindersWithNextDue = reminders.map(rem => {
      let nextDueDate: Date | null = null
      if (rem.last_completed_at && rem.interval_months) {
        nextDueDate = new Date(new Date(rem.last_completed_at).getTime() + rem.interval_months * 30 * 24 * 60 * 60 * 1000)
      } else if (!rem.last_completed_at && rem.interval_months) {
        nextDueDate = new Date(now.getTime() + rem.interval_months * 30 * 24 * 60 * 60 * 1000)
      }

      let nextDueMileage: number | null = null
      if (rem.last_mileage && rem.interval_miles) {
        nextDueMileage = rem.last_mileage + rem.interval_miles
      } else if (!rem.last_mileage && rem.interval_miles && vehicle.mileage) {
        nextDueMileage = vehicle.mileage + rem.interval_miles
      }

      return {
        ...rem,
        next_due_date: nextDueDate ? nextDueDate.toISOString() : null,
        next_due_mileage: nextDueMileage,
      }
    })

    return NextResponse.json(remindersWithNextDue)
  } catch (err: any) {
    console.error('GET reminders error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: { vehicleId: string } }
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify vehicle belongs to user
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, user_id')
      .eq('id', params.vehicleId)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }
    if (vehicle.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { task, interval_miles, interval_months, last_completed_at, last_mileage } = body

    if (!task) {
      return NextResponse.json({ error: 'Task is required' }, { status: 400 })
    }

    // At least one interval should be provided
    if (!interval_miles && !interval_months) {
      return NextResponse.json({ error: 'At least one interval (miles or months) is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('service_reminders')
      .insert([{
        vehicle_id: params.vehicleId,
        task,
        interval_miles: interval_miles ? parseInt(interval_miles) : null,
        interval_months: interval_months ? parseInt(interval_months) : null,
        last_completed_at: last_completed_at || null,
        last_mileage: last_mileage ? parseInt(last_mileage) : null,
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    console.error('POST reminder error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}