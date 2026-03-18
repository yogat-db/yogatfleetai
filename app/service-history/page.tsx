'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { Calendar, Wrench, MapPin, Search, X } from 'lucide-react'

type ServiceEvent = {
  id: string
  vehicle_id: string
  title: string
  description: string | null
  mileage: number | null
  occurred_at: string
  created_at: string
  vehicle?: {
    id: string
    license_plate: string
    make: string | null
    model: string | null
  }
}

export default function ServiceHistoryPage() {
  const router = useRouter()
  const [events, setEvents] = useState<ServiceEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all')

  useEffect(() => {
    fetchEvents()
  }, [])

  async function fetchEvents() {
    try {
      setLoading(true)
      const vehiclesRes = await fetch('/api/vehicles')
      if (!vehiclesRes.ok) throw new Error('Failed to fetch vehicles')
      const vehicles = await vehiclesRes.json()

      const allEvents = await Promise.all(
        vehicles.map(async (v: any) => {
          try {
            const res = await fetch(`/api/vehicles/${v.id}/service-events`)
            if (!res.ok) return []
            const data = await res.json()
            return Array.isArray(data) ? data.map((e: any) => ({ ...e, vehicle: v })) : []
          } catch {
            return []
          }
        })
      )

      const flatEvents = allEvents.flat().sort(
        (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      )
      setEvents(flatEvents)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Unique vehicles for filter
  const vehicles = useMemo(() => {
    const unique = new Map()
    events.forEach(e => {
      if (e.vehicle && !unique.has(e.vehicle.id)) {
        unique.set(e.vehicle.id, e.vehicle)
      }
    })
    return Array.from(unique.values())
  }, [events])

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.vehicle?.license_plate.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesVehicle = selectedVehicle === 'all' || event.vehicle_id === selectedVehicle
      return matchesSearch && matchesVehicle
    })
  }, [events, searchTerm, selectedVehicle])

  async function deleteEvent(id: string, e: React.MouseEvent) {
    e.stopPropagation() // prevent card click
    if (!confirm('Delete this service event?')) return
    try {
      const res = await fetch(`/api/service-events/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        let errorMsg = 'Delete failed'
        try {
          const errorData = await res.json()
          errorMsg = errorData.error || errorMsg
        } catch {}
        throw new Error(errorMsg)
      }
      fetchEvents()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2>Error loading service history</h2>
        <p>{error}</p>
        <button onClick={fetchEvents} style={styles.retryButton}>Retry</button>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Service History</h1>
        <button onClick={() => router.push('/service-history/add')} style={styles.addButton}>
          + Add Event
        </button>
      </div>

      <div style={styles.filters}>
        <div style={styles.searchWrapper}>
          <Search size={18} color="#64748b" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search events, vehicle, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={styles.clearButton}>
              <X size={16} />
            </button>
          )}
        </div>

        <select
          value={selectedVehicle}
          onChange={(e) => setSelectedVehicle(e.target.value)}
          style={styles.select}
        >
          <option value="all">All Vehicles</option>
          {vehicles.map(v => (
            <option key={v.id} value={v.id}>
              {v.license_plate} – {v.make} {v.model}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={styles.loadingGrid}>
          {[...Array(4)].map((_, i) => <div key={i} style={styles.skeletonCard} />)}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div style={styles.emptyState}>
          <Wrench size={48} color="#334155" />
          <h3>No service events found</h3>
          <p>{events.length === 0 ? 'Add your first service event.' : 'Try adjusting your search.'}</p>
          {events.length === 0 && (
            <button onClick={() => router.push('/service-history/add')} style={styles.emptyButton}>
              Add Service Event
            </button>
          )}
        </div>
      ) : (
        <div style={styles.timeline}>
          <AnimatePresence>
            {filteredEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                style={styles.eventCard}
                onClick={() => router.push(`/vehicles/${event.vehicle?.license_plate}`)}
              >
                <div style={styles.eventHeader}>
                  <div style={styles.vehicleBadge}>
                    <span style={styles.vehiclePlate}>{event.vehicle?.license_plate || 'Unknown'}</span>
                    <span style={styles.vehicleName}>
                      {event.vehicle?.make} {event.vehicle?.model}
                    </span>
                  </div>
                  <div style={styles.eventDate}>
                    <Calendar size={14} />
                    <span>{format(new Date(event.occurred_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                <h3 style={styles.eventTitle}>{event.title}</h3>
                {event.description && (
                  <p style={styles.eventDescription}>{event.description}</p>
                )}

                <div style={styles.eventFooter}>
                  {event.mileage && (
                    <div style={styles.mileage}>
                      <MapPin size={14} />
                      <span>{event.mileage.toLocaleString()} mi</span>
                    </div>
                  )}
                  <div style={styles.actions}>
                    <button
                      onClick={(e) => { e.stopPropagation(); /* edit later */ }}
                      style={styles.actionButton}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => deleteEvent(event.id, e)}
                      style={{ ...styles.actionButton, color: '#ef4444' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'Inter, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 32, fontWeight: 700, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 },
  addButton: { background: '#22c55e', color: '#020617', border: 'none', padding: '10px 20px', borderRadius: 30, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  filters: { display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' },
  searchWrapper: { flex: 1, position: 'relative', minWidth: 250 },
  searchIcon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' },
  searchInput: { width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 30, padding: '10px 16px 10px 40px', color: '#f1f5f9', fontSize: 14, outline: 'none' },
  clearButton: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' },
  select: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 30, padding: '10px 16px', color: '#f1f5f9', fontSize: 14, outline: 'none', cursor: 'pointer', minWidth: 200 },
  timeline: { display: 'flex', flexDirection: 'column', gap: 16 },
  eventCard: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'all 0.2s' },
  eventHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  vehicleBadge: { display: 'flex', alignItems: 'center', gap: 8 },
  vehiclePlate: { background: '#1e293b', padding: '4px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#94a3b8' },
  vehicleName: { fontSize: 13, color: '#64748b' },
  eventDate: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8' },
  eventTitle: { fontSize: 18, fontWeight: 600, marginBottom: 8 },
  eventDescription: { fontSize: 14, color: '#94a3b8', marginBottom: 16, lineHeight: 1.5 },
  eventFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  mileage: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' },
  actions: { display: 'flex', gap: 8 },
  actionButton: { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s' },
  loadingGrid: { display: 'flex', flexDirection: 'column', gap: 16 },
  skeletonCard: { height: 160, background: '#0f172a', borderRadius: 16, border: '1px solid #1e293b', animation: 'pulse 2s infinite' },
  emptyState: { textAlign: 'center', padding: '60px 20px', background: '#0f172a', borderRadius: 16, border: '1px solid #1e293b' },
  emptyButton: { marginTop: 16, background: '#22c55e', color: '#020617', border: 'none', padding: '10px 20px', borderRadius: 30, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  errorContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ef4444' },
  retryButton: { marginTop: 16, padding: '10px 24px', background: '#22c55e', border: 'none', borderRadius: 8, color: '#020617', fontWeight: 'bold', cursor: 'pointer' },
}