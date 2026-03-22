// app/hooks/useJobMessages.ts
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: string;
  job_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface UseJobMessagesOptions {
  jobId: string;
  userId?: string;
  onNewMessage?: (message: Message) => void;
}

export function useJobMessages({ jobId, userId, onNewMessage }: UseJobMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('job_messages')
        .select('*, user:user_id(id, name, avatar)')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setMessages(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [jobId, supabase]);

  useEffect(() => {
    fetchMessages();

    let channel: RealtimeChannel | null = null;

    const setupSubscription = () => {
      channel = supabase
        .channel(`job-messages:${jobId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'job_messages',
            filter: `job_id=eq.${jobId}`,
          },
          (payload) => {
            const newMessage = payload.new as Message;
            // Optionally fetch user data if not included
            const messageWithUser = { ...newMessage, user: undefined };
            setMessages((prev) => [...prev, messageWithUser]);
            if (onNewMessage) onNewMessage(messageWithUser);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Subscribed to job messages for job ${jobId}`);
          }
        });
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [jobId, supabase, fetchMessages, onNewMessage]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!userId) {
        setError('User not authenticated');
        return false;
      }
      try {
        const { error: insertError } = await supabase
          .from('job_messages')
          .insert({
            job_id: jobId,
            user_id: userId,
            content,
            created_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        return false;
      }
    },
    [jobId, userId, supabase]
  );

  return {
    messages,
    loading,
    error,
    sendMessage,
    refresh: fetchMessages,
  };
}