import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * SERVICE EVENTS API
 * Handles deep-dive retrieval, updates, and deletion for specific vehicle service records.
 */

async function getMacSafeClient(isAdmin = false) {
  const cookieStore = await cookies();
  const key = isAdmin 
    ? process.env.SUPABASE_SERVICE_ROLE_KEY 
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) throw new Error("Missing Supabase environment variables");

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: any; value: any; options: any; }[]) {
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
              'Accept-Encoding': 'identity',
            },
          });
        },
      },
    }
  );
}

// GET /api/service-events/:eventId
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const supabase = await getMacSafeClient();

    const { data: event, error } = await supabase
      .from('service_events')
      .select('*, vehicle:vehicles(*)')
      .eq('id', eventId)
      .single();

    if (error || !event) {
      return NextResponse.json({ error: 'Service event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (err: any) {
    console.error('GET service event error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/service-events/:eventId
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const updates = await request.json();
    const supabase = await getMacSafeClient(true); // Using Admin for updates

    const { data: updatedEvent, error } = await supabase
      .from('service_events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error.message);
      return NextResponse.json({ error: 'Failed to update service event' }, { status: 500 });
    }

    return NextResponse.json(updatedEvent);
  } catch (err: any) {
    console.error('PATCH service event error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/service-events/:eventId
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const supabase = await getMacSafeClient(true);

    const { error } = await supabase
      .from('service_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Delete error:', error.message);
      return NextResponse.json({ error: 'Failed to delete service event' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Service event deleted' });
  } catch (err: any) {
    console.error('DELETE service event error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}