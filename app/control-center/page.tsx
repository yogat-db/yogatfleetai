'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  PieChart, Pie, Cell,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'
import { AlertTriangle, Wrench, Clock, DollarSign, Activity, Calendar, Gauge } from 'lucide-react'
import { computeFleetBrain } from '@/lib/ai'
import type { Vehicle } from '@/app/types/fleet'

// Mock historical health data (replace with real data later)
const mockHealthHistory = [
  { month: 'Jan', avgHealth: 78 },
  { month: 'Feb', avgHealth: 75 },
  { month: 'Mar', avgHealth: 72 },
  { month: 'Apr', avgHealth: 70 },
  { month: 'May', avgHealth: 68 },
  { month: 'Jun', avgHealth: 65 },
]

export default function ControlCenterPage() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchVehicles()
  }, [])

  async function fetchVehicles() {
    try {
      setLoading(true)
      const res = await fetch('/api/vehicles')
      if (!res.ok) throw new Error('Failed to fetch vehicles')
      const data = await res.json()
      setVehicles(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const vehiclesWithAI = useMemo(() => computeFleetBrain(vehicles), [vehicles])

  const stats = {
    total: vehicles.length,
    healthy: vehiclesWithAI.filter(v => (v.health_score ?? 100) >= 70).length,
    warning: vehiclesWithAI.filter(v => {
      const s = v.health_score ?? 100
      return s >= 40 && s < 70
    }).length,
    critical: vehiclesWithAI.filter(v => (v.health_score ?? 100) < 40).length,
  }

  // Vehicles with predicted failure (risk high or medium)
  const predictedFailures = vehiclesWithAI
    .filter(v => v.risk !== 'low' && v.predictedFailureDate)
    .sort((a, b) => (a.daysToFailure ?? 999) - (b.daysToFailure ?? 999))

  // Critical alerts (health < 40)
  const criticalAlerts = vehiclesWithAI
    .filter(v => (v.health_score ?? 100) < 40)
    .slice(0, 5)

  // Compute average mileage, average age
  const avgMileage = vehicles.length
    ? Math.round(vehicles.reduce((acc, v) => acc + (v.mileage || 0), 0) / vehicles.length)
    : 0
  const avgAge = vehicles.length
    ? Math.round(vehicles.reduce((acc, v) => {
        const age = v.year ? new Date().getFullYear() - v.year : 5
        return acc + age
      }, 0) / vehicles.length)
    : 0

  // Data for health distribution pie chart
  const healthData = [
    { name: 'Healthy', value: stats.healthy, color: '#22c55e' },
    { name: 'Warning', value: stats.warning, color: '#f59e0b' },
    { name: 'Critical', value: stats.critical, color: '#ef4444' },
  ].filter(item => item.value > 0)

  // Mock upcoming maintenance (based on intervals)
  const upcomingMaintenance = vehiclesWithAI.slice(0, 5).map(v => ({
    id: v.id,
    plate: v.license_plate,
    task: 'Oil Change',
    dueMileage: (v.mileage || 0) + 5000,
    currentMileage: v.mileage || 0,
    daysLeft: 30,
    health: v.health_score,
  }))

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2>Error loading control center</h2>
        <p>{error}</p>
        <button onClick={fetchVehicles} style={styles.retryButton}>Retry</button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.page}
    >
      <h1 style={styles.title}>Control Center</h1>

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <Gauge size={20} color="#60a5fa" />
          <div>
            <span style={styles.kpiLabel}>Total Fleet</span>
            <span style={styles.kpiValue}>{stats.total}</span>
          </div>
        </div>
        <div style={styles.kpiCard}>
          <Activity size={20} color="#22c55e" />
          <div>
            <span style={styles.kpiLabel}>Healthy</span>
            <span style={{ ...styles.kpiValue, color: '#22c55e' }}>{stats.healthy}</span>
          </div>
        </div>
        <div style={styles.kpiCard}>
          <AlertTriangle size={20} color="#f59e0b" />
          <div>
            <span style={styles.kpiLabel}>Warning</span>
            <span style={{ ...styles.kpiValue, color: '#f59e0b' }}>{stats.warning}</span>
          </div>
        </div>
        <div style={styles.kpiCard}>
          <AlertTriangle size={20} color="#ef4444" />
          <div>
            <span style={styles.kpiLabel}>Critical</span>
            <span style={{ ...styles.kpiValue, color: '#ef4444' }}>{stats.critical}</span>
          </div>
        </div>
        <div style={styles.kpiCard}>
          <Clock size={20} color="#94a3b8" />
          <div>
            <span style={styles.kpiLabel}>Avg Mileage</span>
            <span style={styles.kpiValue}>{avgMileage.toLocaleString()}</span>
          </div>
        </div>
        <div style={styles.kpiCard}>
          <Calendar size={20} color="#94a3b8" />
          <div>
            <span style={styles.kpiLabel}>Avg Age</span>
            <span style={styles.kpiValue}>{avgAge} yrs</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={styles.chartsRow}>
        {/* Health Distribution Pie Chart */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Health Distribution</h3>
          {stats.total === 0 ? (
            <p style={styles.emptyChart}>No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={healthData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `£{name} £{(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {healthData.map((entry, index) => (
                    <Cell key={`cell-£{index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Health Trend Line Chart */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Fleet Health Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mockHealthHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
              <Line type="monotone" dataKey="avgHealth" stroke="#22c55e" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={styles.mainGrid}>
        {/* AI Predictions */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>AI Predictions</h2>
            <Activity size={18} color="#94a3b8" />
          </div>
          {loading ? (
            <div style={styles.loadingBox}>Loading predictions...</div>
          ) : predictedFailures.length === 0 ? (
            <div style={styles.emptyBox}>No predicted failures – all vehicles are healthy.</div>
          ) : (
            <div style={styles.list}>
              {predictedFailures.slice(0, 5).map(v => (
                <motion.div
                  key={v.id}
                  whileHover={{ scale: 1.02, backgroundColor: '#1e293b' }}
                  style={styles.listItem}
                  onClick={() => router.push(`/vehicles/£{v.license_plate}`)}
                >
                  <div style={styles.listItemMain}>
                    <span style={styles.vehiclePlate}>{v.license_plate}</span>
                    <span style={{
                      ...styles.riskBadge,
                      backgroundColor: v.risk === 'high' ? '#ef444420' : '#f59e0b20',
                      color: v.risk === 'high' ? '#ef4444' : '#f59e0b',
                    }}>
                      {v.risk}
                    </span>
                  </div>
                  <div style={styles.listItemDetails}>
                    <span style={styles.detailItem}>
                      <Clock size={12} />
                      {v.daysToFailure} days
                    </span>
                    <span style={styles.detailItem}>
                      <DollarSign size={12} />
                      £{v.estimatedRepairCost?.toLocaleString() ?? 'N/A'}
                    </span>
                  </div>
                </motion.div>
              ))}
              {predictedFailures.length > 5 && (
                <button
                  onClick={() => router.push('/vehicles?status=warning')}
                  style={styles.viewAllButton}
                >
                  View all {predictedFailures.length} predictions
                </button>
              )}
            </div>
          )}
        </div>

        {/* Critical Alerts */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Critical Alerts</h2>
            <AlertTriangle size={18} color="#ef4444" />
          </div>
          {loading ? (
            <div style={styles.loadingBox}>Loading alerts...</div>
          ) : criticalAlerts.length === 0 ? (
            <div style={styles.emptyBox}>No critical alerts – all vehicles are stable.</div>
          ) : (
            <div style={styles.list}>
              {criticalAlerts.map(v => (
                <motion.div
                  key={v.id}
                  whileHover={{ scale: 1.02, backgroundColor: '#1e293b' }}
                  style={styles.alertItem}
                  onClick={() => router.push(`/vehicles/£{v.license_plate}`)}
                >
                  <div>
                    <span style={styles.vehiclePlate}>{v.license_plate}</span>
                    <span style={styles.healthScore}>Health: {v.health_score}%</span>
                  </div>
                  <AlertTriangle size={16} color="#ef4444" />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Maintenance */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Upcoming Maintenance</h2>
            <Wrench size={18} color="#94a3b8" />
          </div>
          {loading ? (
            <div style={styles.loadingBox}>Loading...</div>
          ) : upcomingMaintenance.length === 0 ? (
            <div style={styles.emptyBox}>No maintenance scheduled.</div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Task</th>
                    <th>Due Mileage</th>
                    <th>Health</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingMaintenance.map(item => (
                    <tr key={item.id}>
                      <td>{item.plate}</td>
                      <td>{item.task}</td>
                      <td>{item.dueMileage.toLocaleString()}</td>
                      <td>
                        <span style={{
                          ...styles.healthBadge,
                          backgroundColor: item.health && item.health >= 70 ? '#22c55e20' : item.health && item.health >= 40 ? '#f59e0b20' : '#ef444420',
                          color: item.health && item.health >= 70 ? '#22c55e' : item.health && item.health >= 40 ? '#f59e0b' : '#ef4444',
                        }}>
                          {item.health}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Quick Actions</h2>
          </div>
          <div style={styles.actionsGrid}>
            <button onClick={() => router.push('/diagnostics')} style={styles.quickAction}>
              <Wrench size={20} />
              Run Diagnostics
            </button>
            <button onClick={() => router.push('/service-history/add')} style={styles.quickAction}>
              <Clock size={20} />
              Log Service
            </button>
            <button onClick={() => router.push('/vehicles/add')} style={styles.quickAction}>
              <span style={{ fontSize: 20 }}>➕</span>
              Add Vehicle
            </button>
            <button onClick={() => router.push('/marketplace/jobs')} style={styles.quickAction}>
              <span style={{ fontSize: 20 }}>🛠️</span>
              Find Mechanic
            </button>
          </div>
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

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '40px',
    background: '#020617',
    minHeight: '100vh',
    color: '#f1f5f9',
    fontFamily: 'Inter, sans-serif',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '24px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  kpiCard: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  kpiLabel: {
    fontSize: '12px',
    color: '#64748b',
    display: 'block',
  },
  kpiValue: {
    fontSize: '24px',
    fontWeight: 700,
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '24px',
  },
  chartCard: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '16px',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: '12px',
  },
  emptyChart: {
    textAlign: 'center',
    color: '#64748b',
    padding: '40px',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
  },
  card: {
    background: '#0f172a',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #1e293b',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#94a3b8',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  listItem: {
    padding: '12px',
    background: '#1e293b',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  listItemMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  vehiclePlate: {
    fontWeight: 600,
    fontSize: '16px',
  },
  riskBadge: {
    padding: '4px 8px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  listItemDetails: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#94a3b8',
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  alertItem: {
    padding: '12px',
    background: '#1e293b',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #ef444420',
  },
  healthScore: {
    fontSize: '13px',
    color: '#ef4444',
    marginLeft: '8px',
  },
  tableWrapper: {
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  healthBadge: {
    padding: '2px 6px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
  },
  viewAllButton: {
    marginTop: '12px',
    background: 'transparent',
    border: '1px solid #334155',
    color: '#94a3b8',
    padding: '8px',
    borderRadius: '8px',
    width: '100%',
    cursor: 'pointer',
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  quickAction: {
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#f1f5f9',
    padding: '12px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  loadingBox: {
    textAlign: 'center',
    color: '#64748b',
    padding: '20px',
  },
  emptyBox: {
    textAlign: 'center',
    color: '#64748b',
    padding: '20px',
  },
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ef4444',
  },
  retryButton: {
    marginTop: '16px',
    padding: '10px 24px',
    background: '#22c55e',
    border: 'none',
    borderRadius: '8px',
    color: '#020617',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
}