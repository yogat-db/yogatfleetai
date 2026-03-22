'use client'
import { supabase } from '@/lib/supabase/client';
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import VehicleCardPremium from '@/components/VehicleCardPremium'
import { computeFleetBrain } from '@/lib/ai'
import type { Vehicle } from '@/app/types/fleet'

type FilterStatus = 'all' | 'healthy' | 'warning' | 'critical'

export default function VehiclesPage() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  useEffect(() => {
    fetchVehicles()
  }, [])

  async function fetchVehicles() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/vehicles')
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch vehicles')
      }
      const data = await res.json()
      // Ensure data is an array (API should return array)
      setVehicles(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Enhance vehicles with AI health scores
  const vehiclesWithAI = useMemo(() => computeFleetBrain(vehicles), [vehicles])

  // Filter and search
  const filteredVehicles = useMemo(() => {
    return vehiclesWithAI.filter((vehicle) => {
      const matchesSearch =
        vehicle.license_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase())

      const score = vehicle.health_score ?? 100
      let matchesStatus = true
      if (filterStatus === 'healthy') matchesStatus = score >= 70
      else if (filterStatus === 'warning') matchesStatus = score >= 40 && score < 70
      else if (filterStatus === 'critical') matchesStatus = score < 40

      return matchesSearch && matchesStatus
    })
  }, [vehiclesWithAI, searchTerm, filterStatus])

  const stats = {
    total: vehicles.length,
    healthy: vehiclesWithAI.filter(v => (v.health_score ?? 100) >= 70).length,
    warning: vehiclesWithAI.filter(v => {
      const s = v.health_score ?? 100
      return s >= 40 && s < 70
    }).length,
    critical: vehiclesWithAI.filter(v => (v.health_score ?? 100) < 40).length,
  }

  const getStatusColor = (status: FilterStatus) => {
    switch (status) {
      case 'healthy': return '#22c55e'
      case 'warning': return '#f59e0b'
      case 'critical': return '#ef4444'
      default: return '#94a3b8'
    }
  }

  async function deleteVehicle(id: string) {
  if (!id) {
    console.error('Cannot delete vehicle: ID is undefined');
    alert('Error: Vehicle ID is missing');
    return;
  }

  // Get the current logged‑in user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('User not authenticated:', userError);
    alert('You must be logged in to delete a vehicle.');
    return;
  }

  if (!confirm('Are you sure you want to delete this vehicle? This action cannot be undone.')) return;

  try {
    const res = await fetch(`/api/vehicles/${id}`, {
      method: 'DELETE',
      headers: {
        'X-User-Id': user.id,   // 👈 Required by the API
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Delete failed');
    // Remove from local state
    setVehicles(prev => prev.filter(v => v.id !== id));
  } catch (err: any) {
    alert(err.message);
  }
}

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2>Error loading vehicles</h2>
        <p>{error}</p>
        <button onClick={fetchVehicles} style={styles.retryButton}>Retry</button>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Fleet Management</h1>
        <button onClick={() => router.push('/vehicles/add')} style={styles.addButton}>
          + Add Vehicle
        </button>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total</span>
          <span style={styles.statValue}>{stats.total}</span>
        </div>
        <div style={{ ...styles.statCard, borderBottomColor: '#22c55e' }}>
          <span style={styles.statLabel}>Healthy</span>
          <span style={{ ...styles.statValue, color: '#22c55e' }}>{stats.healthy}</span>
        </div>
        <div style={{ ...styles.statCard, borderBottomColor: '#f59e0b' }}>
          <span style={styles.statLabel}>Warning</span>
          <span style={{ ...styles.statValue, color: '#f59e0b' }}>{stats.warning}</span>
        </div>
        <div style={{ ...styles.statCard, borderBottomColor: '#ef4444' }}>
          <span style={styles.statLabel}>Critical</span>
          <span style={{ ...styles.statValue, color: '#ef4444' }}>{stats.critical}</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div style={styles.controls}>
        <input
          type="text"
          placeholder="Search by plate, make, model..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <div style={styles.filterButtons}>
          {(['all', 'healthy', 'warning', 'critical'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                ...styles.filterButton,
                background: filterStatus === status ? `${getStatusColor(status)}20` : 'transparent',
                color: filterStatus === status ? getStatusColor(status) : '#94a3b8',
                borderColor: filterStatus === status ? getStatusColor(status) : '#334155',
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle Grid */}
      {loading ? (
        <div style={styles.loadingGrid}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={styles.skeletonCard} />
          ))}
        </div>
      ) : filteredVehicles.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.emptyState}>
          <p>No vehicles found</p>
          {vehicles.length === 0 ? (
            <button onClick={() => router.push('/vehicles/add')} style={styles.addButton}>
              Add your first vehicle
            </button>
          ) : (
            <p>Try adjusting your search or filter</p>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.05 }}
          style={styles.grid}
        >
          <AnimatePresence>
            {filteredVehicles.map((vehicle) => (
              <motion.div
                key={vehicle.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <VehicleCardPremium
                  vehicle={vehicle}
                  onClick={() => router.push(`/vehicles/${vehicle.license_plate}`)}
                  onEdit={() => router.push(`/vehicles/edit/${vehicle.id}`)}
                  onDelete={() => deleteVehicle(vehicle.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'Inter, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 32, fontWeight: 700, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 },
  addButton: { background: '#22c55e', color: '#020617', border: 'none', padding: '12px 24px', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 30 },
  statCard: { background: '#0f172a', padding: 20, borderRadius: 16, border: '1px solid #1e293b', borderBottom: '3px solid transparent' },
  statLabel: { fontSize: 14, textTransform: 'uppercase', opacity: 0.7 },
  statValue: { fontSize: 28, fontWeight: 700, display: 'block', marginTop: 8 },
  controls: { display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 30 },
  searchInput: { width: '100%', padding: '12px 16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, color: '#f1f5f9', fontSize: 16, outline: 'none' },
  filterButtons: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  filterButton: { padding: '8px 16px', borderRadius: 30, border: '1px solid', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 },
  loadingGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 },
  skeletonCard: { height: 350, background: '#0f172a', borderRadius: 16, border: '1px solid #1e293b', animation: 'pulse 2s infinite' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#64748b' },
  errorContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ef4444' },
  retryButton: { marginTop: 16, padding: '10px 24px', background: '#22c55e', border: 'none', borderRadius: 8, color: '#020617', fontWeight: 'bold', cursor: 'pointer' },
}