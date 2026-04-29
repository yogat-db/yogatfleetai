import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

// In-memory store (use Redis or DB in production)
const tokenStore = new Map<string, { userId: string; expires: number }>();

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = randomBytes(32).toString('hex');
  tokenStore.set(token, { userId: user.id, expires: Date.now() + 10 * 60 * 1000 }); // 10 min

  return NextResponse.json({ token });
}

// Helper for success page
export function verifyToken(token: string): string | null {
  const entry = tokenStore.get(token);
  if (!entry || entry.expires < Date.now()) return null;
  tokenStore.delete(token);
  return entry.userId;
}