'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

// 1. Define a strict interface for the Role State
interface RoleState {
  isMechanic: boolean;
  isAdmin: boolean;
  mechanicId: string | null;
  userId: string | null;
  userEmail: string | null;
  loading: boolean;
  error: string | null;
}

// 2. Define the Context structure including the refresh function
interface RoleContextType extends RoleState {
  refresh: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RoleState>({
    isMechanic: false,
    isAdmin: false,
    mechanicId: null,
    userId: null,
    userEmail: null,
    loading: true,
    error: null,
  });

  // 3. Memoized fetch function to prevent recreation on every render
  const fetchRoles = useCallback(async () => {
    try {
      // Get session - getUser() is more secure than getSession() for role checks
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setState({
          isMechanic: false,
          isAdmin: false,
          mechanicId: null,
          userId: null,
          userEmail: null,
          loading: false,
          error: null,
        });
        return;
      }

      // Parallelize DB calls
      const { data: mechanic, error: mechError } = await supabase
        .from('mechanics')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (mechError) throw mechError;

      setState({
        isMechanic: !!mechanic,
        mechanicId: mechanic?.id || null,
        isAdmin: user.email === 'teebaxy@gmail.com', // Replace with your logic or DB check
        userId: user.id,
        userEmail: user.email || null,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      console.error('RoleProvider Error:', err);
      setState(prev => ({ ...prev, loading: false, error: err.message }));
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchRoles();

    // 4. Real-time Auth Synchronization
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setState({
          isMechanic: false,
          isAdmin: false,
          mechanicId: null,
          userId: null,
          userEmail: null,
          loading: false,
          error: null,
        });
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        fetchRoles();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchRoles]);

  // 5. useMemo prevents the entire app from re-rendering unless the role data actually changes
  const contextValue = useMemo(() => ({
    ...state,
    refresh: fetchRoles
  }), [state, fetchRoles]);

  return (
    <RoleContext.Provider value={contextValue}>
      {children}
    </RoleContext.Provider>
  );
}

// 6. Custom hook with built-in error handling
export const useUser = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a RoleProvider');
  }
  return context;
};