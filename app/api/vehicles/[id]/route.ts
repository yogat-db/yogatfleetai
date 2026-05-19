import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type VehicleUpdatePayload = {
  license_plate?: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  mileage?: number | null;
  status?: string | null;
  image_url?: string | null;
};

type VehicleRow = {
  id: string;
  user_id: string;
  license_plate: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  mileage: number | null;
  status: string | null;
  image_url: string | null;
};

function normalizePlate(value: string | undefined) {
  if (!value) return undefined;
  return value.toUpperCase().replace(/\s+/g, '');
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

async function getAuthenticatedUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null };
  }

  return { supabase, user };
}

function isValidId(id: string) {
  return typeof id === 'string' && id.trim().length > 0;
}

function buildUpdatePayload(body: VehicleUpdatePayload) {
  const payload: Partial<VehicleUpdatePayload> = {};

  if ('license_plate' in body) {
    payload.license_plate = normalizePlate(body.license_plate);
  }

  if ('make' in body) {
    payload.make = body.make ?? null;
  }

  if ('model' in body) {
    payload.model = body.model ?? null;
  }

  if ('year' in body) {
    payload.year = body.year ?? null;
  }

  if ('mileage' in body) {
    payload.mileage = body.mileage ?? null;
  }

  if ('status' in body) {
    payload.status = body.status ?? 'active';
  }

  if ('image_url' in body) {
    payload.image_url = body.image_url ?? null;
  }

  return payload;
}

const vehicleSelect = `
  id,
  user_id,
  license_plate,
  make,
  model,
  year,
  mileage,
  status,
  image_url
`;

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!isValidId(id)) {
      return jsonError('Invalid vehicle id', 400);
    }

    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return jsonError('Auth session missing', 401);
    }

    const { data, error } = await supabase
      .from('vehicles')
      .select(vehicleSelect)
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle<VehicleRow>();

    if (error) {
      console.error('[vehicles/:id][GET] fetch error:', error);
      return jsonError('Failed to load vehicle', 500);
    }

    if (!data) {
      return jsonError('Vehicle not found', 404);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[vehicles/:id][GET] unexpected error:', error);
    return jsonError('Internal server error', 500);
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!isValidId(id)) {
      return jsonError('Invalid vehicle id', 400);
    }

    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return jsonError('Auth session missing', 401);
    }

    const body = (await request.json()) as VehicleUpdatePayload;
    const updatePayload = buildUpdatePayload(body);

    if (Object.keys(updatePayload).length === 0) {
      return jsonError('No valid fields supplied for update', 400);
    }

    const { data, error } = await supabase
      .from('vehicles')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(vehicleSelect)
      .maybeSingle<VehicleRow>();

    if (error) {
      console.error('[vehicles/:id][PUT] update error:', error);
      return jsonError(error.message || 'Failed to update vehicle', 500);
    }

    if (!data) {
      return jsonError('Vehicle not found', 404);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[vehicles/:id][PUT] unexpected error:', error);
    return jsonError('Internal server error', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!isValidId(id)) {
      return jsonError('Invalid vehicle id', 400);
    }

    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return jsonError('Auth session missing', 401);
    }

    const { data: existingVehicle, error: lookupError } = await supabase
      .from('vehicles')
      .select('id, user_id, license_plate, image_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (lookupError) {
      console.error('[vehicles/:id][DELETE] lookup error:', lookupError);
      return jsonError('Failed to locate vehicle', 500);
    }

    if (!existingVehicle) {
      return jsonError('Vehicle not found', 404);
    }

    const { error: deleteError } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[vehicles/:id][DELETE] delete error:', deleteError);
      return jsonError('Failed to delete vehicle', 500);
    }

    return NextResponse.json({
      success: true,
      data: {
        deletedId: existingVehicle.id,
        license_plate: existingVehicle.license_plate,
      },
    });
  } catch (error) {
    console.error('[vehicles/:id][DELETE] unexpected error:', error);
    return jsonError('Internal server error', 500);
  }
}