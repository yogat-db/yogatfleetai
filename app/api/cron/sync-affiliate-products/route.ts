import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type AffiliateRow = {
  external_id: string;
  platform: 'ebay' | 'channel3';
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  commission_rate: number | null;
  image_url: string | null;
  affiliate_link: string;
  source_url: string | null;
  active: boolean;
  sort_order: number;
};

type FetchResult = {
  provider: 'ebay' | 'channel3';
  rows: AffiliateRow[];
  rawCount: number;
  skipped: number;
  errors: string[];
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CHANNEL3_API_KEY = process.env.CHANNEL3_API_KEY;
const CHANNEL3_API_URL = process.env.CHANNEL3_API_URL || 'https://api.trychannel3.com';
const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID || process.env.EBAY_APP_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;
const EBAY_CAMPAIGN_ID = process.env.EBAY_CAMPAIGN_ID;
const CRON_SECRET = process.env.CRON_SECRET;

const EPN_MKRID = '710-53481-19255-0';
const EPN_TOOLID = '10001';

function getBearerToken(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : '';
}

function toNumber(value: unknown, fallback: number | null = null) {
  const n = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

function isValidHttpUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function buildEbayAffiliateLink(viewUrl: string, campaignId: string) {
  const url = new URL(viewUrl);
  url.searchParams.set('mkevt', '1');
  url.searchParams.set('mkcid', '1');
  url.searchParams.set('mkrid', EPN_MKRID);
  url.searchParams.set('campid', campaignId);
  url.searchParams.set('toolid', EPN_TOOLID);
  return url.toString();
}

function dedupeRows(rows: AffiliateRow[]) {
  const map = new Map<string, AffiliateRow>();
  for (const row of rows) {
    if (!row.external_id) continue;
    if (!map.has(row.external_id)) map.set(row.external_id, row);
  }
  return [...map.values()];
}

async function fetchChannel3Products(): Promise<FetchResult> {
  const result: FetchResult = {
    provider: 'channel3',
    rows: [],
    rawCount: 0,
    skipped: 0,
    errors: [],
  };

  if (!CHANNEL3_API_KEY) {
    result.errors.push('CHANNEL3_API_KEY is missing');
    return result;
  }

  const searchTerms = [
    'car accessories',
    'dash cam',
    'car battery',
    'seat covers',
    'car phone mount',
    'led headlight bulbs',
  ];

  for (const term of searchTerms) {
    try {
      const url = new URL('/v1/search', CHANNEL3_API_URL);
      url.searchParams.set('q', term);
      url.searchParams.set('limit', '20');

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${CHANNEL3_API_KEY}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        result.errors.push(`Channel3 ${term}: ${response.status} ${await response.text()}`);
        continue;
      }

      const data = await response.json();
      const items = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data?.items)
            ? data.items
            : [];

      result.rawCount += items.length;

      for (const item of items) {
        const providerId = String(item?.id || item?.sku || item?.product_id || '').trim();
        const name = String(item?.title || item?.name || '').trim();
        const sourceUrl = String(item?.url || item?.link || item?.affiliate_url || '').trim();
        const imageUrl = String(item?.image || item?.thumbnail || '').trim();

        if (!providerId || !name || !isValidHttpUrl(sourceUrl)) {
          result.skipped++;
          continue;
        }

        result.rows.push({
          external_id: `channel3:${providerId}`,
          platform: 'channel3',
          name,
          description: String(item?.description || '').trim() || null,
          category: String(item?.category || 'Parts').trim() || 'Parts',
          price: toNumber(item?.price, 0),
          commission_rate: null,
          image_url: isValidHttpUrl(imageUrl) ? imageUrl : null,
          affiliate_link: sourceUrl,
          source_url: sourceUrl,
          active: true,
          sort_order: 0,
        });
      }
    } catch (error) {
      result.errors.push(`Channel3 ${term}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return result;
}

async function getEbayAccessToken() {
  if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
    throw new Error('EBAY_CLIENT_ID/EBAY_CLIENT_SECRET missing');
  }

  const credentials = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64');

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
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`eBay token error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token as string;
}

async function fetchEbayProducts(): Promise<FetchResult> {
  const result: FetchResult = {
    provider: 'ebay',
    rows: [],
    rawCount: 0,
    skipped: 0,
    errors: [],
  };

  if (!EBAY_CAMPAIGN_ID) {
    result.errors.push('EBAY_CAMPAIGN_ID is missing');
    return result;
  }

  let accessToken = '';
  try {
    accessToken = await getEbayAccessToken();
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Failed to get eBay access token');
    return result;
  }

  const searchTerms = [
    'car accessories',
    'dash cam',
    'car phone mount',
    'seat covers',
    'led headlight bulbs',
    'car vacuum cleaner',
  ];

  for (const term of searchTerms) {
    try {
      const url = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search');
      url.searchParams.set('q', term);
      url.searchParams.set('limit', '20');

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        result.errors.push(`eBay ${term}: ${response.status} ${await response.text()}`);
        continue;
      }

      const data = await response.json();
      const items = Array.isArray(data?.itemSummaries) ? data.itemSummaries : [];

      result.rawCount += items.length;

      for (const item of items) {
        const itemId = String(item?.itemId || '').trim();
        const title = String(item?.title || '').trim();
        const sourceUrl = String(item?.itemWebUrl || '').trim();
        const imageUrl = String(item?.image?.imageUrl || '').trim();

        if (!itemId || !title || !isValidHttpUrl(sourceUrl)) {
          result.skipped++;
          continue;
        }

        result.rows.push({
          external_id: `ebay:${itemId}`,
          platform: 'ebay',
          name: title,
          description: String(item?.condition || '').trim() || null,
          category: item?.categories?.[0]?.categoryName || 'eBay Search',
          price: toNumber(item?.price?.value, 0),
          commission_rate: null,
          image_url: isValidHttpUrl(imageUrl) ? imageUrl : null,
          affiliate_link: buildEbayAffiliateLink(sourceUrl, EBAY_CAMPAIGN_ID),
          source_url: sourceUrl,
          active: true,
          sort_order: 0,
        });
      }
    } catch (error) {
      result.errors.push(`eBay ${term}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return result;
}

export async function GET(request: NextRequest) {
 // TEMPORARILY DISABLE AUTH FOR LOCAL TESTING
if (process.env.NODE_ENV === 'production') {
  const token = getBearerToken(request);
  if (!CRON_SECRET || token !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { success: false, stage: 'env', error: 'Supabase env vars missing' },
      { status: 500 }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const [channel3, ebay] = await Promise.all([
      fetchChannel3Products(),
      fetchEbayProducts(),
    ]);

    const rows = dedupeRows([...channel3.rows, ...ebay.rows]);

    if (rows.length === 0) {
      return NextResponse.json({
        success: false,
        stage: 'fetch',
        channel3,
        ebay,
        message: 'No valid provider rows found',
      });
    }

    const { error } = await supabase
      .from('affiliate_products')
      .upsert(rows, { onConflict: 'external_id' });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          stage: 'upsert',
          error: error.message,
          dedupedCount: rows.length,
          channel3,
          ebay,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      inserted: rows.length,
      channel3,
      ebay,
      sample: rows.slice(0, 5),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        stage: 'unexpected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}