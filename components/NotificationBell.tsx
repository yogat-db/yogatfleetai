// components/NotificationBell.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Inbox, MessageSquare, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  job_id: string | null;
}

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    } catch (err: any) {
      console.error('Fetch notifications error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) console.error('Mark as read error:', error);
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds);
    if (error) {
      console.error('Mark all read error:', error);
      // Revert optimistic update
      fetchNotifications(userId!);
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.read) markAsRead(notif.id);
    if (notif.job_id) {
      router.push(`/marketplace/jobs/${notif.job_id}`);
    }
    setShowDropdown(false);
  };

  const handleViewAll = () => {
    router.push('/notifications');
    setShowDropdown(false);
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  // Setup realtime subscription
  useEffect(() => {
    let mounted = true;

    async function setup() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !mounted) return;
      
      const uid = session.user.id;
      setUserId(uid);
      await fetchNotifications(uid);

      // Clean up previous subscription
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
      }

      // Create new subscription
      const channel = supabase
        .channel(`user-notifs-${uid}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification;
            setNotifications(prev => [newNotif, ...prev.slice(0, 19)]);
            setUnreadCount(prev => prev + 1);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Realtime subscription active for user ${uid}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Realtime subscription error');
          }
        });

      channelRef.current = channel;
    }

    setup();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchNotifications]);

  if (!userId) return null;

  return (
    <div style={styles.container} ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          ...styles.bellButton,
          color: showDropdown ? theme.colors.primary : theme.colors.text.secondary,
        }}
        aria-label="Notifications"
      >
        <Bell size={18} fill={unreadCount > 0 ? `${theme.colors.primary}30` : 'transparent'} />
        {unreadCount > 0 && (
          <span style={styles.badge}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div style={styles.dropdown}>
          <div style={styles.header}>
            <span style={{ fontSize: theme.fontSizes.sm, fontWeight: 600 }}>Activity</span>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} style={styles.markAll}>
                <CheckCheck size={14} />
                Read all
              </button>
            )}
          </div>

          <div style={styles.list}>
            {isLoading ? (
              <div style={styles.empty}>
                <p>Loading...</p>
              </div>
            ) : error ? (
              <div style={styles.empty}>
                <AlertCircle size={24} style={{ opacity: 0.5 }} />
                <p style={{ fontSize: 12 }}>Failed to load</p>
              </div>
            ) : notifications.length === 0 ? (
              <div style={styles.empty}>
                <Inbox size={28} style={{ opacity: 0.3 }} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  style={{
                    ...styles.notifItem,
                    borderLeft: notif.read ? '3px solid transparent' : `3px solid ${theme.colors.primary}`,
                    background: notif.read ? 'transparent' : `${theme.colors.primary}05`,
                  }}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div
                      style={{
                        marginTop: 2,
                        color: notif.read ? theme.colors.text.muted : theme.colors.primary,
                      }}
                    >
                      <MessageSquare size={14} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={styles.notifTitle}>{notif.title}</div>
                      <div style={styles.notifBody}>{notif.body}</div>
                      <div style={styles.notifDate}>{getTimeAgo(notif.created_at)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={styles.footer} onClick={handleViewAll}>
            View all notifications
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  container: { position: 'relative' },
  bellButton: {
    position: 'relative',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  badge: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    background: theme.colors.status.critical,
    color: '#fff',
    borderRadius: '10px',
    minWidth: '16px',
    height: '16px',
    fontSize: '9px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${theme.colors.background.main}`,
    padding: '0 3px',
    lineHeight: 1,
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: '-10px',
    width: '340px',
    maxWidth: 'calc(100vw - 20px)',
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: '16px',
    boxShadow: theme.shadows.lg,
    zIndex: 1000,
    overflow: 'hidden',
    animation: 'slideIn 0.2s ease-out',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: `1px solid ${theme.colors.border.light}`,
  },
  markAll: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'transparent',
    border: 'none',
    color: theme.colors.primary,
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  list: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  notifItem: {
    padding: '14px 16px',
    borderBottom: `1px solid ${theme.colors.border.light}`,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  notifTitle: {
    fontWeight: 600,
    fontSize: '13px',
    color: theme.colors.text.primary,
  },
  notifBody: {
    fontSize: '12px',
    color: theme.colors.text.secondary,
    lineHeight: '1.4',
    margin: '4px 0',
  },
  notifDate: {
    fontSize: '10px',
    color: theme.colors.text.muted,
  },
  footer: {
    padding: '12px',
    textAlign: 'center',
    fontSize: '11px',
    fontWeight: 600,
    color: theme.colors.text.muted,
    background: theme.colors.background.subtle,
    cursor: 'pointer',
    borderTop: `1px solid ${theme.colors.border.light}`,
    transition: 'background 0.2s',
  },
  empty: {
    padding: '48px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    color: theme.colors.text.muted,
    fontSize: '13px',
    textAlign: 'center',
  },
};