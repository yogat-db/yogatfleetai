import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

function jsonSuccess(data: unknown, status = 200) {
  return NextResponse.json(
    { success: true, data },
    { status }
  );
}

function isValidId(value: string) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function getAuthedClient() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return { supabase, user: null, authError };
  }

  return { supabase, user, authError: null };
}

// GET /api/service-events/[eventId]
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { eventId } = await context.params;

    if (!isValidId(eventId)) {
      return jsonError('Invalid service event id', 400);
    }

    const { supabase, user, authError } = await getAuthedClient();

    if (authError || !user) {
      return jsonError('Unauthorized', 401);
    }

    const { data: event, error } = await supabase
      .from('service_events')
      .select(`
        *,
        vehicle:vehicles!inner(*)
      `)
      .eq('id', eventId)
      .eq('vehicle.user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('GET service event error:', error);
      return jsonError(error.message, 500);
    }

    if (!event) {
      return jsonError('Service event not found', 404);
    }

    return jsonSuccess(event);
  } catch (error) {
    console.error('GET /api/service-events/[eventId] error:', error);
    return jsonError(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

// PATCH /api/service-events/[eventId]
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { eventId } = await context.params;

    if (!isValidId(eventId)) {
      return jsonError('Invalid service event id', 400);
    }

    const updates = await request.json();

    const allowedUpdates = {
      service_type: updates?.service_type,
      service_date: updates?.service_date,
      mileage: updates?.mileage,
      cost: updates?.cost,
      notes: updates?.notes,
      provider: updates?.provider,
      next_due_date: updates?.next_due_date,
      next_due_mileage: updates?.next_due_mileage,
      status: updates?.status,
    };

    const sanitizedUpdates = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(sanitizedUpdates).length === 0) {
      return jsonError('No valid fields provided for update', 400);
    }

    const { supabase, user, authError } = await getAuthedClient();

    if (authError || !user) {
      return jsonError('Unauthorized', 401);
    }

    const { data: existingEvent, error: existingError } = await supabase
      .from('service_events')
      .select(`
        id,
        vehicle:vehicles!inner(
          id,
          user_id
        )
      `)
      .eq('id', eventId)
      .eq('vehicle.user_id', user.id)
      .maybeSingle();

    if (existingError) {
      console.error('Lookup service event error:', existingError);
      return jsonError(existingError.message, 500);
    }

    if (!existingEvent) {
      return jsonError('Service event not found', 404);
    }

    const { data: updatedEvent, error: updateError } = await supabase
      .from('service_events')
      .update(sanitizedUpdates)
      .eq('id', eventId)
      .select(`
        *,
        vehicle:vehicles(*)
      `)
      .single();

    if (updateError) {
      console.error('Update service event error:', updateError);
      return jsonError(updateError.message, 500);
    }

    return jsonSuccess(updatedEvent);
  } catch (error) {
    console.error('PATCH /api/service-events/[eventId] error:', error);
    return jsonError(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

// DELETE /api/service-events/[eventId]
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { eventId } = await context.params;

    if (!isValidId(eventId)) {
      return jsonError('Invalid service event id', 400);
    }

    const { supabase, user, authError } = await getAuthedClient();

    if (authError || !user) {
      return jsonError('Unauthorized', 401);
    }

    const { data: existingEvent, error: existingError } = await supabase
      .from('service_events')
      .select(`
        id,
        vehicle:vehicles!inner(
          id,
          user_id
        )
      `)
      .eq('id', eventId)
      .eq('vehicle.user_id', user.id)
      .maybeSingle();

    if (existingError) {
      console.error('Lookup service event error:', existingError);
      return jsonError(existingError.message, 500);
    }

    if (!existingEvent) {
      return jsonError('Service event not found', 404);
    }

    const { error: deleteError } = await supabase
      .from('service_events')
      .delete()
      .eq('id', eventId);

    if (deleteError) {
      console.error('Delete service event error:', deleteError);
      return jsonError(deleteError.message, 500);
    }

    return jsonSuccess({ message: 'Service event deleted' });
  } catch (error) {
    console.error('DELETE /api/service-events/[eventId] error:', error);
    return jsonError(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}