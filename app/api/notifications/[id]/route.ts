import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('GET notification error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Optional: update only the `read` field
    const body = await req.json()
    const { read } = body

    // Update and ensure ownership
    const { data, error } = await supabase
      .from('notifications')
      .update({ read })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Notification not found or update failed' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('PUT notification error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE notification error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}