// app/api/ebay/search/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
  }

  const appId = process.env.EBAY_APP_ID;
  const token = process.env.EBAY_API_TOKEN;
  const campaignId = process.env.EBAY_CAMPAIGN_ID;

  if (!appId || !token || !campaignId) {
    console.error('eBay credentials missing:', { appId: !!appId, token: !!token, campaignId: !!campaignId });
    return NextResponse.json({ error: 'eBay API not configured' }, { status: 500 });
  }

  // eBay Finding API endpoint
  const url = `https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.0.0&SECURITY-APPNAME=${appId}&RESPONSE-DATA-FORMAT=JSON&REST-PAYLOAD&keywords=${encodeURIComponent(query)}&paginationInput.entriesPerPage=12`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('eBay API error:', response.status, errorText);
      return NextResponse.json({ error: `eBay API returned ${response.status}` }, { status: response.status });
    }

    const data = await response.json();

    // Extract items from eBay's nested response
    const items = data.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.item || [];

    if (items.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const products = items.map((item: any) => {
      const itemId = item.itemId?.[0];
      const viewItemUrl = item.viewItemURL?.[0];
      if (!itemId || !viewItemUrl) return null;

      const affiliateLink = `https://rover.ebay.com/rover/1/710-53481-19255-0/1?mpre=${encodeURIComponent(viewItemUrl)}&campid=${campaignId}&toolid=10001`;

      return {
        id: itemId,
        name: item.title?.[0] || 'eBay Item',
        description: `Condition: ${item.condition?.[0]?.conditionDisplayName?.[0] || 'New'}`,
        price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__) || 0,
        image_url: item.galleryURL?.[0] || '/placeholder-car.png',
        platform: 'ebay',
        affiliate_link: affiliateLink,
        category: 'eBay Search',
        rating: 4.5,
      };
    }).filter(Boolean);

    return NextResponse.json({ items: products });
  } catch (err: any) {
    console.error('eBay search error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}