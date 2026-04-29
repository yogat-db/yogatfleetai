import { NextResponse } from 'next/server';

const CACHE_SECONDS = 300;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') || '').trim();

  if (!query) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
  }

  const API_KEY = process.env.CHANNEL3_API_KEY;
  const API_URL = process.env.CHANNEL3_API_URL || 'https://api.trychannel3.com';

  if (!API_KEY) {
    console.warn('CHANNEL3_API_KEY not set, returning empty results');
    // Return empty array to avoid breaking the frontend, but log warning
    return NextResponse.json({ items: [], error: 'Channel3 API key not configured' }, { status: 200 });
  }

  try {
    const url = new URL('/v1/search', API_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', '12');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Channel3 API error:', response.status, text);
      return NextResponse.json(
        { error: `Channel3 API returned ${response.status}`, items: [] },
        { status: response.status }
      );
    }

    const data = await response.json();
    const items = Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data?.products)
        ? data.products
        : Array.isArray(data?.items)
          ? data.items
          : [];

    const products = items.map((item: any, idx: number) => ({
      id: String(item.id || item.sku || item.product_id || `ch3-${idx}`),
      name: String(item.title || item.name || 'Car Part').slice(0, 200),
      description: String(
        item.description || `${item.brand || ''} ${item.category || ''} compatible part`.trim()
      ).slice(0, 500),
      price: Number.parseFloat(String(item.price || 0)) || 0,
      image_url: String(item.image || item.thumbnail || '/placeholder-car.png'),
      platform: 'channel3',
      affiliate_link: String(item.url || item.link || '#'),
      category: String(item.category || 'Parts'),
      rating: Number(item.rating || 4.5),
    }));

    return NextResponse.json(
      { items: products },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 6}`,
        },
      }
    );
  } catch (err: any) {
    console.error('Channel3 search error:', err);
    return NextResponse.json(
      { error: 'Internal server error', items: [] },
      { status: 500 }
    );
  }
}