import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const reviewQuerySchema = z.object({
  mechanicId: z.string().trim().min(1, 'mechanicId is required'),
});

const createReviewSchema = z.object({
  mechanic_id: z.string().trim().min(1, 'mechanic_id is required'),
  job_id: z.string().trim().min(1, 'job_id is required'),
  rating: z.coerce.number().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
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

async function getServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: any; value: any; options: any; }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Safe in server contexts where cookie writes are restricted
          }
        },
      },
    }
  );
}

export async function GET(req: Request) {
  try {
    const supabase = await getServerClient();
    const { searchParams } = new URL(req.url);

    const parsedQuery = reviewQuerySchema.safeParse({
      mechanicId: searchParams.get('mechanicId'),
    });

    if (!parsedQuery.success) {
      return jsonError('Validation failed', 400, parsedQuery.error.flatten());
    }

    const { mechanicId } = parsedQuery.data;

    const { data, error } = await supabase
      .from('reviews')
      .select(
        `
        id,
        user_id,
        mechanic_id,
        job_id,
        rating,
        comment,
        created_at,
        reviewer:profiles!user_id (
          full_name,
          avatar_url
        )
      `
      )
      .eq('mechanic_id', mechanicId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[REVIEWS_GET_ERROR]', error);
      return jsonError('Failed to fetch reviews', 500);
    }

    return jsonSuccess(data ?? []);
  } catch (error) {
    console.error('[REVIEWS_GET_UNEXPECTED]', error);
    return jsonError('Internal server error', 500);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await getServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError('Unauthorized', 401);
    }

    const rawBody = await req.json().catch(() => null);

    if (!rawBody) {
      return jsonError('Invalid JSON body', 400);
    }

    const parsedBody = createReviewSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return jsonError('Validation failed', 400, parsedBody.error.flatten());
    }

    const { mechanic_id, job_id, rating, comment } = parsedBody.data;

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, user_id, assigned_mechanic_id, status')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return jsonError('Job not found', 404);
    }

    if (job.user_id !== user.id) {
      return jsonError('Forbidden', 403);
    }

    if (job.assigned_mechanic_id !== mechanic_id) {
      return jsonError('Mechanic mismatch', 403);
    }

    if (!['completed', 'closed', 'resolved'].includes(String(job.status).toLowerCase())) {
      return jsonError('Job must be completed before leaving a review', 400);
    }

    const { data: existingReview, error: existingError } = await supabase
      .from('reviews')
      .select('id')
      .eq('job_id', job_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingError) {
      console.error('[REVIEWS_DUPLICATE_CHECK_ERROR]', existingError);
      return jsonError('Failed to verify existing review', 500);
    }

    if (existingReview) {
      return jsonError('Review already exists', 409);
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        user_id: user.id,
        mechanic_id,
        job_id,
        rating,
        comment: comment?.trim() || null,
      })
      .select(
        `
        id,
        user_id,
        mechanic_id,
        job_id,
        rating,
        comment,
        created_at
      `
      )
      .single();

    if (error) {
      console.error('[REVIEWS_POST_ERROR]', error);

      if (error.code === '23505') {
        return jsonError('Review already exists', 409);
      }

      return jsonError('Failed to create review', 500);
    }

    return jsonSuccess(data, 201);
  } catch (error) {
    console.error('[REVIEWS_POST_UNEXPECTED]', error);
    return jsonError('Internal server error', 500);
  }
}