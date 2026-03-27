import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

type Notification = {
  id: string;
  title: string;
  message?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
};

export function useNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch existing notifications
  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      console.error('Failed to fetch notifications:', error);
      return;
    }
    setNotifications(data || []);
    setUnreadCount(data?.filter(n => !n.read).length || 0);
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) {
      console.error('Failed to mark as read:', error);
      return;
    }
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false);
    if (error) {
      console.error('Failed to mark all as read:', error);
      return;
    }
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadCount(0);
  }, []);

  // Send a new notification (for internal use, e.g., after a job is assigned)
  const sendNotification = useCallback(async (title: string, message?: string, type: Notification['type'] = 'info') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('notifications').insert({
      user_id: user.id,
      title,
      message,
      type,
    });
    if (error) console.error('Failed to send notification:', error);
  }, []);

  // Subscribe to real‑time notifications for the current user
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      fetchNotifications();

      // Subscribe to new notifications for this user
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            // Show toast
            const toastFn =
              newNotification.type === 'success'
                ? toast.success
                : newNotification.type === 'error'
                ? toast.error
                : newNotification.type === 'warning'
                ? (msg: string) => toast(msg, { icon: '⚠️' })
                : toast;
            toastFn(newNotification.title, { duration: 5000 });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };
    fetchUser();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    sendNotification,
  };
}