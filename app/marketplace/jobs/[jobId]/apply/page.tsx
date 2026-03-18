'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'

export default function ApplyToJobPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.jobId as string

  const [job, setJob] = useState<any>(null)
  const [mechanicId, setMechanicId] = useState<string | null>(null)
  const [bidAmount, setBidAmount] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchData()
  }, [jobId])

  async function fetchData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get mechanic profile
      const { data: mechanic, error: mechError } = await supabase
        .from('mechanics')
        .select('id, subscription_status')
        .eq('user_id', user.id)
        .single()

      if (mechError || !mechanic) {
        router.push('/marketplace/mechanics/register')
        return
      }

      if (mechanic.subscription_status !== 'active') {
        alert('You need an active subscription to apply for jobs.')
        router.push('/marketplace/mechanics/subscribe')
        return
      }
      setMechanicId(mechanic.id)

      // Fetch job details
      const jobRes = await fetch(`/api/marketplace/jobs/${jobId}`)
      if (!jobRes.ok) throw new Error('Job not found')
      const jobData = await jobRes.json()
      setJob(jobData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const amount = parseInt(bidAmount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid bid amount')
      }

      const res = await fetch('/api/marketplace/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          mechanicId,
          bidAmount: amount,
          message,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Application failed')

      setSuccess(true)
      setTimeout(() => {
        router.push(`/marketplace/jobs/${jobId}`)
        router.refresh()
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div style={styles.centered}>
        <h2>Error</h2>
        <p>{error || 'Job not found'}</p>
        <button onClick={() => router.back()} style={styles.retryButton}>Go Back</button>
      </div>
    )
  }

  const budgetNumber = typeof job.budget === 'number' ? job.budget : Number(job.budget) || 0

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>← Back</button>

      <h1 style={styles.title}>Apply to Job</h1>
      <div style={styles.jobSummary}>
        <h3>{job.title}</h3>
        <p><strong>Budget:</strong> £{budgetNumber.toFixed(2)}</p>
        <p><strong>Location:</strong> {job.location}</p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Your Bid (£) *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder="e.g. 150"
            style={styles.input}
            required
            disabled={submitting}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Message to Job Owner</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Introduce yourself and explain why you're a good fit..."
            rows={4}
            style={{ ...styles.input, resize: 'vertical' }}
            disabled={submitting}
          />
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>✓ Application submitted! Redirecting...</div>}

        <button type="submit" disabled={submitting || success} style={styles.submitButton}>
          {submitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>

      <style jsx>{`
        .spinner {
          border: 3px solid rgba(255,255,255,0.1);
          border-top: 3px solid #22c55e;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'Inter, sans-serif' },
  centered: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' },
  backButton: { background: 'transparent', border: '1px solid #334155', color: '#f1f5f9', padding: '8px 16px', borderRadius: 8, marginBottom: 24, cursor: 'pointer' },
  title: { fontSize: 32, fontWeight: 700, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 24 },
  jobSummary: { background: '#0f172a', padding: 20, borderRadius: 12, border: '1px solid #1e293b', marginBottom: 24 },
  form: { maxWidth: 600 },
  field: { marginBottom: 20 },
  label: { display: 'block', fontSize: 14, fontWeight: 500, color: '#94a3b8', marginBottom: 6 },
  input: { width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 16px', color: '#f1f5f9', fontSize: 16 },
  errorBox: { marginTop: 16, padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, color: '#ef4444' },
  successBox: { marginTop: 16, padding: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: 8, color: '#22c55e' },
  submitButton: { width: '100%', background: '#22c55e', color: '#020617', border: 'none', padding: '14px', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  retryButton: { marginTop: 16, padding: '8px 16px', background: '#22c55e', border: 'none', borderRadius: 4, color: '#020617', cursor: 'pointer' },
}