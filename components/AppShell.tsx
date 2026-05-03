// components/AppShell.tsx
'use client';

import { ReactNode, useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import Sidebar from './sidebar/Sidebar';      // drawer sidebar (controls open/close via state)
import Topbar from './Topbar';                // topbar with hamburger button
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // controls drawer

  // Determine if route is public (no auth required)
  const isPublicRoute = useMemo(() => {
    const publicRoutes = [
      '/login', '/register', '/forgot-password', '/update-password',
      '/terms', '/privacy', '/cookies',
    ];
    return publicRoutes.includes(pathname);
  }, [pathname]);

  // Authentication check
  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(currentSession);
      setLoading(false);
      if (!currentSession && !isPublicRoute) router.replace('/login');
    };
    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      if (!newSession && !isPublicRoute) router.replace('/login');
    });
    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [router, isPublicRoute]);

  // Loading state
  if (loading) {
    return (
      <div style={styles.loading}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Loader2 size={32} color={theme.colors.primary} />
        </motion.div>
      </div>
    );
  }

  // Public routes: render without sidebar/topbar
  if (isPublicRoute) {
    return <div style={styles.publicContainer}>{children}</div>;
  }

  // Not authenticated (should have been redirected)
  if (!session) return null;

  // Protected layout with drawer sidebar
  return (
    <div style={styles.layout}>
      {/* Sidebar drawer (controlled by parent) */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Main content area */}
      <div style={styles.mainWrapper}>
        {/* Topbar passes the open drawer function */}
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main style={styles.content}>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    minHeight: '100vh',
    background: theme.colors.background.main,
    overflowX: 'hidden',
  },
  mainWrapper: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    width: '100%',
  },
  content: {
    padding: '16px',           // mobile‑friendly
    flex: 1,
    marginTop: '56px',         // height of Topbar
    maxWidth: '100%',
    overflowX: 'hidden',
  },
  publicContainer: {
    minHeight: '100vh',
    background: theme.colors.background.main,
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: theme.colors.background.main,
    flexDirection: 'column',
    gap: '16px',
  },
};