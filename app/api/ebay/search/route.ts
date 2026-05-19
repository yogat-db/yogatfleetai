// app/api/ebay/search/route.ts
import { NextResponse } from 'next/server';

const EPN_MKRID = '710-53481-19255-0';
const TOOLID = '10001';
const EBAY_MARKETPLACE_ID = 'EBAY_GB';

let cachedToken: { value: string; expiresAt: number } | null = null;

function buildEpnLink(viewUrl: string, campaignId: string) {
  const url = new URL(viewUrl);
  url.searchParams.set('mkevt', '1');
  url.searchParams.set('mkcid', '1');
  url.searchParams.set('mkrid', EPN_MKRID);
  url.searchParams.set('campid', campaignId);
  url.searchParams.set('toolid', TOOLID);
  return url.toString();
}

async function getEbayAccessToken() {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('EBAY_CLIENT_ID or EBAY_CLIENT_SECRET missing');
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  const credentials = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString('base64');

  const response = await fetch(
    'https://api.ebay.com/identity/v1/oauth2/token',
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'https://api.ebay.com/oauth/api_scope',
      }),
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`eBay token error: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 7200) * 1000,
  };

  return cachedToken.value;
}

function toProduct(item: any, campaignId: string, idx: number) {
  const itemId = item?.itemId || `ebay-${idx}`;
  const viewItemUrl = item?.itemWebUrl;

  if (!viewItemUrl) return null;

  const primaryPrice = Number(item?.price?.value ?? 0);
  const originalPrice = Number(item?.marketingPrice?.originalPrice?.value ?? 0);

  return {
    id: String(itemId),
    name: String(item?.title || 'eBay Item'),
    description: item?.subtitle
      ? String(item.subtitle)
      : `Condition: ${item?.condition || 'Unknown'}`,
    price: Number.isFinite(primaryPrice) ? primaryPrice : 0,
    original_price:
      Number.isFinite(originalPrice) && originalPrice > primaryPrice
        ? originalPrice
        : null,
    currency: item?.price?.currency || 'GBP',
    image_url: item?.image?.imageUrl || '/placeholder-car.png',
    affiliate_link: buildEpnLink(viewItemUrl, campaignId),
    external_url: viewItemUrl,
    platform: 'ebay',
    category: item?.categories?.[0]?.categoryName || 'eBay Search',
    condition: item?.condition || null,
    seller: item?.seller?.username || null,
    shipping:
      item?.shippingOptions?.[0]?.shippingCost?.value != null
        ? Number(item.shippingOptions[0].shippingCost.value)
        : null,
    location: item?.itemLocation?.country || 'GB',
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') || '').trim();
  const limit = Math.min(
    Math.max(Number(searchParams.get('limit') || 12), 1),
    24
  );

  if (!query) {
    return NextResponse.json(
      { error: 'Missing search query', items: [] },
      { status: 400 }
    );
  }

  const campaignId = process.env.EBAY_CAMPAIGN_ID;
  if (!campaignId) {
    return NextResponse.json(
      { error: 'EBAY_CAMPAIGN_ID missing', items: [] },
      { status: 500 }
    );
  }

  try {
    const accessToken = await getEbayAccessToken();

    const url = new URL(
      'https://api.ebay.com/buy/browse/v1/item_summary/search'
    );
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('sort', 'best_match');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': EBAY_MARKETPLACE_ID,
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('eBay API error:', response.status, errorText);

      return NextResponse.json(
        {
          error: `eBay API returned ${response.status}`,
          items: [],
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const items = Array.isArray(data?.itemSummaries)
      ? data.itemSummaries
      : [];

    const products = items
      .map((item: any, idx: number) => toProduct(item, campaignId, idx))
      .filter(Boolean);

    return NextResponse.json(
      {
        items: products,
        total: data?.total ?? products.length,
        limit,
        query,
      },
      {
        headers: {
          'Cache-Control':
            'public, s-maxage=300, stale-while-revalidate=1800',
        },
      }
    );
  } catch (err) {
    console.error('eBay search error:', err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Internal server error',
        items: [],
      },
      { status: 500 }
    );
  }
}