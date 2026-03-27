'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/forgot-password', '/update-password'];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const isAuthed = !!session;
      setAuthenticated(isAuthed);
      setLoading(false);

      // If not authenticated and trying to access a protected route, redirect to login
      if (!isAuthed && !publicRoutes.includes(pathname)) {
        router.push('/login');
      }
    };
    checkAuth();

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthenticated(!!session);
    });
    return () => listener.subscription.unsubscribe();
  }, [router, pathname]);

  // For public routes, render only children (no sidebar/topbar)
  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  if (publicRoutes.includes(pathname)) {
    return <>{children}</>;
  }

  // Protected routes – show full layout
  if (!authenticated) {
    // This will redirect, but just in case, return a fallback
    return null;
  }

  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <Topbar />
        <div style={styles.content}>{children}</div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: theme.colors.background.main,
  },
  main: {
    flex: 1,
    marginLeft: 260,
    transition: 'margin-left 0.2s ease',
    minHeight: '100vh',
  },
  content: {
    padding: theme.spacing[6],
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: theme.colors.background.main,
    color: theme.colors.text.secondary,
  },
};