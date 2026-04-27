// app/api/channel3/search/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
  }

  const API_KEY = process.env.CHANNEL3_API_KEY;
  const API_URL = process.env.CHANNEL3_API_URL || 'https://api.trychannel3.com';

  if (!API_KEY) {
    console.error('CHANNEL3_API_KEY is not set in environment variables');
    return NextResponse.json({ error: 'Channel3 API key missing' }, { status: 500 });
  }

  try {
    const url = `${API_URL}/v1/search?q=${encodeURIComponent(query)}&limit=12`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Channel3 API error:', response.status, await response.text());
      return NextResponse.json({ error: `Channel3 API returned ${response.status}` }, { status: response.status });
    }

    const data = await response.json();

    // Transform Channel3 response to match our Product interface
    // The exact structure may vary; we try to be flexible.
    const items = data.results || data.products || data.items || [];
    const products = items.map((item: any) => ({
      id: item.id || item.sku || `ch3-${Date.now()}-${Math.random()}`,
      name: item.title || item.name || 'Car Part',
      description: item.description || `${item.brand || ''} ${item.category || ''} compatible part`.trim(),
      price: parseFloat(item.price) || 0,
      image_url: item.image || item.thumbnail || '/placeholder-car.png',
      platform: 'channel3',
      affiliate_link: item.url || item.link || '#',
      category: item.category || 'Parts',
      rating: item.rating || 4.5,
    }));

    return NextResponse.json({ items: products });
  } catch (err: any) {
    console.error('Channel3 search error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}