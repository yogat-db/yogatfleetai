'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'

// Types based on your database schema (update if needed)
type Mechanic = {
  id: string
  user_id: string
  business_name: string
  phone: string | null
  verified: boolean
  subscription_status: string
  stripe_account_id: string | null
  created_at: string
}

type Application = {
  id: string
  job_id: string
  mechanic_id: string
  bid_amount: number
  status: 'pending' | 'accepted' | 'rejected' | 'completed'
  created_at: string
  job?: {
    title: string
    budget: number | null
  }
}

type Job = {
  id: string
  title: string
  budget: number | null
  location: string | null
  status: string
  created_at: string
}

type EarningsRecord = {
  amount: number
  created_at: string
}

export default function MechanicDashboardPage() {
  const router = useRouter()
  const [mechanic, setMechanic] = useState<Mechanic | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [openJobs, setOpenJobs] = useState<Job[]>([])
  const [earnings, setEarnings] = useState<EarningsRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingPortal, setLoadingPortal] = useState(false)

  // Separate loading states for sections
  const [loadingApps, setLoadingApps] = useState(true)
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [loadingEarnings, setLoadingEarnings] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 1. Auth check
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      // 2. Get mechanic profile
      const { data: mech, error: mechError } = await supabase
        .from('mechanics')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (mechError || !mech) {
        // No profile, redirect to registration
        router.push('/marketplace/mechanics/register')
        return
      }
      setMechanic(mech)

      // 3. Fetch applications (with job details)
      setLoadingApps(true)
      const { data: apps, error: appsError } = await supabase
        .from('applications')
        .select(`
          *,
          job:jobs(title, budget)
        `)
        .eq('mechanic_id', mech.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!appsError) setApplications(apps || [])
      setLoadingApps(false)

      // 4. Fetch open jobs
      setLoadingJobs(true)
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(10)

      if (!jobsError) setOpenJobs(jobs || [])
      setLoadingJobs(false)

      // 5. Fetch earnings (if earnings table exists)
      setLoadingEarnings(true)
      const { data: earningsData, error: earningsError } = await supabase
        .from('earnings')
        .select('amount, created_at')
        .eq('mechanic_id', mech.id)
        .order('created_at', { ascending: true })
        .limit(90) // last 90 days

      if (!earningsError && earningsData) {
        setEarnings(earningsData)
      } else {
        // If no earnings table yet, use empty array (will show empty state)
        setEarnings([])
      }
      setLoadingEarnings(false)

    } catch (err: any) {
      console.error('Dashboard error:', err)
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleManageBilling = async () => {
    setLoadingPortal(true)
    try {
      const res = await fetch('/api/stripe/create-portal-session', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoadingPortal(false)
    }
  }

  const handleSubscribe = () => {
    router.push('/marketplace/mechanics/subscribe')
  }

  const stats = useMemo(() => ({
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    completed: applications.filter(a => a.status === 'completed').length,
    totalEarned: earnings.reduce((sum, e) => sum + e.amount, 0),
  }), [applications, earnings])

  // Prepare chart data (last 7 days)
  const last7Days = useMemo(() => {
    if (!earnings.length) return []
    const now = new Date()
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(now.getDate() - i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayEarnings = earnings
        .filter(e => format(new Date(e.created_at), 'yyyy-MM-dd') === dateStr)
        .reduce((sum, e) => sum + e.amount, 0)
      days.push({ date: format(date, 'MMM dd'), amount: dayEarnings })
    }
    return days
  }, [earnings])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <h2>Error Loading Dashboard</h2>
        <p>{error}</p>
        <button onClick={fetchData} style={styles.retryButton}>Retry</button>
      </div>
    )
  }

  if (!mechanic) return null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <h1 style={styles.title}>Mechanic Dashboard</h1>

      {/* Subscription & Business Card */}
      <div style={styles.subscriptionCard}>
        <div>
          <div style={styles.businessHeader}>
            <h2 style={styles.businessName}>{mechanic.business_name}</h2>
            {mechanic.verified && <span style={styles.verifiedBadge}>✓ Verified</span>}
          </div>
          <p style={styles.subscriptionStatus}>
            <strong>Subscription:</strong>{' '}
            <span style={{
              color: mechanic.subscription_status === 'active' ? '#22c55e' : '#ef4444',
              fontWeight: 600,
            }}>
              {mechanic.subscription_status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </p>
        </div>
        {mechanic.subscription_status === 'active' ? (
          <button onClick={handleManageBilling} disabled={loadingPortal} style={styles.portalButton}>
            {loadingPortal ? 'Loading...' : 'Manage Billing'}
          </button>
        ) : (
          <button onClick={handleSubscribe} style={styles.subscribeButton}>
            Subscribe Now
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total Applications</span>
          <span style={styles.statValue}>{stats.total}</span>
        </div>
        <div style={{ ...styles.statCard, borderTopColor: '#f59e0b' }}>
          <span style={styles.statLabel}>Pending</span>
          <span style={{ ...styles.statValue, color: '#f59e0b' }}>{stats.pending}</span>
        </div>
        <div style={{ ...styles.statCard, borderTopColor: '#22c55e' }}>
          <span style={styles.statLabel}>Accepted</span>
          <span style={{ ...styles.statValue, color: '#22c55e' }}>{stats.accepted}</span>
        </div>
        <div style={{ ...styles.statCard, borderTopColor: '#64748b' }}>
          <span style={styles.statLabel}>Completed</span>
          <span style={{ ...styles.statValue, color: '#64748b' }}>{stats.completed}</span>
        </div>
      </div>

      {/* Earnings Chart */}
      <div style={styles.earningsCard}>
        <h3 style={styles.earningsTitle}>Earnings (last 7 days)</h3>
        <p style={styles.totalEarned}>Total: £{stats.totalEarned.toFixed(2)}</p>
        {loadingEarnings ? (
          <div style={styles.loadingChart}>Loading earnings data...</div>
        ) : earnings.length === 0 ? (
          <p style={styles.emptyText}>No earnings records yet.</p>
        ) : (
          <div style={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none' }} />
                <Line type="monotone" dataKey="amount" stroke="#22c55e" name="Earnings (£)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent Applications */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Recent Applications</h2>
        {loadingApps ? (
          <TableSkeleton rows={3} />
        ) : applications.length === 0 ? (
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

      {/* Open Jobs Near You */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Open Jobs Near You</h2>
        {loadingJobs ? (
          <TableSkeleton rows={3} />
        ) : openJobs.length === 0 ? (
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
                </thead>
              <tbody>
                {openJobs.map(job => (
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
                        Apply
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

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div style={styles.centered}>
      <div className="spinner" />
      <p>Loading dashboard...</p>
    </div>
  )
}

function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th colSpan={5}>Loading...</th>
          </tr>
        </thead>
        <tbody>
          {Array(rows).fill(0).map((_, i) => (
            <tr key={i}>
              <td colSpan={5} style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{ height: '20px', background: '#1e293b', borderRadius: '4px', width: '80%', margin: '0 auto' }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'Inter, sans-serif' },
  centered: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' },
  title: { fontSize: 32, fontWeight: 700, marginBottom: 24, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  subscriptionCard: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 24, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
  businessHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  businessName: { fontSize: 20, fontWeight: 700, margin: 0 },
  verifiedBadge: { background: '#22c55e20', color: '#22c55e', padding: '4px 10px', borderRadius: 30, fontSize: 12, fontWeight: 600 },
  subscriptionStatus: { fontSize: 14, color: '#94a3b8', margin: 0 },
  portalButton: { background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
  subscribeButton: { background: '#22c55e', color: '#020617', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 },
  statCard: { background: '#0f172a', padding: 20, borderRadius: 12, border: '1px solid #1e293b', borderTop: '3px solid transparent' },
  statLabel: { fontSize: 14, color: '#64748b', display: 'block' },
  statValue: { fontSize: 28, fontWeight: 700, marginTop: 4 },
  earningsCard: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 20, marginBottom: 24 },
  earningsTitle: { fontSize: 18, fontWeight: 600, color: '#94a3b8', marginBottom: 8 },
  totalEarned: { fontSize: 24, fontWeight: 700, color: '#22c55e', marginBottom: 16 },
  chartContainer: { height: 200, width: '100%' },
  loadingChart: { height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: 600, color: '#94a3b8', marginBottom: 16 },
  tableWrapper: { background: '#0f172a', borderRadius: 12, border: '1px solid #1e293b', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  statusBadge: { padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500, textTransform: 'capitalize', display: 'inline-block' },
  viewButton: { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '4px 8px', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  emptyText: { color: '#64748b', textAlign: 'center', padding: 40 },
  retryButton: { marginTop: 16, padding: '8px 16px', background: '#22c55e', border: 'none', borderRadius: 4, color: '#020617', cursor: 'pointer' },
}

