'use client'

import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import AppShell from '@/components/AppShell'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname?.startsWith('/auth') || pathname === '/login' || pathname === '/register' || pathname === '/'

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 30% 40%, #1e293b 0%, #020617 80%)',
        zIndex: -1,
        pointerEvents: 'none',
      }} />
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