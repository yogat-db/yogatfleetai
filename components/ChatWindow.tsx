'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Send, User, Clock } from 'lucide-react';
import theme from '@/app/theme';

interface Message {
  id: string;
  job_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  isOptimistic?: boolean; // Track locally added messages
}

interface ChatWindowProps {
  jobId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
}

export default function ChatWindow({ jobId, currentUserId, otherUserName }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchErr } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (fetchErr) throw fetchErr;
      setMessages(data || []);
      // Instant scroll on first load
      setTimeout(() => scrollToBottom('auto'), 100);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId || !currentUserId) return;

    fetchMessages();

    const channel = supabase
      .channel(`chat:${jobId}`)
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
          // Deduplicate if we already added it optimistically
          setMessages((prev) => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, currentUserId, fetchMessages]);

  // Scroll to bottom when messages change, but only if user is already near bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content) return;

    // --- OPTIMISTIC UPDATE ---
    const tempId = crypto.randomUUID();
    const optimisticMsg: Message = {
      id: tempId,
      job_id: jobId,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      isOptimistic: true,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');

    try {
      const { data, error: sendErr } = await supabase
        .from('chat_messages')
        .insert({
          job_id: jobId,
          sender_id: currentUserId,
          content,
        })
        .select()
        .single();

      if (sendErr) throw sendErr;

      // Replace optimistic message with server data
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
    } catch (err: any) {
      // Rollback on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setError('Failed to send message.');
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center text-slate-500">Connecting to secure chat...</div>;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '500px', 
      background: theme.colors.background.card,
      border: `1px solid ${theme.colors.border.light}`,
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden',
      boxShadow: theme.shadows.lg
    }}>
      {/* Header */}
      <div style={{ 
        padding: theme.spacing[4], 
        background: theme.colors.background.subtle,
        borderBottom: `1px solid ${theme.colors.border.light}`,
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing[3]
      }}>
        <div style={{ 
          width: 32, height: 32, borderRadius: '50%', 
          background: theme.colors.background.card, 
          display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }}>
          <User size={18} className="text-emerald-500" />
        </div>
        <div>
          <h3 style={{ fontSize: theme.fontSizes.base, fontWeight: theme.fontWeights.bold, color: theme.colors.text.primary, margin: 0 }}>
            {otherUserName}
          </h3>
          <span style={{ fontSize: '10px', color: theme.colors.status.healthy }}>● Online</span>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={containerRef}
        style={{ flex: 1, overflowY: 'auto', padding: theme.spacing[4], display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}
      >
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                opacity: msg.isOptimistic ? 0.7 : 1,
                transition: 'opacity 0.2s'
              }}
            >
              <div style={{
                padding: '10px 14px',
                borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                background: isMe ? theme.colors.primary : theme.colors.background.subtle,
                color: isMe ? theme.colors.text.inverse : theme.colors.text.primary,
                fontSize: theme.fontSizes.sm,
                boxShadow: theme.shadows.sm,
              }}>
                {msg.content}
              </div>
              <div style={{ 
                fontSize: '10px', 
                color: theme.colors.text.muted, 
                marginTop: 4, 
                textAlign: isMe ? 'right' : 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isMe ? 'flex-end' : 'flex-start',
                gap: 4
              }}>
                <Clock size={10} />
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} style={{ 
        padding: theme.spacing[3], 
        background: theme.colors.background.subtle, 
        display: 'flex', 
        gap: theme.spacing[2],
        borderTop: `1px solid ${theme.colors.border.light}`
      }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          style={{
            flex: 1,
            background: theme.colors.background.card,
            border: `1px solid ${theme.colors.border.medium}`,
            borderRadius: theme.borderRadius.lg,
            padding: '10px 16px',
            color: theme.colors.text.primary,
            fontSize: theme.fontSizes.sm,
            outline: 'none',
          }}
        />
        <button 
          type="submit" 
          disabled={!newMessage.trim()}
          style={{
            width: 42,
            height: 42,
            background: theme.colors.primary,
            border: 'none',
            borderRadius: theme.borderRadius.lg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.1s',
          }}
        >
          <Send size={18} color={theme.colors.text.inverse} />
        </button>
      </form>
    </div>
  );
}