// app/api/affiliate/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const platform = searchParams.get('platform');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('affiliate_products')
      .select('id,external_id,name,description,price,image_url,affiliate_link,source_url,category,commission_rate,active,sort_order,created_at,platform', { count: 'exact' })
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (platform && platform !== 'all') {
      query = query.eq('platform', platform);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[affiliate/products] supabase error:', error);
      return NextResponse.json(
        { items: [], error: error.message, total: 0 },
        { status: 500 }
      );
    }

    // Add CORS headers (optional, for cross-origin if needed)
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    // Optional: allow specific origins (adjust to your frontend domain)
    // headers.set('Access-Control-Allow-Origin', 'https://yourdomain.com');

    return NextResponse.json(
      {
        items: data ?? [],
        total: count ?? 0,
        limit,
        offset,
      },
      { status: 200, headers }
    );
  } catch (err) {
    console.error('[affiliate/products] unexpected error:', err);
    return NextResponse.json(
      {
        items: [],
        error: err instanceof Error ? err.message : 'Failed to load affiliate products',
        total: 0,
      },
      { status: 500 }
    );
  }
}