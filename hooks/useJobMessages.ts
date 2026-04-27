'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface Message {
  id: string;
  job_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  isOptimistic?: boolean; // Added to track unsaved messages
}

export function useJobMessages(jobId: string, currentUserId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use a ref to keep track of the latest messages to avoid stale closures in the subscription
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  const fetchMessages = useCallback(async () => {
    if (!jobId) return;
    try {
      const { data, error: fetchErr } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (fetchErr) throw fetchErr;
      setMessages(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId || !currentUserId) return;

    fetchMessages();

    // 1. Robust Real-time Subscription
    const channel = supabase
      .channel(`job_chat_${jobId}`)
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
          
          // 2. deduplication: Only add if it's not our own optimistic message 
          // (which we already added to the UI manually)
          setMessages((prev) => {
            const exists = prev.some(m => m.id === newMsg.id);
            if (exists) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          setError('Lost real-time connection. Messages may not be live.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, currentUserId, fetchMessages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !currentUserId || !jobId) return;

    // 3. OPTIMISTIC UPDATE: Add the message to the UI instantly
    const tempId = crypto.randomUUID();
    const optimisticMsg: Message = {
      id: tempId,
      job_id: jobId,
      sender_id: currentUserId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const { data, error: sendErr } = await supabase
        .from('chat_messages')
        .insert({
          job_id: jobId,
          sender_id: currentUserId,
          content: content.trim(),
        })
        .select()
        .single();

      if (sendErr) throw sendErr;

      // 4. Replace the optimistic message with the real one from the server
      setMessages((prev) => 
        prev.map(m => (m.id === tempId ? data : m))
      );
    } catch (err: any) {
      // 5. ROLLBACK: Remove the optimistic message if it failed
      setMessages((prev) => prev.filter(m => m.id !== tempId));
      setError(`Failed to send: ${err.message}`);
    }
  }, [jobId, currentUserId]);

  return { messages, loading, error, sendMessage };
}