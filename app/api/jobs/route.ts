// app/api/jobs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

type CreateJobBody = {
  title?: unknown;
  description?: unknown;
  budget?: unknown;
  location?: unknown;
  vehicle_id?: unknown;
};

function jsonError(
  message: string,
  status: number,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details ?? {}),
    },
    { status }
  );
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // no writes needed
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('[POST /api/jobs] auth error:', userError);
      return jsonError('Unauthorized', 401);
    }

    let body: CreateJobBody;

    try {
      body = (await req.json()) as CreateJobBody;
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const title =
      typeof body.title === 'string' ? body.title.trim() : '';
    const description = normalizeOptionalString(body.description);
    const location = normalizeOptionalString(body.location);

    let budget: number | null = null;
    if (body.budget !== undefined && body.budget !== null && body.budget !== '') {
      const parsedBudget = Number(body.budget);

      if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
        return jsonError('Budget must be a valid non-negative number', 400);
      }

      budget = parsedBudget;
    }

    const vehicleId =
      typeof body.vehicle_id === 'string' && body.vehicle_id.trim().length
        ? body.vehicle_id.trim()
        : null;

    if (title.length < 3) {
      return jsonError('Title is required (minimum 3 characters)', 400);
    }

    if (title.length > 120) {
      return jsonError('Title must be 120 characters or fewer', 400);
    }

    if (description && description.length > 5000) {
      return jsonError('Description must be 5000 characters or fewer', 400);
    }

    if (location && location.length > 200) {
      return jsonError('Location must be 200 characters or fewer', 400);
    }

    if (vehicleId) {
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, user_id')
        .eq('id', vehicleId)
        .maybeSingle();

      if (vehicleError) {
        console.error('[POST /api/jobs] vehicle lookup error:', vehicleError);
        return jsonError('Failed to verify vehicle', 500, {
          code: vehicleError.code,
          details: vehicleError.details,
          hint: vehicleError.hint,
        });
      }

      if (!vehicle) {
        return jsonError('Selected vehicle not found', 400);
      }

      if (vehicle.user_id !== user.id) {
        return jsonError('You can only create jobs for your own vehicle', 403);
      }
    }

    const insertPayload = {
      user_id: user.id,
      title,
      description,
      budget,
      location,
      vehicle_id: vehicleId,
      status: 'open',
    };

    const { data: insertedRows, error: insertError } = await supabase
      .from('jobs')
      .insert(insertPayload)
      .select('id, user_id, title, description, budget, location, vehicle_id, status, created_at')
      .limit(1);

    if (insertError) {
      console.error('[POST /api/jobs] insert error:', insertError);
      return jsonError(insertError.message || 'Failed to create job', 500, {
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      });
    }

    const createdJob = insertedRows?.[0];

    if (!createdJob) {
      return jsonError(
        'Job was created but no row was returned. Check your SELECT policy for jobs.',
        500
      );
    }

    return NextResponse.json(
      {
        success: true,
        job: createdJob,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/jobs] unhandled error:', err);

    return jsonError(
      err instanceof Error ? err.message : 'Internal server error',
      500
    );
  }
}