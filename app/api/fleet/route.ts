// app/api/fleet/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const fleetQuerySchema = z.object({
  status: z.string().trim().min(1).optional(),
  type: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const createFleetVehicleSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  type: z.string().trim().min(1, 'Type is required').max(60),
  license_plate: z.string().trim().max(20).optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
});

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      details: details ?? null,
    },
    { status }
  );
}

// Replace this with your real auth logic.
// Example options:
// - verify a Supabase session from cookies
// - verify an internal admin token
// - check user role before allowing service-role DB access
async function requireFleetAccess(_request: NextRequest) {
  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireFleetAccess(request);
    if (!access.ok) {
      return jsonError('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);

    const parsed = fleetQuerySchema.safeParse({
      status: searchParams.get('status') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });

    if (!parsed.success) {
      return jsonError('Invalid query parameters', 400, parsed.error.flatten());
    }

    const { status, type, limit, offset } = parsed.data;

    let query = supabaseAdmin
      .from('fleet')
      .select('*', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);

    const { data: vehicles, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Fleet GET error:', error);
      return jsonError('Failed to fetch fleet vehicles', 500);
    }

    return NextResponse.json(
      {
        success: true,
        data: vehicles ?? [],
        pagination: {
          count: count ?? 0,
          limit,
          offset,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in fleet GET:', error);
    return jsonError('Internal server error', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireFleetAccess(request);
    if (!access.ok) {
      return jsonError('Unauthorized', 401);
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return jsonError('Invalid JSON body', 400);
    }

    const parsed = createFleetVehicleSchema.safeParse(rawBody);

    if (!parsed.success) {
      return jsonError('Invalid request body', 400, parsed.error.flatten());
    }

    const payload = {
      ...parsed.data,
      status: parsed.data.status ?? 'active',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('fleet')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Fleet POST error:', error);
      return jsonError('Failed to create vehicle', 500);
    }

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in fleet POST:', error);
    return jsonError('Internal server error', 500);
  }
}