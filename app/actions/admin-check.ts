'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';

export async function checkAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();  // ✅ returns null if not found, NO error
  if (error) {
    console.error('Admin check failed:', error);
    return false;
  }
  return data?.role === 'admin';
}