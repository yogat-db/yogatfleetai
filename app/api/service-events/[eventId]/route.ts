// app/api/service-events/[eventId]/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;      // adjust to your env var name
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // adjust to your env var name

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Helper to get authenticated user (optional – uncomment if you add auth checks)
// async function getAuthenticatedUser(request: NextRequest) {
//   const authHeader = request.headers.get('Authorization');
//   if (!authHeader) return null;
//   // Validate token and return user
//   return null;
// }

// GET /api/service-events/:eventId
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> | { eventId: string } }
) {
  try {
    // For Next.js 15+, params is a Promise – await it
    const { eventId } = await params;

    const { data: event, error } = await supabaseAdmin
      .from('service_events')
      .select('*, vehicle:vehicles(*)')
      .eq('id', eventId)
      .single();

    if (error || !event) {
      return NextResponse.json(
        { error: 'Service event not found' },
        { status: 404 }
      );
    }

    // Optional: check if user is allowed to see this event (e.g., belongs to their vehicle)
    // const user = await getAuthenticatedUser(request);
    // if (!user || event.vehicle.user_id !== user.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

    return NextResponse.json(event, { status: 200 });
  } catch (error) {
    console.error('GET service event error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/service-events/:eventId – update event
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> | { eventId: string } }
) {
  try {
    const { eventId } = await params;
    const updates = await request.json();

    // Optional: verify ownership before update
    // const user = await getAuthenticatedUser(request);
    // if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // const { data: existingEvent } = await supabaseAdmin
    //   .from('service_events')
    //   .select('vehicle:vehicles(user_id)')
    //   .eq('id', eventId)
    //   .single();
    // if (existingEvent?.vehicle?.user_id !== user.id) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    const { data: updatedEvent, error } = await supabaseAdmin
      .from('service_events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      console.error('Update service event error:', error);
      return NextResponse.json(
        { error: 'Failed to update service event' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedEvent, { status: 200 });
  } catch (error) {
    console.error('PATCH service event error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/service-events/:eventId
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> | { eventId: string } }
) {
  try {
    const { eventId } = await params;

    // Optional: ownership check before deletion
    // const user = await getAuthenticatedUser(request);
    // if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // const { data: existingEvent } = await supabaseAdmin
    //   .from('service_events')
    //   .select('vehicle:vehicles(user_id)')
    //   .eq('id', eventId)
    //   .single();
    // if (existingEvent?.vehicle?.user_id !== user.id) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    const { error } = await supabaseAdmin
      .from('service_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Delete service event error:', error);
      return NextResponse.json(
        { error: 'Failed to delete service event' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Service event deleted' },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE service event error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}