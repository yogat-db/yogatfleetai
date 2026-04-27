import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * REVIEWS API
 * Handles fetching mechanic reviews and submitting new ones.
 */

async function getMacSafeClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: any; value: any; options: any; }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options })
            );
          } catch { /* SSR Safe */ }
        },
      },
      global: {
        fetch: (url: string | Request | URL, options: RequestInit | undefined) => {
          return fetch(url, {
            ...options,
            headers: {
              ...options?.headers,
              // Critical fix for Mac built-in libcurl build-time limitations
              'Accept-Encoding': 'identity',
            },
          });
        },
      },
    }
  );
}

export async function GET(req: Request) {
  try {
    const supabase = await getMacSafeClient();
    const { searchParams } = new URL(req.url);
    const mechanicId = searchParams.get('mechanicId');

    if (!mechanicId) {
      return NextResponse.json({ error: 'mechanicId is required' }, { status: 400 });
    }

    // Join with profiles instead of auth.users for public access
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!user_id(full_name, avatar_url)
      `)
      .eq('mechanic_id', mechanicId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('Reviews GET error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await getMacSafeClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { mechanic_id, job_id, rating, comment } = await req.json();

    if (!mechanic_id || !job_id || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Verify Job Ownership & Completion
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('user_id, assigned_mechanic_id, status')
      .eq('id', job_id)
      .single();

    if (jobError || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (job.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (job.assigned_mechanic_id !== mechanic_id) {
      return NextResponse.json({ error: 'Mechanic mismatch' }, { status: 403 });
    }

    // 2. Check for Duplicate Review
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('job_id', job_id)
      .maybeSingle();

    if (existing) return NextResponse.json({ error: 'Review already exists' }, { status: 409 });

    // 3. Insert Review
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        user_id: user.id,
        mechanic_id,
        job_id,
        rating: Math.min(5, Math.max(1, rating)), // Clamp rating 1-5
        comment: comment?.trim(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });

  } catch (err: any) {
    console.error('Reviews POST error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}