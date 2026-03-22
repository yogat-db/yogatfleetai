'use client'

import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import AppShell from '@/components/AppShell'

// Simple gradient background (no extra dependencies)
function Background() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 30% 40%, #1e293b 0%, #020617 80%)',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  )
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Define routes where the sidebar should NOT be shown
  const isAuthPage =
    pathname?.startsWith('/auth') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/'

  return (
    <>
      <Background />

      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          style={{ height: '100%' }}
        >
          {isAuthPage ? children : <AppShell>{children}</AppShell>}
        </motion.div>
      </AnimatePresence>
    </>
  )
}
