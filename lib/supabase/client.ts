import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    storageKey: 'sb-auth-token',
    autoRefreshToken: true,
    persistSession: true,
  },
  // Do NOT override global.fetch – leave it untouched so Supabase can add headers
});