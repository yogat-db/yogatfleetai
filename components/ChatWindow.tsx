'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client'; // Fix: import supabase instead of createClient

interface Message {
  id: string;
  job_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    email?: string;
  };
}

interface ChatWindowProps {
  jobId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
}

export default function ChatWindow({ jobId, currentUserId, otherUserId, otherUserName }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId || !currentUserId || !otherUserId) return;

    fetchMessages();

    // Subscribe to new messages
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
          if (newMsg.sender_id !== currentUserId) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, currentUserId, otherUserId]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, sender:users(email)')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const { error } = await supabase.from('chat_messages').insert({
        job_id: jobId,
        sender_id: currentUserId,
        content: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage('');
      scrollToBottom();
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading) {
    return <div style={styles.loading}>Loading messages...</div>;
  }

  if (error) {
    return <div style={styles.error}>Error: {error}</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3>Chat with {otherUserName}</h3>
      </div>
      <div style={styles.messagesContainer}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              ...styles.message,
              ...(msg.sender_id === currentUserId ? styles.sent : styles.received),
            }}
          >
            <div style={styles.messageContent}>{msg.content}</div>
            <div style={styles.messageTime}>
              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} style={styles.form}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          style={styles.input}
        />
        <button type="submit" style={styles.button}>
          Send
        </button>
      </form>
    </div>
  );
}

// Simple inline styles – you can replace with your theme if desired
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '400px',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    overflow: 'hidden',
    background: '#0f172a',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #1e293b',
    background: '#1e293b',
    color: '#f1f5f9',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  message: {
    maxWidth: '70%',
    padding: '8px 12px',
    borderRadius: '12px',
    fontSize: '14px',
  },
  sent: {
    alignSelf: 'flex-end',
    background: '#22c55e',
    color: '#020617',
  },
  received: {
    alignSelf: 'flex-start',
    background: '#334155',
    color: '#f1f5f9',
  },
  messageContent: {
    wordBreak: 'break-word',
  },
  messageTime: {
    fontSize: '10px',
    marginTop: '4px',
    opacity: 0.7,
  },
  form: {
    display: 'flex',
    padding: '12px',
    borderTop: '1px solid #1e293b',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #334155',
    borderRadius: '8px',
    background: '#1e293b',
    color: '#f1f5f9',
    outline: 'none',
  },
  button: {
    padding: '8px 16px',
    background: '#22c55e',
    border: 'none',
    borderRadius: '8px',
    color: '#020617',
    fontWeight: 600,
    cursor: 'pointer',
  },
  loading: {
    textAlign: 'center',
    padding: '20px',
    color: '#94a3b8',
  },
  error: {
    textAlign: 'center',
    padding: '20px',
    color: '#ef4444',
  },
};