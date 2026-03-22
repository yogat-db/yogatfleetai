// components/AppShell.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import theme from '@/app/theme'

// Base links for all authenticated users
const baseLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/vehicles', label: 'Fleet', icon: '🚚' },
  { href: '/marketplace', label: 'Marketplace', icon: '🛒' },
  { href: '/diagnostics', label: 'Diagnostics', icon: '🔍' },
  { href: '/service-history', label: 'Service', icon: '📅' },
  { href: '/control-center', label: 'Control', icon: '🛰️' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

// Additional links for specific roles
const roleLinks = {
  admin: [
    { href: '/admin/jobs', label: 'Admin Jobs', icon: '🔧' },
    { href: '/admin/mechanics', label: 'Admin Mechanics', icon: '🔧' },
  ],
  mechanic: [
    { href: '/marketplace/mechanics/dashboard', label: 'My Dashboard', icon: '🛠️' },
  ],
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          router.push('/login')
          return
        }

        setUserEmail(user.email || null)

        // Fetch role from profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Error fetching user role:', profileError)
          setRole(null)
        } else {
          setRole(profile?.role || null)
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setRole(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router])

  // Build the final link list
  let links = [...baseLinks]
  if (role === 'admin') {
    links = [...links, ...roleLinks.admin]
  } else if (role === 'mechanic') {
    links = [...links, ...roleLinks.mechanic]
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div style={styles.layout}>
        <aside style={styles.sidebar}>
          <div style={styles.logo}>Yogat Fleet AI</div>
          <div style={styles.loading}>Loading...</div>
        </aside>
        <main style={styles.main}>{children}</main>
      </div>
    )
  }

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>Yogat Fleet AI</div>
        <nav style={styles.nav}>
          {links.map((l) => {
            const active = pathname === l.href
            return (
              <Link key={l.href} href={l.href} style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ x: 4 }}
                  style={active ? styles.activeLink : styles.link}
                >
                  <span style={styles.icon}>{l.icon}</span>
                  {l.label}
                </motion.div>
              </Link>
            )
          })}
        </nav>
        <div style={styles.userSection}>
          <div style={styles.userEmail}>{userEmail}</div>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Sign Out
          </button>
        </div>
      </aside>
      <main style={styles.main}>{children}</main>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  layout: { display: 'flex', minHeight: '100vh', background: '#020617' },
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
    zIndex: 10,
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
    cursor: 'pointer',
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
  icon: { fontSize: '18px', width: '24px', textAlign: 'center' as const },
  userSection: {
    marginTop: 'auto',
    paddingTop: '20px',
    borderTop: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  userEmail: {
    fontSize: '12px',
    color: '#64748b',
    textAlign: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoutButton: {
    background: 'transparent',
    border: '1px solid #ef4444',
    color: '#ef4444',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  loading: {
    padding: '12px 16px',
    color: '#94a3b8',
    textAlign: 'center',
  },
  main: { flex: 1, marginLeft: '280px', minHeight: '100vh', background: '#020617' },
}
