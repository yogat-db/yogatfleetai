'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Clock } from 'lucide-react'
import theme from '@/app/theme'

const MyComponent = () => (
  <div style={{ background: theme.colors.background.main, color: theme.colors.text.primary }}>
    <h1 style={{ background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
      Hello
    </h1>
  </div>
)
interface Action {
  id: string
  type: 'job_application' | 'mechanic_verification' | 'payment_dispute'
  title: string
  description: string
  createdAt: string
  onApprove?: () => void
  onReject?: () => void
}

interface ActionQueueProps {
  actions: Action[]
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
}

export default function ActionQueue({ actions, onApprove, onReject }: ActionQueueProps) {
  const [localActions, setLocalActions] = useState<Action[]>(actions)

  useEffect(() => {
    setLocalActions(actions)
  }, [actions])

  const handleApprove = (action: Action) => {
    if (onApprove) {
      onApprove(action.id)
    } else if (action.onApprove) {
      action.onApprove()
    }
    setLocalActions(prev => prev.filter(a => a.id !== action.id))
  }

  const handleReject = (action: Action) => {
    if (onReject) {
      onReject(action.id)
    } else if (action.onReject) {
      action.onReject()
    }
    setLocalActions(prev => prev.filter(a => a.id !== action.id))
  }

  if (localActions.length === 0) {
    return (
      <div style={styles.empty}>
        <Clock size={24} color="#64748b" />
        <p>No pending actions</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {localActions.map((action, index) => (
        <motion.div
          key={action.id}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          style={styles.card}
        >
          <div style={styles.content}>
            <h4 style={styles.title}>{action.title}</h4>
            <p style={styles.description}>{action.description}</p>
            <span style={styles.time}>{new Date(action.createdAt).toLocaleString()}</span>
          </div>
          <div style={styles.actions}>
            <button
              onClick={() => handleApprove(action)}
              style={styles.approveButton}
              title="Approve"
            >
              <Check size={18} />
            </button>
            <button
              onClick={() => handleReject(action)}
              style={styles.rejectButton}
              title="Reject"
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#64748b',
  },
  card: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '16px',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '4px',
    color: '#f1f5f9',
  },
  description: {
    fontSize: '14px',
    color: '#94a3b8',
    marginBottom: '4px',
  },
  time: {
    fontSize: '12px',
    color: '#64748b',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  approveButton: {
    background: 'transparent',
    border: '1px solid #22c55e',
    color: '#22c55e',
    padding: '6px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  rejectButton: {
    background: 'transparent',
    border: '1px solid #ef4444',
    color: '#ef4444',
    padding: '6px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
}