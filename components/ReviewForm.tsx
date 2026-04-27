'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, MessageSquare, Loader2 } from 'lucide-react'
import theme from '@/app/theme'

interface ReviewFormProps {
  mechanicId: string
  jobId: string
  onSubmit: (rating: number, comment: string) => Promise<void>
  onCancel: () => void
}

export default function ReviewForm({ onSubmit, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) return
    
    setSubmitting(true)
    try {
      await onSubmit(rating, comment.trim())
    } catch (error) {
      console.error('Review submission failed:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
    >
      <form onSubmit={handleSubmit} className="p-6">
        <header className="mb-6 flex items-center gap-3">
          <div className="rounded-full bg-amber-500/10 p-2">
            <Star size={20} className="text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-100">Rate your Mechanic</h3>
        </header>

        {/* --- Star Rating Section --- */}
        <div className="mb-8 flex flex-col items-center justify-center gap-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(star)}
                aria-label={`Rate ${star} stars`}
                className="transition-transform active:scale-90"
              >
                <Star
                  size={40}
                  className={`transition-colors duration-200 ${
                    (hover || rating) >= star 
                      ? "fill-amber-500 text-amber-500" 
                      : "text-slate-700 hover:text-slate-500"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="h-5 text-sm font-medium text-slate-400">
            {hover || rating ? (
              <span className="text-amber-400">
                {['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][(hover || rating) - 1]}
              </span>
            ) : "Select a rating"}
          </p>
        </div>

        {/* --- Comment Section --- */}
        <div className="relative mb-6">
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            Your Experience
          </label>
          <div className="relative">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was the service? (optional)"
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <MessageSquare size={16} className="absolute bottom-3 right-3 text-slate-600" />
          </div>
        </div>

        {/* --- Actions --- */}
        <div className="flex items-center justify-end gap-4 border-t border-slate-800 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:text-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || rating === 0}
            className={`
              flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all
              ${submitting || rating === 0 
                ? "cursor-not-allowed bg-slate-800 text-slate-500" 
                : "bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95"}
            `}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </button>
        </div>
      </form>
    </motion.div>
  )
}