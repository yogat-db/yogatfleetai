'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCheck, Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'

type Notification = {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  data: any
  read: boolean
  created_at: string
}

const PAGE_SIZE = 20

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  useEffect(() => {
    fetchNotifications(true)
  }, [])

  const fetchNotifications = async (reset = false) => {
    if (reset) {
      setLoading(true)
      setPage(0)
    } else {
      setLoadingMore(true)
    }

    try {
      const from = reset ? 0 : (page + 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error, count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      if (reset) {
        setNotifications(data || [])
        setPage(0)
      } else {
        setNotifications(prev => [...prev, ...(data || [])])
        setPage(prev => prev + 1)
      }

      setHasMore(count ? from + PAGE_SIZE < count : false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      )
    } catch (err: any) {
      console.error('Failed to mark as read:', err)
    }
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds)

      if (error) throw error

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (err: any) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    if (notification.data?.job_id) {
      router.push(`/marketplace/jobs/${notification.data.job_id}`)
    }
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading notifications...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => fetchNotifications(true)} style={styles.retryButton}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.page}
    >
      <div style={styles.header}>
        <h1 style={styles.title}>All Notifications</h1>
        <button onClick={markAllAsRead} style={styles.markAllButton}>
          <CheckCheck size={18} />
          Mark all as read
        </button>
      </div>

      {notifications.length === 0 ? (
        <div style={styles.empty}>
          <Bell size={48} color="#334155" />
          <p>No notifications yet</p>
        </div>
      ) : (
        <>
          <div style={styles.list}>
            {notifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  ...styles.notificationItem,
                  backgroundColor: notif.read ? '#0f172a' : 'rgba(34,197,94,0.05)',
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
            ))}
          </div>

          {hasMore && (
            <div style={styles.loadMoreContainer}>
              <button
                onClick={() => fetchNotifications()}
                disabled={loadingMore}
                style={styles.loadMoreButton}
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

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
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '40px',
    background: '#020617',
    minHeight: '100vh',
    color: '#f1f5f9',
    fontFamily: 'Inter, sans-serif',
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  markAllButton: {
    background: 'transparent',
    border: '1px solid #22c55e',
    color: '#22c55e',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  notificationItem: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #1e293b',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  notificationContent: {
    flex: 1,
    minWidth: 0,
  },
  notificationTitle: {
    display: 'block',
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  notificationMessage: {
    fontSize: '14px',
    color: '#94a3b8',
    marginBottom: '8px',
    lineHeight: 1.5,
  },
  notificationTime: {
    fontSize: '12px',
    color: '#64748b',
  },
  unreadDot: {
    width: '10px',
    height: '10px',
    background: '#22c55e',
    borderRadius: '50%',
    marginLeft: '12px',
    flexShrink: 0,
  },
  loadMoreContainer: {
    marginTop: '24px',
    textAlign: 'center',
  },
  loadMoreButton: {
    background: 'transparent',
    border: '1px solid #334155',
    color: '#94a3b8',
    padding: '10px 24px',
    borderRadius: '30px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b',
  },
  retryButton: {
    marginTop: '16px',
    padding: '8px 16px',
    background: '#22c55e',
    border: 'none',
    borderRadius: '4px',
    color: '#020617',
    cursor: 'pointer',
  },
}
