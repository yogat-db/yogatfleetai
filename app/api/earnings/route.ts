import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get mechanic profile
    const { data: mechanic } = await supabase
      .from('mechanics')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (!mechanic) {
      return NextResponse.json({ error: 'Not a mechanic' }, { status: 403 })
    }

    // Fetch earnings for this mechanic
    const { data, error } = await supabase
      .from('earnings')
      .select('*')
      .eq('mechanic_id', mechanic.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}