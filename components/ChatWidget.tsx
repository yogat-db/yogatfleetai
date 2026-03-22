'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send } from 'lucide-react'
import theme from '@/app/theme'

const MyComponent = () => (
  <div style={{ background: theme.colors.background.main, color: theme.colors.text.primary }}>
    <h1 style={{ background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
      Hello
    </h1>
  </div>
)
type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! How can I help you today?' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = { role: 'user' as const, content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: messages.slice(1).map(m => ({ role: m.role, content: m.content })), // exclude initial greeting
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Chat button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        style={styles.button}
      >
        <MessageCircle size={24} />
      </motion.button>

      {/* Chat modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={styles.modal}
          >
            <div style={styles.header}>
              <h3>AI Support</h3>
              <button onClick={() => setIsOpen(false)} style={styles.closeButton}>
                <X size={18} />
              </button>
            </div>
            <div style={styles.messageList}>
              {messages.map((msg, i) => (
                <div key={i} style={msg.role === 'user' ? styles.userMessage : styles.assistantMessage}>
                  {msg.content}
                </div>
              ))}
              {loading && <div style={styles.assistantMessage}>...</div>}
              <div ref={messagesEndRef} />
            </div>
            <div style={styles.inputArea}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your question..."
                style={styles.input}
              />
              <button onClick={handleSend} disabled={loading} style={styles.sendButton}>
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    zIndex: 1000,
  },
  modal: {
    position: 'fixed',
    bottom: '90px',
    right: '20px',
    width: '350px',
    height: '500px',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid #1e293b',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
  },
  messageList: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  userMessage: {
    alignSelf: 'flex-end',
    background: '#22c55e',
    color: '#020617',
    padding: '8px 12px',
    borderRadius: '12px 12px 0 12px',
    maxWidth: '80%',
    wordBreak: 'break-word',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    background: '#1e293b',
    color: '#f1f5f9',
    padding: '8px 12px',
    borderRadius: '12px 12px 12px 0',
    maxWidth: '80%',
    wordBreak: 'break-word',
  },
  inputArea: {
    padding: '12px',
    borderTop: '1px solid #1e293b',
    display: 'flex',
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
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
