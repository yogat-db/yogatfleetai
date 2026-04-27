import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { computeFleetBrain } from '@/lib/ai'

/**
 * FLEET BRAIN AI ROUTE
 * Processes vehicle data through the AI engine to generate digital twins/insights.
 */

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    
    // 1. Create Mac-Safe Supabase Client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: any; value: any; options: any }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, { ...options })
              );
            } catch { /* SSR Safe */ }
          },
        },
        global: {
          fetch: (url: string | Request | URL, options: RequestInit | undefined) => {
            return fetch(url, {
              ...options,
              headers: {
                ...options?.headers,
                // Fix for the MacBook Air "libcurl" build-time feature error
                // Prevents crashes when receiving large vehicle datasets
                'Accept-Encoding': 'identity',
              },
            });
          },
        },
      }
    )

    // 2. Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. Fetch Vehicles for processing
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)

    if (vehiclesError) {
      console.error('Fleet Brain Data Fetch Error:', vehiclesError.message)
      return NextResponse.json({ error: 'Failed to retrieve fleet data' }, { status: 500 })
    }

    // 4. Run AI Computation
    // Note: If computeFleetBrain is async, ensure you await it.
    const twins = await computeFleetBrain(vehicles || [])
    
    return NextResponse.json(twins)

  } catch (err: any) {
    console.error('FLEET_BRAIN_CRASH:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}