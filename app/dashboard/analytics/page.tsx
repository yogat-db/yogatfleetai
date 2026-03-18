'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { supabase } from '@/lib/supabase/client'

interface Vehicle {
  id: string
  license_plate: string
  make: string
  model: string
  year: number
  health_score: number | null
}

interface Job {
  id: string
  title: string
  budget: number | null
  status: string
  created_at: string
  user_id: string
  mechanic_id?: string
}

interface Transaction {
  id: string
  job_id: string
  amount: number
  platform_fee: number
  status: string
  created_at: string
  mechanic_id: string
}

interface Mechanic {
  id: string
  business_name: string | null
}

type TimeRange = '3m' | '6m' | '1y' | 'all'

export default function OwnerAnalyticsPage() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [mechanics, setMechanics] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('6m')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUserId(user.id)

      // Fetch user's vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
      if (vehiclesError) throw vehiclesError
      setVehicles(vehiclesData || [])

      // Fetch all jobs (we'll filter by user_id)
      const jobsRes = await fetch('/api/marketplace/jobs')
      if (!jobsRes.ok) throw new Error('Failed to fetch jobs')
      const jobsData = await jobsRes.json()
      // Filter jobs where user_id matches current user
      const userJobs = jobsData.filter((j: any) => j.user_id === user.id)
      setJobs(userJobs)

      // Fetch all transactions (we'll filter by user_id)
      // We need a transactions API – we'll create a simple one
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
      if (txError) throw txError
      setTransactions(txData || [])

      // Fetch mechanic names for transactions
      const mechanicIds = [...new Set(txData?.map(t => t.mechanic_id).filter(Boolean) || [])]
      if (mechanicIds.length > 0) {
        const { data: mechs, error: mechError } = await supabase
          .from('mechanics')
          .select('id, business_name')
          .in('id', mechanicIds)
        if (!mechError && mechs) {
          const mechMap: Record<string, string> = {}
          mechs.forEach(m => { mechMap[m.id] = m.business_name || 'Unknown' })
          setMechanics(mechMap)
        }
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter data by time range
  const filteredTransactions = useMemo(() => {
    if (timeRange === 'all') return transactions
    const now = new Date()
    const cutoff = new Date()
    if (timeRange === '3m') cutoff.setMonth(now.getMonth() - 3)
    if (timeRange === '6m') cutoff.setMonth(now.getMonth() - 6)
    if (timeRange === '1y') cutoff.setFullYear(now.getFullYear() - 1)
    return transactions.filter(t => new Date(t.created_at) >= cutoff && t.status === 'completed')
  }, [transactions, timeRange])

  // KPI calculations
  const totalSpent = useMemo(() => 
    filteredTransactions.reduce((sum, t) => sum + t.amount / 100, 0), [filteredTransactions]
  )
  const totalVehicles = vehicles.length
  const avgHealth = useMemo(() => {
    const valid = vehicles.filter(v => v.health_score != null)
    return valid.length ? valid.reduce((sum, v) => sum + (v.health_score || 0), 0) / valid.length : 0
  }, [vehicles])
  const completedJobs = jobs.filter(j => j.status === 'completed').length

  // Spending over time (by month)
  const spendingByMonth = useMemo(() => {
    const monthMap: Record<string, number> = {}
    filteredTransactions.forEach(t => {
      const date = new Date(t.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthMap[key] = (monthMap[key] || 0) + t.amount / 100
    })
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }))
  }, [filteredTransactions])

  // Health trend over time (by month, average health of vehicles? Not time-series – maybe not)
  // For health trend, we could use service events or vehicle health snapshots. Without history, we can just show current health.
  // We'll show a pie chart of health distribution instead.
  const healthDistribution = useMemo(() => {
    const healthy = vehicles.filter(v => (v.health_score || 0) >= 70).length
    const warning = vehicles.filter(v => (v.health_score || 0) >= 40 && (v.health_score || 0) < 70).length
    const critical = vehicles.filter(v => (v.health_score || 0) < 40).length
    return [
      { name: 'Healthy', value: healthy, color: '#22c55e' },
      { name: 'Warning', value: warning, color: '#f59e0b' },
      { name: 'Critical', value: critical, color: '#ef4444' },
    ]
  }, [vehicles])

  // Top mechanics by spending
  const topMechanics = useMemo(() => {
    const mechMap: Record<string, { name: string; total: number; count: number }> = {}
    filteredTransactions.forEach(t => {
      const mechId = t.mechanic_id
      if (!mechId) return
      if (!mechMap[mechId]) {
        mechMap[mechId] = {
          name: mechanics[mechId] || 'Unknown',
          total: 0,
          count: 0,
        }
      }
      mechMap[mechId].total += t.amount / 100
      mechMap[mechId].count += 1
    })
    return Object.values(mechMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [filteredTransactions, mechanics])

  // Recent jobs
  const recentJobs = useMemo(() => 
    [...jobs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)
  , [jobs])

  if (loading) return <div style={styles.centered}>Loading analytics...</div>
  if (error) return <div style={styles.centered}>Error: {error}</div>
  if (!currentUserId) return <div style={styles.centered}>Please log in</div>

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <h1 style={styles.title}>Fleet Owner Analytics</h1>

      {/* Time Range Selector */}
      <div style={styles.rangeSelector}>
        <label style={styles.rangeLabel}>Time Range:</label>
        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as TimeRange)} style={styles.select}>
          <option value="3m">Last 3 months</option>
          <option value="6m">Last 6 months</option>
          <option value="1y">Last year</option>
          <option value="all">All time</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Total Spent</span>
          <span style={styles.kpiValue}>${totalSpent.toFixed(2)}</span>
        </div>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Vehicles</span>
          <span style={styles.kpiValue}>{totalVehicles}</span>
        </div>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Avg. Health</span>
          <span style={styles.kpiValue}>{avgHealth.toFixed(1)}%</span>
        </div>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Completed Jobs</span>
          <span style={styles.kpiValue}>{completedJobs}</span>
        </div>
      </div>

      {/* Charts Row */}
      <div style={styles.chartsRow}>
        {/* Spending Over Time */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Spending Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={spendingByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none' }} />
              <Legend />
              <Line type="monotone" dataKey="amount" stroke="#22c55e" name="Amount ($)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Health Distribution (Pie) */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Vehicle Health</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={healthDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, value, payload }) => {
  const total = healthDistribution.reduce((sum, entry) => sum + entry.value, 0);
  const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : '0';
  return `${name} ${percentage}%`;
}}
              >
                {healthDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Mechanics & Recent Jobs */}
      <div style={styles.chartsRow}>
        {/* Top Mechanics */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Top Mechanics by Spending</h3>
          {topMechanics.length === 0 ? (
            <p style={styles.emptyText}>No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topMechanics} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" width={150} />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none' }} />
                <Bar dataKey="total" fill="#22c55e" name="Total Spent ($)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Jobs */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Recent Jobs</h3>
          {recentJobs.length === 0 ? (
            <p style={styles.emptyText}>No recent jobs</p>
          ) : (
            <div style={styles.jobList}>
              {recentJobs.map(job => (
                <div key={job.id} style={styles.jobItem}>
                  <span style={styles.jobTitle}>{job.title}</span>
                  <span style={styles.jobStatus}>{job.status}</span>
                  <span style={styles.jobDate}>{new Date(job.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9' },
  centered: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' },
  title: { fontSize: '32px', fontWeight: 700, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '32px' },
  rangeSelector: { marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' },
  rangeLabel: { fontSize: '14px', color: '#94a3b8' },
  select: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '8px', color: '#f1f5f9' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' },
  kpiCard: { background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #1e293b' },
  kpiLabel: { fontSize: '14px', color: '#94a3b8', display: 'block' },
  kpiValue: { fontSize: '28px', fontWeight: 700, marginTop: '8px' },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' },
  chartCard: { background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #1e293b' },
  chartTitle: { fontSize: '18px', fontWeight: 600, marginBottom: '16px' },
  emptyText: { color: '#64748b', textAlign: 'center', padding: '20px' },
  jobList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  jobItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e293b' },
  jobTitle: { fontSize: '14px', fontWeight: 500 },
  jobStatus: { fontSize: '12px', color: '#22c55e', textTransform: 'capitalize' },
  jobDate: { fontSize: '12px', color: '#64748b' },
}