'use client';

import { ReactNode, useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  // Memoize public routes for performance
  const isPublicRoute = useMemo(() => {
    const publicRoutes = ['/login', '/register', '/forgot-password', '/update-password'];
    return publicRoutes.includes(pathname);
  }, [pathname]);

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setLoading(false);

      if (!currentSession && !isPublicRoute) {
        router.replace('/login');
      }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession && !isPublicRoute) {
        router.replace('/login');
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [router, isPublicRoute]);

  // 1. Loading State (Branded)
  if (loading) {
    return (
      <div style={styles.loading}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Loader2 size={32} color={theme.colors.primary} />
        </motion.div>
      </div>
    );
  }

  // 2. Public Route Layout (Auth Pages)
  if (isPublicRoute) {
    return (
      <div style={styles.publicContainer}>
        {children}
      </div>
    );
  }

  // 3. Navigation Guard (Prevent flash of protected content)
  if (!session) return null;

  // 4. Protected App Layout
  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.mainWrapper}>
        <Topbar />
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
    display: 'flex',
    minHeight: '100vh',
    background: theme.colors.background.main,
    overflowX: 'hidden',
  },
  mainWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    // Ensures content doesn't hide behind fixed sidebar (assuming sidebar is 260px)
    marginLeft: '260px', 
    transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    minWidth: 0, // Flexbox fix for inner scrolling
  },
  content: {
    padding: theme.spacing[8], // Increased padding for a more spacious, premium feel
    flex: 1,
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
