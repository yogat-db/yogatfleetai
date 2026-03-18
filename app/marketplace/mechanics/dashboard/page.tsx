'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import type { Mechanic, Job, Application } from '@/app/types/marketplace'

export default function MechanicDashboardPage() {
  const router = useRouter()
  const [mechanic, setMechanic] = useState<Mechanic | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMechanicData()
  }, [])

  async function fetchMechanicData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get mechanic profile
      const { data: mech, error: mechError } = await supabase
        .from('mechanics')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (mechError || !mech) {
        router.push('/marketplace/mechanics/register')
        return
      }
      setMechanic(mech)

      // Fetch applications with job details
      const { data: apps, error: appsError } = await supabase
        .from('applications')
        .select(`
          *,
          job:jobs (*)
        `)
        .eq('mechanic_id', mech.id)
        .order('created_at', { ascending: false })

      if (!appsError) setApplications(apps || [])

      // Fetch open jobs (limit 10)
      const { data: openJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(10)

      if (!jobsError) setJobs(openJobs || [])

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setLoadingPortal(true)
    try {
      const res = await fetch('/api/stripe/create-portal-session', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url // redirect to Stripe portal
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoadingPortal(false)
    }
  }

  const handleSubscribe = () => {
    router.push('/marketplace/mechanics/subscribe')
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={fetchMechanicData} style={styles.retryButton}>Retry</button>
      </div>
    )
  }

  if (!mechanic) return null

  const pendingApplications = applications.filter(a => a.status === 'pending')
  const acceptedApplications = applications.filter(a => a.status === 'accepted')
  const completedApplications = applications.filter(a => a.status === 'completed')

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <h1 style={styles.title}>Mechanic Dashboard</h1>

      {/* Subscription Status */}
<div style={styles.subscriptionCard}>
  <div>
    <h3 style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>{mechanic.business_name}</span>
        {mechanic.verified && (
          <span style={styles.verifiedBadge}>✓ Verified</span>
        )}
      </div>
    </h3>
    <p>
      <strong>Status:</strong>{' '}
      <span style={{
        color: mechanic.subscription_status === 'active' ? '#22c55e' : '#ef4444',
        fontWeight: 600,
      }}>
        {mechanic.subscription_status === 'active' ? 'Active' : 'Inactive'}
      </span>
    </p>
  </div>
  {mechanic.subscription_status !== 'active' && (
    <button onClick={() => router.push('/marketplace/mechanics/subscribe')} style={styles.subscribeButton}>
      Subscribe Now
    </button>
  )}
</div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total Applications</span>
          <span style={styles.statValue}>{applications.length}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Pending</span>
          <span style={styles.statValue}>{pendingApplications.length}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Accepted</span>
          <span style={styles.statValue}>{acceptedApplications.length}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Completed</span>
          <span style={styles.statValue}>{completedApplications.length}</span>
        </div>
      </div>

      {/* Recent Applications */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Recent Applications</h2>
        {applications.length === 0 ? (
          <p style={styles.emptyText}>You haven't applied to any jobs yet.</p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Bid</th>
                  <th>Status</th>
                  <th>Applied</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.slice(0, 5).map(app => (
                  <tr key={app.id}>
                    <td>{app.job?.title || 'Unknown'}</td>
                    <td>£{app.bid_amount}</td>
                    <td>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: 
                          app.status === 'accepted' ? '#22c55e20' :
                          app.status === 'pending' ? '#f59e0b20' : '#64748b20',
                        color:
                          app.status === 'accepted' ? '#22c55e' :
                          app.status === 'pending' ? '#f59e0b' : '#64748b',
                      }}>
                        {app.status}
                      </span>
                    </td>
                    <td>{new Date(app.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => router.push(`/marketplace/jobs/${app.job_id}`)}
                        style={styles.viewButton}
                      >
                        View Job
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Open Jobs Near You */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Open Jobs Near You</h2>
        {jobs.length === 0 ? (
          <p style={styles.emptyText}>No open jobs available.</p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Budget</th>
                  <th>Location</th>
                  <th>Posted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.slice(0, 5).map(job => (
                  <tr key={job.id}>
                    <td>{job.title}</td>
                    <td>£{job.budget}</td>
                    <td>{job.location || 'Any'}</td>
                    <td>{new Date(job.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => router.push(`/marketplace/jobs/${job.id}`)}
                        style={styles.viewButton}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '40px',
    background: '#020617',
    minHeight: '100vh',
    color: '#f1f5f9',
    fontFamily: 'Inter, sans-serif',
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '24px',
  },
  subscriptionCard: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  subscriptionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: '4px',
  },
  subscriptionStatus: {
    fontSize: '14px',
    color: '#f1f5f9',
  },
  portalButton: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  subscribeButton: {
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    background: '#0f172a',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #1e293b',
  },
  statLabel: {
    fontSize: '14px',
    color: '#64748b',
    display: 'block',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    marginTop: '4px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: '16px',
  },
  tableWrapper: {
    background: '#0f172a',
    borderRadius: '12px',
    border: '1px solid #1e293b',
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  viewButton: {
    background: 'transparent',
    border: '1px solid #334155',
    color: '#94a3b8',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    padding: '40px',
  },
  retryButton: {
    marginTop: '16px',
    padding: '8px 16px',
    background: '#22c55e',
    border: 'none',
    borderRadius: '4px',
    color: '#020617',
    cursor: 'pointer',
  },
}