'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import theme from '@/app/theme'

const MyComponent = () => (
  <div style={{ background: theme.colors.background.main, color: theme.colors.text.primary }}>
    <h1 style={{ background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
      Hello
    </h1>
  </div>
)
interface ReviewFormProps {
  mechanicId: string
  jobId: string
  onSubmit: (rating: number, comment: string) => Promise<void>
  onCancel: () => void
}

export default function ReviewForm({ mechanicId, jobId, onSubmit, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    await onSubmit(rating, comment)
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3>Rate this mechanic</h3>
      <div style={styles.stars}>
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            size={32}
            fill={(hover || rating) >= star ? '#f59e0b' : 'none'}
            color="#f59e0b"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(star)}
            style={{ cursor: 'pointer' }}
          />
        ))}
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Leave a comment (optional)"
        rows={4}
        style={styles.textarea}
      />
      <div style={styles.actions}>
        <button type="button" onClick={onCancel} style={styles.cancelButton}>Cancel</button>
        <button type="submit" disabled={submitting || rating === 0} style={styles.submitButton}>
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </form>
  )
}

const styles = {
  form: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 20 },
  stars: { display: 'flex', gap: 4, marginBottom: 16 },
  textarea: { width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 10, color: '#f1f5f9', marginBottom: 16 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 8 },
  cancelButton: { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' },
  submitButton: { background: '#22c55e', color: '#020617', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 },
} as const