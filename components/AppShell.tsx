// components/AppShell.tsx
'use client';

import { ReactNode, useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import Sidebar from './sidebar/Sidebar';      // your drawer sidebar
import Topbar from './Topbar';                // your topbar with hamburger
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // drawer state

  // Public routes (no auth required)
  const publicRoutes = [
    '/login', '/register', '/forgot-password', '/update-password',
    '/terms', '/privacy', '/cookies',
  ];
  const isPublicRoute = useMemo(() => publicRoutes.includes(pathname), [pathname]);

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setLoading(false);
      if (!currentSession && !isPublicRoute) router.replace('/login');
    };
    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession && !isPublicRoute) router.replace('/login');
    });
    return () => authListener.subscription.unsubscribe();
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

  // Public route layout (login, register, etc.)
  if (isPublicRoute) {
    return <div style={styles.publicContainer}>{children}</div>;
  }

  // Protected: still loading session? prevent flash
  if (!session) return null;

  // Protected layout with drawer sidebar
  return (
    <div style={styles.layout}>
      {/* Slide-out drawer sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Main content area */}
      <div style={styles.mainWrapper}>
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

// ==================== STYLES ====================
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
    padding: '16px',                // mobile‑friendly padding
    flex: 1,
    marginTop: '56px',              // topbar height
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