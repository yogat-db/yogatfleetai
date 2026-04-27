import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Singleton-style browser client for client-side interactions.
 * Safe for use in 'use client' components.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)