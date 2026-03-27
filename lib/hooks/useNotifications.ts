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

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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

  const markAllAsRead = useCallback(async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false);
    if (error) {
      console.error('Failed to mark all as read:', error);
      return;
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

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

  useEffect(() => {
    const fetchUserAndSubscribe = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      fetchNotifications();

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

            // Unified toast call with options
            const options: { duration: number; icon?: string } = { duration: 5000 };
            switch (newNotification.type) {
              case 'success':
                options.icon = '✅';
                break;
              case 'error':
                options.icon = '❌';
                break;
              case 'warning':
                options.icon = '⚠️';
                break;
              default:
                options.icon = 'ℹ️';
            }
            toast(newNotification.title, options);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };
    fetchUserAndSubscribe();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    sendNotification,
  };
}