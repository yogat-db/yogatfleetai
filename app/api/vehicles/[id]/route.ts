import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkOwnership(id: string, userId: string) {
  const { data: vehicle, error } = await supabaseAdmin
    .from('vehicles')
    .select('user_id')
    .eq('id', id)
    .single();

  if (error || !vehicle) return { error: 'Vehicle not found', status: 404 };
  if (vehicle.user_id !== userId) return { error: 'Forbidden', status: 403 };
  return { vehicle };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ownership = await checkOwnership(id, userId);
    if ('error' in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    const { data: vehicle, error } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(vehicle);
  } catch (err) {
    console.error('GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ownership = await checkOwnership(id, userId);
    if ('error' in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    const { error } = await supabaseAdmin
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await req.json();
    const ownership = await checkOwnership(id, userId);
    if ('error' in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    delete updates.id;
    delete updates.user_id;
    delete updates.created_at;

    const { data: updated, error } = await supabaseAdmin
      .from('vehicles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error('PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}