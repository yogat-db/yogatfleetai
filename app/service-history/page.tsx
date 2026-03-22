'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase/client'

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

  useEffect(() => {
    fetchEvents()
  }, [])

  async function fetchEvents() {
    try {
      setLoading(true)
      // First get all vehicles for the current user
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, license_plate, make, model')

      if (vehiclesError) throw vehiclesError

      // Then fetch service events for each vehicle
      const allEvents = await Promise.all(
        (vehicles || []).map(async (vehicle) => {
          const { data, error } = await supabase
            .from('service_events')
            .select('*')
            .eq('vehicle_id', vehicle.id)
            .order('occurred_at', { ascending: false })

          if (error) {
            console.error('Error fetching events for vehicle', vehicle.id, error)
            return []
          }
          return (data || []).map((event) => ({
            ...event,
            vehicle,
          }))
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

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading service history...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <p style={{ color: '#ef4444' }}>Error: {error}</p>
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

      {events.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No service events recorded yet.</p>
          <button onClick={() => router.push('/service-history/add')} style={styles.emptyButton}>
            Add your first event
          </button>
        </div>
      ) : (
        <div style={styles.timeline}>
          {events.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={styles.eventCard}
              onClick={() => router.push(`/service-history/${event.id}`)}
            >
              <div style={styles.eventHeader}>
                <div>
                  <span style={styles.vehiclePlate}>{event.vehicle?.license_plate}</span>
                  <span style={styles.vehicleName}>
                    {event.vehicle?.make} {event.vehicle?.model}
                  </span>
                </div>
                <span style={styles.eventDate}>
                  {format(new Date(event.occurred_at), 'MMM d, yyyy')}
                </span>
              </div>
              <h3 style={styles.eventTitle}>{event.title}</h3>
              {event.description && <p style={styles.eventDescription}>{event.description}</p>}
              {event.mileage && <p style={styles.eventMileage}>Mileage: {event.mileage.toLocaleString()} mi</p>}
            </motion.div>
          ))}
        </div>
      )}

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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  addButton: {
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 30,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: '#0f172a',
    borderRadius: 16,
    border: '1px solid #1e293b',
  },
  emptyButton: {
    marginTop: 16,
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 30,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  eventCard: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 16,
    padding: 20,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehiclePlate: {
    background: '#1e293b',
    padding: '4px 10px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    color: '#94a3b8',
    marginRight: 8,
  },
  vehicleName: {
    fontSize: 13,
    color: '#64748b',
  },
  eventDate: {
    fontSize: 13,
    color: '#94a3b8',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  eventMileage: {
    fontSize: 13,
    color: '#64748b',
  },
  retryButton: {
    marginTop: 16,
    padding: '8px 16px',
    background: '#22c55e',
    border: 'none',
    borderRadius: 4,
    color: '#020617',
    cursor: 'pointer',
  },
}
