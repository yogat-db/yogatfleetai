'use client';

/**
 * PATH CHECK: 
 * If your RoleContext is in 'src/context', use '@/context/RoleContext'
 * If it's in 'app/context', use '@/app/context/RoleContext'
 * If you get an error, try the relative path: '../context/RoleContext'
 */
import { useUser } from '@/app/contexts/RoleContext';

/**
 * useMechanic Hook
 * * UPGRADE: Instead of managing its own state and database calls, 
 * this hook now consumes the global RoleProvider. 
 */
export function useMechanic() {
  const { 
    isMechanic, 
    mechanicId, 
    loading, 
    error,
    refresh 
  } = useUser();

  return { 
    isMechanic, // boolean: true if user is a mechanic
    mechanicId, // string: the mechanic's UUID from the DB
    loading,    // boolean: true if session is still loading
    error,      // string: error message if DB/Auth failed
    refresh     // function: call this to force a re-check of roles
  };
}