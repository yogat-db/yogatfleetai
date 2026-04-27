import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PRODUCTION-GRADE NOTIFICATION FEED
 * Supports pagination, unread counts, and security filtering.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 1. Session Validation
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unread') === 'true';

    // 2. Build the Query
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    // Filter for unread if requested (useful for the red dot logic)
    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // 3. Get total unread count (Critical for the Bell Badge)
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    return NextResponse.json({ 
      notifications: data || [], 
      total: count || 0,
      unreadCount: unreadCount || 0,
      serverTime: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('[NOTIF_FEED_ERROR]:', err.message);
    return NextResponse.json({ error: 'Failed to synchronize alerts' }, { status: 500 });
  }
}