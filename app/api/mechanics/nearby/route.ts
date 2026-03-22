import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

    const url = new URL(request.url)
    const lat = parseFloat(url.searchParams.get('lat') || '')
    const lng = parseFloat(url.searchParams.get('lng') || '')
    const radius = parseFloat(url.searchParams.get('radius') || '50')

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
    }

    // Simple bounding box query (you can use PostGIS for better accuracy)
    const { data, error } = await supabase
      .from('mechanics')
      .select('*')
      .eq('subscription_status', 'active')
      .gte('lat', lat - radius / 69)   // rough conversion
      .lte('lat', lat + radius / 69)
      .gte('lng', lng - radius / 69)
      .lte('lng', lng + radius / 69)

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}