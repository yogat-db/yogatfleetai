'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { computeFleetBrain } from '@/lib/ai'
import type { Vehicle } from '@/app/types/fleet'

// Lazy load map (client‑side only)
const FleetMap = dynamic(() => import('@/components/maps/FleetMap'), {
  ssr: false,
  loading: () => (
    <div style={styles.mapPlaceholder}>
      <div className="spinner" />
    </div>
  ),
})

export default function DashboardPage() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
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

  // Enhance vehicles with AI health scores
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

  // Vehicles with valid coordinates for map
  const mapVehicles = vehicles.filter(v => v.lat && v.lng)

  const criticalCount = stats.critical
  const hasCritical = criticalCount > 0

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2>Error loading dashboard</h2>
        <p>{error}</p>
        <button onClick={loadDashboard} style={styles.retryButton}>Retry</button>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Fleet Operations Dashboard</h1>
        <div style={styles.statusBadge}>
          <span style={styles.pulse} />
          Live
        </div>
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <KPI label="Total Fleet" value={stats.total} color="#60a5fa" />
        <KPI label="Healthy" value={stats.healthy} color="#22c55e" />
        <KPI label="Warning" value={stats.warning} color="#f59e0b" />
        <KPI label="Critical" value={stats.critical} color="#ef4444" />
      </div>

      {/* AI Insights Banner (when critical vehicles exist) */}
      {hasCritical && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.insightsBanner}
        >
          <span>⚠️ {criticalCount} vehicle{criticalCount > 1 ? 's' : ''} require immediate attention</span>
          <button onClick={() => router.push('/vehicles?status=critical')} style={styles.insightsButton}>
            View Critical
          </button>
        </motion.div>
      )}

      {/* Main Layout */}
      <div style={styles.mainLayout}>
        {/* Map Section */}
        <div style={styles.mapCard}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Fleet Geospatial View</h2>
            <span style={styles.liveDot}>● LIVE</span>
          </div>
          <div style={styles.mapWrapper}>
            {loading ? (
              <div style={styles.loadingBox}>
                <div className="spinner" />
                <p>Loading map data...</p>
              </div>
            ) : mapVehicles.length === 0 ? (
              <div style={styles.noLocation}>
                <p>No location data available</p>
                <p style={styles.noLocationSub}>Vehicles need coordinates to appear on map</p>
              </div>
            ) : (
              <FleetMap vehicles={mapVehicles} />
            )}
          </div>
        </div>

        {/* Recent Vehicles & Actions */}
        <div style={styles.listCard}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Recent Vehicles</h2>
            <button onClick={() => router.push('/vehicles')} style={styles.viewAllButton}>
              View All →
            </button>
          </div>
          <div style={styles.listScroll}>
            {loading ? (
              <div style={styles.loadingBox}>Loading vehicles...</div>
            ) : vehicles.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No vehicles added yet.</p>
                <button onClick={() => router.push('/vehicles/add')} style={styles.addButton}>
                  + Add your first vehicle
                </button>
              </div>
            ) : (
              vehicles.slice(0, 5).map((v) => {
                const ai = vehiclesWithAI.find(ai => ai.id === v.id)
                return (
                  <motion.div
                    key={v.id}
                    whileHover={{ scale: 1.02, backgroundColor: '#1e293b' }}
                    style={styles.vehicleRow}
                    onClick={() => router.push(`/vehicles/${v.license_plate}`)}
                  >
                    <div style={styles.vehicleInfo}>
                      <div style={styles.plate}>{v.license_plate}</div>
                      <div style={styles.model}>{v.make} {v.model}</div>
                    </div>
                    <div style={healthBadge(ai?.health_score)}>
                      {ai?.health_score ?? 'N/A'}%
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>

          {/* Quick Actions */}
          <div style={styles.quickActions}>
            <button onClick={() => router.push('/vehicles/add')} style={styles.actionButton}>
              ➕ Add Vehicle
            </button>
            <button onClick={() => router.push('/diagnostics')} style={styles.actionButton}>
              🔍 Run Diagnostics
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
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </motion.div>
  )
}

// KPI Card Component
function KPI({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: `0 10px 20px -5px ${color}40` }}
      style={{ ...styles.kpiCard, borderBottom: `3px solid ${color}` }}
    >
      <div style={styles.kpiLabel}>{label}</div>
      <div style={{ ...styles.kpiValue, color }}>{value}</div>
    </motion.div>
  )
}

// Health badge styling
function healthBadge(score?: number) {
  let color = '#22c55e'
  if (score !== undefined) {
    if (score < 40) color = '#ef4444'
    else if (score < 70) color = '#f59e0b'
  }
  return {
    background: `${color}20`,
    color,
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 'bold',
  }
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 32, fontWeight: 700, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 },
  statusBadge: { display: 'flex', alignItems: 'center', gap: 8, background: '#1e293b', padding: '6px 16px', borderRadius: 30, color: '#22c55e', border: '1px solid #22c55e40' },
  pulse: { width: 10, height: 10, background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 30 },
  kpiCard: { background: '#0f172a', padding: 24, borderRadius: 16, border: '1px solid #1e293b', transition: 'all 0.2s' },
  kpiLabel: { fontSize: 14, textTransform: 'uppercase', opacity: 0.7 },
  kpiValue: { fontSize: 36, fontWeight: 700, marginTop: 8 },
  insightsBanner: {
    marginBottom: 24,
    padding: '12px 20px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid #ef4444',
    borderRadius: 12,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#ef4444',
  },
  insightsButton: {
    background: '#ef4444',
    color: '#020617',
    border: 'none',
    padding: '6px 16px',
    borderRadius: 20,
    fontWeight: 600,
    cursor: 'pointer',
  },
  mainLayout: { display: 'grid', gridTemplateColumns: '2.5fr 1.2fr', gap: 24 },
  mapCard: { background: '#0f172a', padding: 20, borderRadius: 24, border: '1px solid #1e293b' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: 600, color: '#94a3b8' },
  liveDot: { color: '#ef4444', fontSize: 12, fontWeight: 'bold', animation: 'pulse 2s infinite' },
  mapWrapper: { height: 450, borderRadius: 16, overflow: 'hidden', background: '#1e293b' },
  mapPlaceholder: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b', borderRadius: 16 },
  loadingBox: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: '#94a3b8' },
  noLocation: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
    textAlign: 'center',
    padding: 20,
  },
  noLocationSub: { fontSize: 14, marginTop: 8, opacity: 0.7 },
  listCard: { background: '#0f172a', padding: 20, borderRadius: 24, border: '1px solid #1e293b', display: 'flex', flexDirection: 'column' },
  listScroll: { overflowY: 'auto', flex: 1, marginTop: 10, maxHeight: 400 },
  vehicleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottom: '1px solid #1e293b',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  vehicleInfo: { flex: 1 },
  plate: { fontWeight: 600, fontSize: 16 },
  model: { fontSize: 13, opacity: 0.6, marginTop: 4 },
  emptyState: { textAlign: 'center', padding: '40px 20px', color: '#64748b' },
  addButton: { background: '#22c55e', color: '#020617', border: 'none', padding: '10px 20px', borderRadius: 8, marginTop: 16, cursor: 'pointer', fontWeight: 600 },
  viewAllButton: { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer' },
  quickActions: { display: 'flex', gap: 8, marginTop: 16, borderTop: '1px solid #1e293b', paddingTop: 16 },
  actionButton: { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '8px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer', flex: 1, textAlign: 'center' },
  errorContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ef4444' },
  retryButton: { marginTop: 16, padding: '10px 24px', background: '#22c55e', border: 'none', borderRadius: 8, color: '#020617', fontWeight: 'bold', cursor: 'pointer' },
}