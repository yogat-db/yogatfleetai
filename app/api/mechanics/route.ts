import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET: Retrieve all active mechanics
 * Upgraded to include basic metrics and ordering
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    // 1. Fetch mechanics with their average rating
    const { data: mechanics, error } = await supabase
      .from('mechanics')
      .select(`
        *,
        reviews (
          rating
        )
      `)
      .eq('subscription_status', 'active')
      .order('business_name', { ascending: true });

    if (error) throw error;

    // 2. Map ratings to a simpler format for the UI
    const enrichedMechanics = mechanics?.map(m => {
      const ratings = m.reviews || [];
      const avg = ratings.length 
        ? ratings.reduce((acc: number, r: any) => acc + r.rating, 0) / ratings.length 
        : 0;
      
      return {
        ...m,
        avg_rating: parseFloat(avg.toFixed(1)),
        review_count: ratings.length,
        reviews: undefined // Clean up large objects before sending to client
      };
    });

    return NextResponse.json(enrichedMechanics || []);
  } catch (err: any) {
    console.error('[MECHANICS_LIST_ERROR]:', err.message);
    return NextResponse.json({ error: 'Failed to synchronize with mechanic registry' }, { status: 500 });
  }
}

/**
 * POST: Create a new mechanic profile
 * Upgraded with Auth protection and Validation
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 1. Auth Guard: Ensure only logged-in users can create a profile
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required to register as a mechanic' }, { status: 401 });
    }

    const body = await request.json();

    // 2. Basic Validation
    if (!body.business_name?.trim()) {
      return NextResponse.json({ error: 'Business name is mandatory' }, { status: 400 });
    }

    // 3. Sanitized Insert
    const mechanicData = {
      user_id: user.id, // Tie profile to the authenticated user
      business_name: body.business_name.trim(),
      bio: body.bio || null,
      specialties: body.specialties || [],
      hourly_rate: body.hourly_rate ? parseFloat(body.hourly_rate) : 0,
      lat: body.lat ? parseFloat(body.lat) : null,
      lng: body.lng ? parseFloat(body.lng) : null,
      subscription_status: 'pending', // New mechanics start as pending/trial
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('mechanics')
      .insert(mechanicData)
      .select()
      .single();

    if (error) {
      // Handle unique constraint (e.g., user already has a mechanic profile)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A mechanic profile already exists for this account' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('[MECHANIC_POST_ERROR]:', err.message);
    return NextResponse.json({ error: 'Profile creation failed. Technical logs recorded.' }, { status: 500 });
  }
}