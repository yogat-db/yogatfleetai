// app/layout.tsx
'use client'; // Required for Framer Motion + usePathname

import { Inter } from 'next/font/google';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import AppShell from '@/components/AppShell';
import ParticlesBackground from '@/components/ParticlesBackground';
import NotificationBell from '@/components/NotificationBell';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Page transition variants
  const pageVariants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} style={styles.body} suppressHydrationWarning>
        <ParticlesBackground />

        {/* Floating UI (notification bell) */}
        <div style={styles.notificationWrapper}>
          <NotificationBell />
        </div>

        <AppShell>
          <AnimatePresence mode="wait">
            <motion.main
              key={pathname}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              style={styles.mainContent}
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </AppShell>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: 'rgba(15, 23, 42, 0.9)',
              color: '#fff',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '12px',
            },
          }}
        />
      </body>
    </html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    margin: 0,
    padding: 0,
    minHeight: '100vh',
    position: 'relative',
    overflowX: 'hidden',
  },
  notificationWrapper: {
    position: 'fixed',
    top: '1.25rem',
    right: '1.5rem',
    zIndex: 1100,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  mainContent: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
  },
};