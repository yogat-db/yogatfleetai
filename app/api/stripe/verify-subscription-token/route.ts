import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/api/stripe/create-subscription-token/route';

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  
  const userId = verifyToken(token);
  if (!userId) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  
  return NextResponse.json({ userId });
}