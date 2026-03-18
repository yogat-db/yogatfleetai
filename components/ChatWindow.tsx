'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Check, CheckCheck } from 'lucide-react'
import { useJobMessages } from '@/hooks/useJobMessages'

interface ChatWindowProps {
  jobId: string
  currentUserId: string
  otherUserId: string
  otherUserName: string
}

export default function ChatWindow({
  jobId,
  currentUserId,
  otherUserId,
  otherUserName,
}: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages, loading, sendMessage, markAsRead } = useJobMessages(
    jobId,
    currentUserId,
    otherUserId
  )

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mark unread messages as read
  useEffect(() => {
    const unreadIds = messages
      .filter(m => m.receiver_id === currentUserId && !m.read_at)
      .map(m => m.id)
    if (unreadIds.length > 0) {
      markAsRead(unreadIds)
    }
  }, [messages, currentUserId])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    sendMessage(newMessage)
    setNewMessage('')
  }

  if (loading) {
    return <div style={styles.loading}>Loading messages...</div>
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3>Chat with {otherUserName}</h3>
      </div>

      <div style={styles.messageList}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  ...styles.messageRow,
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    ...styles.messageBubble,
                    background: isMe ? '#22c55e' : '#1e293b',
                    color: isMe ? '#020617' : '#f1f5f9',
                  }}
                >
                  <p style={styles.messageText}>{msg.content}</p>
                  <div style={styles.messageMeta}>
                    <span style={styles.messageTime}>
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isMe && (
                      <span style={styles.readReceipt}>
                        {msg.read_at ? (
                          <CheckCheck size={14} color="#64748b" />
                        ) : (
                          <Check size={14} color="#64748b" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} style={styles.inputForm}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          style={styles.input}
        />
        <button type="submit" style={styles.sendButton} disabled={!newMessage.trim()}>
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '500px',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #1e293b',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  messageRow: {
    display: 'flex',
    width: '100%',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: '8px 12px',
    borderRadius: '12px',
    wordBreak: 'break-word',
  },
  messageText: {
    margin: 0,
    fontSize: '14px',
    lineHeight: 1.4,
  },
  messageMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '4px',
    marginTop: '4px',
  },
  messageTime: {
    fontSize: '10px',
    opacity: 0.7,
  },
  readReceipt: {
    display: 'flex',
    alignItems: 'center',
  },
  inputForm: {
    display: 'flex',
    padding: '12px',
    borderTop: '1px solid #1e293b',
    gap: '8px',
  },
  input: {
    flex: 1,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '20px',
    padding: '8px 12px',
    color: '#f1f5f9',
    fontSize: '14px',
  },
  sendButton: {
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  loading: {
    padding: '20px',
    textAlign: 'center',
    color: '#94a3b8',
  },
}