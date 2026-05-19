import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type MechanicReview = {
  rating: number | null;
  comment: string | null;
  created_at: string | null;
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

/**
 * Production-grade mechanic fetch
 * Includes related reviews plus server-side rating metrics.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!id?.trim()) {
      return jsonError('Missing mechanic ID', 400);
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('mechanics')
      .select(
        `
          *,
          reviews (
            rating,
            comment,
            created_at
          )
        `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[MECHANIC_API] Fetch failed for ID ${id}:`, error);
      return jsonError('Failed to retrieve mechanic profile', 500, {
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
    }

    if (!data) {
      return jsonError('Mechanic profile not found in active registry', 404);
    }

    const reviews = Array.isArray(data.reviews)
      ? (data.reviews as MechanicReview[])
      : [];

    const validRatings = reviews
      .map((review) => review.rating)
      .filter((rating): rating is number => typeof rating === 'number' && Number.isFinite(rating));

    const avgRating = validRatings.length
      ? validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length
      : 0;

    const enrichedData = {
      ...data,
      metrics: {
        average_rating: Number(avgRating.toFixed(1)),
        total_reviews: reviews.length,
        total_ratings: validRatings.length,
      },
      recent_reviews: reviews
        .sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bTime - aTime;
        })
        .slice(0, 5),
    };

    return NextResponse.json({
      success: true,
      mechanic: enrichedData,
    });
  } catch (err) {
    console.error('[MECHANIC_API] Unexpected error:', err);

    return jsonError(
      err instanceof Error
        ? err.message
        : 'Internal system error while retrieving profile',
      500
    );
  }
}