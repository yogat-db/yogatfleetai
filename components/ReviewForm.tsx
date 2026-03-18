'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface ReviewFormProps {
  jobId: string
  toUserId: string
  toMechanicId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function ReviewForm({ jobId, toUserId, toMechanicId, onSuccess, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          rating,
          comment,
          to_user_id: toUserId,
          to_mechanic_id: toMechanicId,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit review')

      onSuccess?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={styles.container}
    >
      <h3 style={styles.title}>Leave a Review</h3>
      <form onSubmit={handleSubmit}>
        {/* Star Rating */}
        <div style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              style={{
                ...styles.star,
                color: star <= (hoverRating || rating) ? '#fbbf24' : '#4b5563',
              }}
            >
              ★
            </button>
          ))}
        </div>

        {/* Comment */}
        <textarea
          placeholder="Share your experience (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          style={styles.textarea}
        />

        {error && <div style={styles.error}>{error}</div>}

        {/* Buttons */}
        <div style={styles.buttonRow}>
          {onCancel && (
            <button type="button" onClick={onCancel} style={styles.cancelButton}>
              Cancel
            </button>
          )}
          <button type="submit" disabled={loading} style={styles.submitButton}>
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#0f172a',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #1e293b',
    marginBottom: '24px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '16px',
    color: '#f1f5f9',
  },
  ratingContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  star: {
    fontSize: '28px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'color 0.2s',
    padding: '0 2px',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '14px',
    marginBottom: '16px',
    resize: 'vertical',
  },
  error: {
    color: '#ef4444',
    fontSize: '14px',
    marginBottom: '16px',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  cancelButton: {
    background: 'transparent',
    border: '1px solid #334155',
    color: '#f1f5f9',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  submitButton: {
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
  },
}