import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client'; // ✅ import supabase instance

interface Message {
  id: string;
  job_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export function useJobMessages(jobId: string, currentUserId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`job:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id !== currentUserId) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, currentUserId, fetchMessages]);

  const sendMessage = useCallback(async (content: string) => {
    try {
      const { error } = await supabase.from('chat_messages').insert({
        job_id: jobId,
        sender_id: currentUserId,
        content,
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    }
  }, [jobId, currentUserId]);

  return { messages, loading, error, sendMessage };
}