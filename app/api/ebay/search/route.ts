// app/api/ebay/search/route.ts
import { NextResponse } from 'next/server';

const EPN_MKRID = '710-53481-19255-0';
const TOOLID = '10001';

function buildEpnLink(viewUrl: string, campaignId: string) {
  const url = new URL(viewUrl);
  url.searchParams.set('mkevt', '1');
  url.searchParams.set('mkcid', '1');
  url.searchParams.set('mkrid', EPN_MKRID);
  url.searchParams.set('campid', campaignId);
  url.searchParams.set('toolid', TOOLID);
  return url.toString();
}

// Get OAuth token using client credentials (Client ID + Client Secret)
async function getEbayAccessToken() {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('EBAY_CLIENT_ID or EBAY_CLIENT_SECRET missing');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'https://api.ebay.com/oauth/api_scope',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`eBay token error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') || '').trim();

  if (!query) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
  }

  const campaignId = process.env.EBAY_CAMPAIGN_ID;

  if (!campaignId) {
    return NextResponse.json({ error: 'EBAY_CAMPAIGN_ID missing' }, { status: 500 });
  }

  try {
    const accessToken = await getEbayAccessToken();

    // eBay Buy API (modern) – item search
    const url = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search');
    url.searchParams.set('q', query);
    url.searchParams.set('limit', '12');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB', // UK marketplace
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('eBay API error:', response.status, errorText);
      return NextResponse.json(
        { error: `eBay API returned ${response.status}`, items: [] },
        { status: response.status }
      );
    }

    const data = await response.json();
    const items = data?.itemSummaries || [];

    const products = items.map((item: any, idx: number) => {
      const itemId = item.itemId || `ebay-${idx}`;
      const viewItemUrl = item.itemWebUrl;
      if (!viewItemUrl) return null;

      return {
        id: String(itemId),
        name: String(item.title || 'eBay Item'),
        description: `Condition: ${item.condition || 'New'}`,
        price: parseFloat(item.price?.value) || 0,
        image_url: item.image?.imageUrl || '/placeholder-car.png',
        platform: 'ebay',
        affiliate_link: buildEpnLink(viewItemUrl, campaignId),
        category: 'eBay Search',
        rating: 4.5,
      };
    }).filter(Boolean);

    return NextResponse.json(
      { items: products },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800' } }
    );
  } catch (err) {
    console.error('eBay search error:', err);
    return NextResponse.json({ error: 'Internal server error', items: [] }, { status: 500 });
  }
}