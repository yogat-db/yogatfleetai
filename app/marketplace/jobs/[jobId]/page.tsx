'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import PaymentForm from '@/components/PaymentForm'
import type { Job, Application } from '@/app/types/marketplace'

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.jobId as string

  const [job, setJob] = useState<Job | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isMechanic, setIsMechanic] = useState(false)
  const [mechanicId, setMechanicId] = useState<string | null>(null)
  const [selectedMechanic, setSelectedMechanic] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [jobId])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      if (user) {
        const { data: mechanic } = await supabase
          .from('mechanics')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (mechanic) {
          setIsMechanic(true)
          setMechanicId(mechanic.id)
        }
      }

      const jobRes = await fetch(`/api/marketplace/jobs/${jobId}`)
      if (!jobRes.ok) {
        const errorText = await jobRes.text()
        try {
          const errorJson = JSON.parse(errorText)
          throw new Error(errorJson.error || 'Job not found')
        } catch {
          throw new Error(errorText || 'Job not found')
        }
      }
      const jobData = await jobRes.json()
      setJob(jobData)

      if (user && jobData.user_id === user.id) {
        const appsRes = await fetch(`/api/marketplace/jobs/${jobId}/applications`)
        if (appsRes.ok) {
          const appsData = await appsRes.json()
          setApplications(Array.isArray(appsData) ? appsData : [])
        } else {
          setApplications([])
        }
      }
    } catch (err: any) {
      console.error('Error fetching job:', err)
      setError(err.message || 'Failed to load job')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading job details...</p>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div style={styles.centered}>
        <h2>Error</h2>
        <p>{error || 'Job not found'}</p>
        <button onClick={() => router.push('/marketplace/jobs')} style={styles.retryButton}>
          Back to Jobs
        </button>
      </div>
    )
  }

  const isOwner = currentUser ? currentUser.id === job.user_id : false
  const isAssignedMechanic = !!(mechanicId && job.assigned_mechanic_id && String(job.assigned_mechanic_id) === String(mechanicId))
  const budgetNumber = typeof job.budget === 'number' ? job.budget : Number(job.budget) || 0

  const handleApply = () => {
    if (!isMechanic) {
      alert('You must be a registered mechanic to apply.')
      router.push('/marketplace/mechanics/register')
      return
    }
    router.push(`/marketplace/jobs/${jobId}/apply`)
  }

  const handleSelectMechanic = (mechanicId: string) => {
    setSelectedMechanic(mechanicId)
  }

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true)
    fetchData()
  }

  const handleMarkCompleted = async () => {
  if (!confirm('Mark this job as completed?')) return
  setCompleting(true)
  try {
    const res = await fetch(`/api/marketplace/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to update job')

    // After job is marked completed, create an earnings record
    if (job?.budget && mechanicId) {
      await fetch('/api/earnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mechanicId,
          jobId,
          amount: Math.round(job.budget * 100), // store in pence
        }),
      })
    }

    fetchData()
  } catch (err: any) {
    alert(err.message)
  } finally {
    setCompleting(false)
  }
}

  const handleDeleteJob = async () => {
    if (!confirm('Delete this job? This action cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/marketplace/jobs/${jobId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      router.push('/marketplace/jobs')
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>← Back</button>

      <div style={styles.header}>
        <h1 style={styles.title}>{job.title}</h1>
        {isOwner && (
          <div style={styles.ownerActions}>
            <button
              onClick={() => router.push(`/marketplace/jobs/edit/${job.id}`)}
              style={styles.editButton}
              disabled={deleting}
            >
              ✏️ Edit
            </button>
            <button
              onClick={handleDeleteJob}
              style={styles.deleteButton}
              disabled={deleting}
            >
              {deleting ? '...' : '🗑️ Delete'}
            </button>
          </div>
        )}
      </div>

      <div style={styles.grid}>
        {/* Left Column: Job Details */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Job Details</h3>
          <p><strong>Description:</strong> {job.description || 'No description.'}</p>
          <p><strong>Budget:</strong> <span style={styles.currency}>£{budgetNumber.toFixed(2)}</span></p>
          <p><strong>Location:</strong> {job.location || 'Not specified'}</p>
          <p><strong>Status:</strong> <span style={statusBadge(job.status)}>{job.status}</span></p>
          {job.vehicle && (
            <p><strong>Vehicle:</strong> {job.vehicle.make} {job.vehicle.model} – {job.vehicle.license_plate}</p>
          )}
        </div>

        {/* Right Column: Applications / Actions */}
        <div style={styles.card}>
          {isOwner ? (
            <>
              <h3 style={styles.cardTitle}>Applications ({applications.length})</h3>
              {applications.length === 0 ? (
                <p style={styles.emptyText}>No applications yet.</p>
              ) : (
                <div style={styles.applicationsList}>
                  {applications.map((app) => (
                    <div key={app.id} style={styles.applicationCard}>
                      <div style={styles.applicationHeader}>
                        <strong>{app.mechanic?.business_name}</strong>
                        <span style={styles.bidAmount}>£{app.bid_amount}</span>
                      </div>
                      <p>{app.message}</p>
                      <button
                        onClick={() => handleSelectMechanic(app.mechanic_id)}
                        style={styles.selectButton}
                        disabled={!!selectedMechanic}
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <AnimatePresence>
                {selectedMechanic && job.status === 'open' && budgetNumber > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={styles.paymentSection}
                  >
                    <h3 style={styles.cardTitle}>Complete Payment</h3>
                    <PaymentForm
                      amount={Math.round(budgetNumber * 100)} // pounds → pence
                      currency="gbp"
                      jobId={job.id}
                      mechanicId={selectedMechanic}
                      onSuccess={handlePaymentSuccess}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {paymentSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={styles.successMessage}
                >
                  ✓ Payment successful! The mechanic has been notified.
                </motion.div>
              )}
            </>
          ) : isMechanic ? (
            <div style={styles.mechanicActions}>
              {isAssignedMechanic && job.status === 'assigned' ? (
                <button
                  onClick={handleMarkCompleted}
                  disabled={completing}
                  style={styles.completeButton}
                >
                  {completing ? 'Completing...' : '✓ Mark as Completed'}
                </button>
              ) : (
                <>
                  <h3 style={styles.cardTitle}>Apply to this Job</h3>
                  <p>If you're interested, click below.</p>
                  <button onClick={handleApply} style={styles.applyButton}>
                    Apply Now
                  </button>
                </>
              )}
            </div>
          ) : (
            <div style={styles.infoMessage}>
              <p>You need to be a registered mechanic to apply for this job.</p>
              <button
                onClick={() => router.push('/marketplace/mechanics/register')}
                style={styles.registerButton}
              >
                Become a Mechanic
              </button>
            </div>
          )}
        </div>
      </div>

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

const statusBadge = (status: string) => ({
  display: 'inline-block',
  padding: '4px 12px',
  borderRadius: '20px',
  fontSize: '14px',
  fontWeight: 500,
  backgroundColor: status === 'open' ? '#22c55e20' : status === 'assigned' ? '#3b82f620' : status === 'completed' ? '#64748b20' : '#ef444420',
  color: status === 'open' ? '#22c55e' : status === 'assigned' ? '#3b82f6' : status === 'completed' ? '#64748b' : '#ef4444',
  textTransform: 'capitalize',
})

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'Inter, sans-serif' },
  centered: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' },
  backButton: { background: 'transparent', border: '1px solid #334155', color: '#f1f5f9', padding: '8px 16px', borderRadius: 8, marginBottom: 24, cursor: 'pointer' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 32, fontWeight: 700, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 },
  ownerActions: { display: 'flex', gap: 12 },
  editButton: { background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  deleteButton: { background: '#ef4444', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
  card: { background: '#0f172a', padding: 24, borderRadius: 16, border: '1px solid #1e293b' },
  cardTitle: { fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#94a3b8' },
  currency: { color: '#22c55e', fontWeight: 600 },
  applicationsList: { display: 'flex', flexDirection: 'column', gap: 16 },
  applicationCard: { background: '#1e293b', padding: 16, borderRadius: 12 },
  applicationHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 },
  bidAmount: { background: '#0f172a', padding: '4px 8px', borderRadius: 6, color: '#22c55e', fontWeight: 600 },
  selectButton: { background: 'transparent', border: '1px solid #22c55e', color: '#22c55e', padding: '6px 12px', borderRadius: 6, width: '100%', cursor: 'pointer' },
  emptyText: { color: '#64748b', textAlign: 'center', padding: 20 },
  paymentSection: { marginTop: 16, borderTop: '1px solid #334155', paddingTop: 16 },
  successMessage: { marginTop: 16, padding: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: 8, color: '#22c55e', textAlign: 'center' },
  mechanicActions: { textAlign: 'center' },
  applyButton: { background: '#22c55e', color: '#020617', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  completeButton: { background: '#22c55e', color: '#020617', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer', width: '100%' },
  infoMessage: { textAlign: 'center', color: '#94a3b8', padding: 20 },
  registerButton: { background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, marginTop: 12, cursor: 'pointer' },
  retryButton: { marginTop: 16, padding: '8px 16px', background: '#22c55e', border: 'none', borderRadius: 4, color: '#020617', cursor: 'pointer' },
}