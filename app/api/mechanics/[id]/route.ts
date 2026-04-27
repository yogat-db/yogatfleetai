import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Production-Grade Mechanic Fetch
 * Includes relationship mapping for ratings and reviews
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Fetch with related data (reviews/specialties)
    // We select aggregate data to avoid heavy frontend calculations
    const { data, error } = await supabase
      .from('mechanics')
      .select(`
        *,
        reviews (
          rating,
          comment,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error(`[MECHANIC_API] Fetch failed for ID ${id}:`, error.message);
      return NextResponse.json(
        { error: 'Mechanic profile not found in active registry' }, 
        { status: 404 }
      );
    }

    // 2. Data Transformation (Optional but recommended)
    // Calculate average rating on the server to save client-side CPU
    const reviews = data.reviews || [];
    const avgRating = reviews.length 
      ? reviews.reduce((acc: number, rev: any) => acc + rev.rating, 0) / reviews.length 
      : 0;

    const enrichedData = {
      ...data,
      metrics: {
        average_rating: parseFloat(avgRating.toFixed(1)),
        total_reviews: reviews.length,
      }
    };

    return NextResponse.json(enrichedData);

  } catch (err: any) {
    console.error('[MECHANIC_API] Unexpected Error:', err);
    return NextResponse.json(
      { error: 'Internal system error while retrieving profile' }, 
      { status: 500 }
    );
  }
}