// app/admin/sync/route.ts
import { NextResponse } from 'next/server';
import { GET as syncGET } from '@/app/api/cron/sync-affiliate-products/route';

export async function GET() {
  // Mock request with auth (needs CRON_SECRET in .env)
  const mockReq = new Request('http://localhost:3000/api/cron/sync-affiliate-products', {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` }
  });
  const res = await syncGET(mockReq as any);
  const data = await res.json();
  return NextResponse.json(data);
}