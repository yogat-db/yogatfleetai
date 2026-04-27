import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PRODUCTION-GRADE NOTIFICATION HANDLER
 * Handles single notification operations (View, Mark Read, Dismiss)
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // 1. Strict Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    // 2. Fetch with Ownership Verification
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id) // Security: Prevent users from reading others' alerts
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[NOTIF_GET_CRASH]:', err.message);
    return NextResponse.json({ error: 'Internal system error' }, { status: 500 });
  }
}

export async function PATCH( // Changed from PUT to PATCH for partial updates
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 3. Sanitized Update
    // We explicitly only allow updating the 'read' status to prevent body injection
    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        read: Boolean(body.read),
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[NOTIF_PATCH_ERROR]:', err.message);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Notification purged' });
  } catch (err: any) {
    console.error('[NOTIF_DELETE_ERROR]:', err.message);
    return NextResponse.json({ error: 'Dismissal failed' }, { status: 500 });
  }
}