import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createReminderSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  due_date: z.string().trim().optional().nullable(),
  due_mileage: z.union([z.number(), z.string()]).optional().nullable(),
  vehicle_id: z.string().trim().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      error: null,
      data,
    },
    { status }
  );
}

function jsonError(error: string, status: number, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error,
      data: null,
      details: details ?? null,
    },
    { status }
  );
}

function parseDueMileage(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;

  const parsed =
    typeof value === 'number'
      ? value
      : Number.parseInt(String(value).trim(), 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('Due mileage must be a valid non-negative number');
  }

  return parsed;
}

function normalizeDueDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Due date must be a valid date');
  }

  return trimmed;
}

async function getAuthenticatedUser(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user) {
    return user;
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();

    if (token) {
      const {
        data: { user: tokenUser },
        error: tokenError,
      } = await supabase.auth.getUser(token);

      if (!tokenError && tokenUser) {
        return tokenUser;
      }
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return jsonError('Unauthorized', 401);
    }

    const rawBody = await req.json().catch(() => null);

    if (!rawBody) {
      return jsonError('Invalid JSON body', 400);
    }

    const parsed = createReminderSchema.safeParse(rawBody);

    if (!parsed.success) {
      return jsonError('Validation failed', 400, parsed.error.flatten());
    }

    const body = parsed.data;

    const due_mileage = parseDueMileage(body.due_mileage);
    const due_date = normalizeDueDate(body.due_date);
    const vehicle_id = body.vehicle_id?.trim() || null;
    const notes = body.notes?.trim() || null;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        user_id: user.id,
        title: body.title.trim(),
        due_date,
        due_mileage,
        vehicle_id,
        notes,
        completed: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[REMINDER_POST_ERROR]', error);
      return jsonError('Failed to create reminder', 500);
    }

    return jsonSuccess(data, 201);
  } catch (error) {
    console.error('[REMINDER_POST_UNEXPECTED]', error);

    if (error instanceof Error) {
      if (
        error.message === 'Due mileage must be a valid non-negative number' ||
        error.message === 'Due date must be a valid date'
      ) {
        return jsonError(error.message, 400);
      }
    }

    return jsonError('Internal server error', 500);
  }
}