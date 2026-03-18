'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCheck } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'

export default function NotificationBell() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    // Navigate based on notification data (if job_id present)
    if (notification.data?.job_id) {
      router.push(`/marketplace/jobs/${notification.data.job_id}`)
    }
    setIsOpen(false)
  }

  return (
    <div ref={menuRef} style={styles.container}>
      <button onClick={() => setIsOpen(!isOpen)} style={styles.bellButton}>
        <Bell size={20} color="#94a3b8" />
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={styles.dropdown}
          >
            <div style={styles.dropdownHeader}>
              <h3 style={styles.dropdownTitle}>Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} style={styles.markAllButton}>
                  <CheckCheck size={16} />
                  Mark all read
                </button>
              )}
            </div>

            <div style={styles.notificationList}>
              {loading ? (
                <div style={styles.loading}>Loading...</div>
              ) : notifications.length === 0 ? (
                <div style={styles.empty}>No notifications</div>
              ) : (
                notifications.map((notif) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      ...styles.notificationItem,
                      backgroundColor: notif.read ? 'transparent' : 'rgba(34,197,94,0.05)',
                    }}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div style={styles.notificationContent}>
                      <strong style={styles.notificationTitle}>{notif.title}</strong>
                      <p style={styles.notificationMessage}>{notif.message}</p>
                      <span style={styles.notificationTime}>
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {!notif.read && <span style={styles.unreadDot} />}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'inline-block',
  },
  bellButton: {
    position: 'relative',
    background: 'transparent',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: '0',
    right: '0',
    background: '#ef4444',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 600,
    minWidth: '16px',
    height: '16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: '0',
    width: '350px',
    maxWidth: '90vw',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  dropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #1e293b',
  },
  dropdownTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  markAllButton: {
    background: 'transparent',
    border: 'none',
    color: '#22c55e',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  notificationList: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  notificationItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #1e293b',
    transition: 'background 0.2s',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#f1f5f9',
    marginBottom: '4px',
  },
  notificationMessage: {
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '4px',
    lineHeight: 1.4,
  },
  notificationTime: {
    fontSize: '11px',
    color: '#64748b',
  },
  unreadDot: {
    width: '8px',
    height: '8px',
    background: '#22c55e',
    borderRadius: '50%',
    marginTop: '4px',
  },
  loading: {
    padding: '20px',
    textAlign: 'center',
    color: '#94a3b8',
  },
  empty: {
    padding: '20px',
    textAlign: 'center',
    color: '#64748b',
  },
}