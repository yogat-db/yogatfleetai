// app/api/external-parts/search/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const category = searchParams.get('category'); // optional

  if (!query) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
  }

  // Get API key from environment variables
  const API_KEY = process.env.CHANNEL3_API_KEY; // change to your provider
  const API_URL = process.env.CHANNEL3_API_URL;

  if (!API_KEY) {
    console.warn('External parts API not configured – returning mock results');
    // Return mock results for development
    return NextResponse.json({
      items: [
        {
          name: `Mock part for "${query}"`,
          description: 'High-quality compatible part',
          price: 39.99,
          image_url: '/placeholder-car.png',
          platform: 'channel3',
          affiliate_link: `https://example.com/search?q=${encodeURIComponent(query)}`,
          category: category || 'Parts',
          rating: 4.5,
        },
      ],
    });
  }

  try {
    // Construct the external API call (example using Channel3)
    const url = `${API_URL}?q=${encodeURIComponent(query)}&api_key=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('External API request failed');
    const data = await response.json();

    // Transform external data to match your Product interface
    const products = (data.results || []).map((item: any) => ({
      name: item.title || item.name,
      description: item.description || 'Compatible car part',
      price: parseFloat(item.price) || 0,
      image_url: item.image || '/placeholder-car.png',
      platform: 'external', // or 'channel3', 'autodoc', etc.
      affiliate_link: item.link || item.affiliate_url,
      category: category || item.category || 'Parts',
      rating: item.rating || 4.5,
    }));

    return NextResponse.json({ items: products });
  } catch (err: any) {
    console.error('External parts API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}