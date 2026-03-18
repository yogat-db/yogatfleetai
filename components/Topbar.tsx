'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogOut, Settings, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import NotificationBell from './NotificationBell'

export default function Topbar() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserEmail(user?.email || null)
    }
    getUser()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={styles.topbar}>
      <div style={styles.left}></div> {/* Empty left for spacing */}

      <div style={styles.right}>
        <NotificationBell />

        <div ref={menuRef} style={styles.profileContainer}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            style={styles.profileButton}
          >
            <div style={styles.avatar}>
              <User size={18} color="#94a3b8" />
            </div>
            <span style={styles.email}>{userEmail || 'User'}</span>
            <ChevronDown size={16} color="#94a3b8" />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                style={styles.dropdown}
              >
                <button
                  onClick={() => {
                    setProfileOpen(false)
                    router.push('/settings')
                  }}
                  style={styles.dropdownItem}
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </button>
                <button onClick={handleLogout} style={styles.dropdownItem}>
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  topbar: {
    height: '64px',
    background: 'rgba(15, 23, 42, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid #1e293b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  left: {
    flex: 1,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  profileContainer: {
    position: 'relative',
  },
  profileButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '8px',
    transition: 'background 0.2s',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  email: {
    fontSize: '14px',
    color: '#f1f5f9',
    maxWidth: '150px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: '0',
    width: '200px',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  dropdownItem: {
    width: '100%',
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    color: '#f1f5f9',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'background 0.2s',
    textAlign: 'left',
  },
}