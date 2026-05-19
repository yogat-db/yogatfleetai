import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createMechanicSchema = z.object({
  business_name: z.string().trim().min(1, 'Business name is mandatory').max(120),
  bio: z.string().trim().max(2000).optional().nullable(),
  specialties: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  hourly_rate: z.coerce.number().min(0).max(10000).optional().nullable(),
  lat: z.coerce.number().min(-90).max(90).optional().nullable(),
  lng: z.coerce.number().min(-180).max(180).optional().nullable(),
});

type MechanicRow = {
  id: string;
  user_id: string;
  business_name: string;
  bio: string | null;
  specialties: string[] | null;
  hourly_rate: number | null;
  lat: number | null;
  lng: number | null;
  subscription_status: string | null;
  created_at: string | null;
  reviews?: { rating: number | null }[] | null;
};

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

function jsonError(error: string, status = 500, details?: unknown) {
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

/**
 * GET: Retrieve all active mechanics
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: mechanics, error } = await supabase
      .from('mechanics')
      .select(
        `
        id,
        user_id,
        business_name,
        bio,
        specialties,
        hourly_rate,
        lat,
        lng,
        subscription_status,
        created_at,
        reviews (
          rating
        )
      `
      )
      .eq('subscription_status', 'active')
      .order('business_name', { ascending: true })
      .returns<MechanicRow[]>();

    if (error) {
      console.error('[MECHANICS_LIST_ERROR]', error);
      return jsonError('Failed to load mechanics', 500);
    }

    const enrichedMechanics =
      mechanics?.map((mechanic) => {
        const ratings = (mechanic.reviews ?? [])
          .map((review) => review.rating)
          .filter((rating): rating is number => typeof rating === 'number');

        const avgRating = ratings.length
          ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
          : 0;

        return {
          id: mechanic.id,
          user_id: mechanic.user_id,
          business_name: mechanic.business_name,
          bio: mechanic.bio,
          specialties: mechanic.specialties ?? [],
          hourly_rate: mechanic.hourly_rate,
          lat: mechanic.lat,
          lng: mechanic.lng,
          subscription_status: mechanic.subscription_status,
          created_at: mechanic.created_at,
          avg_rating: Number(avgRating.toFixed(1)),
          review_count: ratings.length,
        };
      }) ?? [];

    return jsonSuccess(enrichedMechanics);
  } catch (error) {
    console.error('[MECHANICS_LIST_UNEXPECTED]', error);
    return jsonError('Failed to synchronize with mechanic registry', 500);
  }
}

/**
 * POST: Create a new mechanic profile
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError('Authentication required to register as a mechanic', 401);
    }

    const rawBody = await request.json().catch(() => null);

    if (!rawBody) {
      return jsonError('Invalid JSON body', 400);
    }

    const parsed = createMechanicSchema.safeParse(rawBody);

    if (!parsed.success) {
      return jsonError('Validation failed', 400, parsed.error.flatten());
    }

    const body = parsed.data;

    const mechanicData = {
      user_id: user.id,
      business_name: body.business_name,
      bio: body.bio ?? null,
      specialties: body.specialties ?? [],
      hourly_rate: body.hourly_rate ?? 0,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      subscription_status: 'pending',
    };

    const { data, error } = await supabase
      .from('mechanics')
      .insert(mechanicData)
      .select(
        `
        id,
        user_id,
        business_name,
        bio,
        specialties,
        hourly_rate,
        lat,
        lng,
        subscription_status,
        created_at
      `
      )
      .single();

    if (error) {
      if (error.code === '23505') {
        return jsonError(
          'A mechanic profile already exists for this account',
          409
        );
      }

      console.error('[MECHANIC_POST_ERROR]', error);
      return jsonError('Profile creation failed', 500);
    }

    return jsonSuccess(data, 201);
  } catch (error) {
    console.error('[MECHANIC_POST_UNEXPECTED]', error);
    return jsonError('Profile creation failed. Technical logs recorded.', 500);
  }
}