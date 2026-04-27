'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface UserRole {
  isMechanic: boolean;
  isAdmin: boolean;
  mechanicId: string | null;
  userId: string | null;
  loading: boolean;
  error: Error | null;
}

export function useUserRole() {
  const [state, setState] = useState<UserRole>({
    isMechanic: false,
    isAdmin: false,
    mechanicId: null,
    userId: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function getRoles() {
      try {
        // 1. Check for session (Sync check first)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!session?.user) {
          if (isMounted) setState(s => ({ ...s, loading: false }));
          return;
        }

        const user = session.user;

        // 2. Parallelize data fetching (Database check + Admin logic)
        // This avoids "waterfall" loading times
        const [mechanicResponse] = await Promise.all([
          supabase
            .from('mechanics')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle(),
          // Add any other role checks here
        ]);

        if (mechanicResponse.error) throw mechanicResponse.error;

        if (isMounted) {
          setState({
            isMechanic: !!mechanicResponse.data,
            mechanicId: mechanicResponse.data?.id || null,
            isAdmin: user.email === 'teebaxy@gmail.com',
            userId: user.id,
            loading: false,
            error: null,
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setState(s => ({ ...s, loading: false, error: err }));
          console.error('Role Fetch Error:', err.message);
        }
      }
    }

    getRoles();

    // 3. React to Auth State Changes
    // Crucial: If the user logs out or signs in elsewhere, the UI must update
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setState({
          isMechanic: false,
          isAdmin: false,
          mechanicId: null,
          userId: null,
          loading: false,
          error: null,
        });
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        getRoles();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // useMemo prevents unnecessary re-renders in components consuming this hook
  return useMemo(() => state, [state]);
}