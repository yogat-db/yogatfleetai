// lib/admin-auth.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from './supabase/admin';

export async function requireAdmin() {
  try {
    console.log('[requireAdmin] Starting admin check');
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* no writes needed */ },
        },
      }
    );
    console.log('[requireAdmin] Supabase client created');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[requireAdmin] No user or error:', userError?.message);
      redirect('/login');
    }
    console.log('[requireAdmin] User found:', user.id);

    // Check admin via service role (bypasses RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) {
      console.error('[requireAdmin] Profile fetch error:', profileError.message);
      redirect('/dashboard');
    }
    if (!profile || profile.role !== 'admin') {
      console.error('[requireAdmin] User is not admin. Role:', profile?.role);
      redirect('/dashboard');
    }
    console.log('[requireAdmin] Admin access granted for user:', user.id);
    return user;
  } catch (err) {
    console.error('[requireAdmin] Unexpected error:', err);
    redirect('/login');
  }
}