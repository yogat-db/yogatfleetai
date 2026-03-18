'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import Topbar from './Topbar'
import type { User } from '@supabase/supabase-js'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Fleet', href: '/vehicles', icon: '🚚' },
  { name: 'Marketplace', href: '/marketplace', icon: '🛒' },
  { name: 'Diagnostics', href: '/diagnostics', icon: '🔍' },
  { name: 'Service History', href: '/service-history', icon: '📅' },
  { name: 'Control Center', href: '/control-center', icon: '🛰️' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isMechanic, setIsMechanic] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Check if user is a mechanic
      const { data: mechanic } = await supabase
        .from('mechanics')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      setIsMechanic(!!mechanic)
      setLoading(false)
    }
    loadUser()
  }, [router])

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
      </div>
    )
  }

  if (!user) return null

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>Yogat Fleet AI</div>
        <nav style={styles.nav}>
          {navItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} passHref legacyBehavior>
                <motion.a
                  whileHover={{ x: 4 }}
                  style={active ? styles.activeLink : styles.link}
                >
                  <span style={styles.icon}>{item.icon}</span>
                  {item.name}
                </motion.a>
              </Link>
            )
          })}
          {isMechanic && (
            <Link href="/marketplace/mechanics/dashboard" passHref legacyBehavior>
              <motion.a
                whileHover={{ x: 4 }}
                style={pathname === '/marketplace/mechanics/dashboard' ? styles.activeLink : styles.link}
              >
                <span style={styles.icon}>🔧</span>
                Mechanic Dashboard
              </motion.a>
            </Link>
          )}
        </nav>
        {/* No user section in sidebar – moved to Topbar */}
      </aside>

      {/* Main area with Topbar */}
      <div style={styles.mainArea}>
        <Topbar />
        <main style={styles.mainContent}>{children}</main>
      </div>

      <style jsx>{`
        .spinner {
          border: 3px solid rgba(255,255,255,0.1);
          border-top: 3px solid #22c55e;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#020617',
  },
  sidebar: {
    width: '280px',
    background: 'rgba(15, 23, 42, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRight: '1px solid #1e293b',
    padding: '30px 20px',
    position: 'fixed',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 20,
  },
  logo: {
    fontSize: '22px',
    fontWeight: 800,
    marginBottom: '40px',
    color: '#22c55e',
    letterSpacing: '-0.5px',
    paddingLeft: '12px',
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '10px',
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  activeLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '10px',
    background: 'rgba(34, 197, 94, 0.1)',
    color: '#22c55e',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: 600,
  },
  icon: {
    fontSize: '18px',
    width: '24px',
    textAlign: 'center' as const,
  },
  mainArea: {
    flex: 1,
    marginLeft: '280px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  mainContent: {
    flex: 1,
    background: '#020617',
  },
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#020617',
  },
}