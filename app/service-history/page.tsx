'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { Plus, History, Car, ChevronRight, Clock } from 'lucide-react'
import theme from '@/app/theme'

type ServiceEvent = {
  id: string
  vehicle_id: string
  title: string
  description: string | null
  mileage: number | null
  occurred_at: string
  // Relational join from Supabase
  vehicles: {
    license_plate: string
    make: string | null
    model: string | null
  } | null
}

export default function ServiceHistoryPage() {
  const router = useRouter()
  const [events, setEvents] = useState<ServiceEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      /** * UPGRADE: Relational Join
       * Instead of looping, we fetch events and "join" the vehicle data 
       * in one go. We filter by user_id through the vehicle relation.
       */
      const { data, error: sbError } = await supabase
        .from('service_events')
        .select(`
          *,
          vehicles!inner (
            license_plate,
            make,
            model,
            user_id
          )
        `)
        .eq('vehicles.user_id', user.id)
        .order('occurred_at', { ascending: false })

      if (sbError) throw sbError
      setEvents(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  if (loading) return (
    <div style={styles.centered}>
      <Clock className="spin" size={32} color={theme.colors.primary} />
      <p style={{ marginTop: 12 }}>Retrieving fleet records...</p>
      <style>{`.spin { animation: spin 2s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Service History</h1>
          <p style={styles.subtitle}>Maintenance logs and repair tracking for your fleet</p>
        </div>
        <button onClick={() => router.push('/service-history/add')} style={styles.addButton}>
          <Plus size={18} /> Add Record
        </button>
      </div>

      {events.length === 0 ? (
        <div style={styles.emptyState}>
          <History size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
          <h3>No records found</h3>
          <p>You haven't logged any maintenance for your vehicles yet.</p>
          <button onClick={() => router.push('/service-history/add')} style={styles.emptyButton}>
            Log First Service
          </button>
        </div>
      ) : (
        <div style={styles.timeline}>
          {events.map((event) => (
            <motion.div
              key={event.id}
              whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.03)' }}
              style={styles.eventCard}
              onClick={() => router.push(`/service-history/${event.id}`)}
            >
              <div style={styles.eventSidebar}>
                <div style={styles.dateDot} />
                <div style={styles.dateLine} />
              </div>

              <div style={styles.eventContent}>
                <div style={styles.eventHeader}>
                  <div style={styles.vehicleInfo}>
                    <span style={styles.vehiclePlate}>{event.vehicles?.license_plate}</span>
                    <span style={styles.vehicleName}>
                      {event.vehicles?.make} {event.vehicles?.model}
                    </span>
                  </div>
                  <span style={styles.eventDate}>
                    {format(new Date(event.occurred_at), 'MMM d, yyyy')}
                  </span>
                </div>

                <h3 style={styles.eventTitle}>{event.title}</h3>
                {event.description && <p style={styles.eventDescription}>{event.description}</p>}
                
                <div style={styles.metaRow}>
                   {event.mileage && (
                    <span style={styles.eventMileage}>
                      <History size={12} /> {event.mileage.toLocaleString()} mi
                    </span>
                   )}
                   <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: 0.3 }} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: theme.spacing[10],
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: theme.colors.text.primary,
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 900,
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  subtitle: {
    color: theme.colors.text.muted,
    fontSize: 14,
    margin: '4px 0 0 0'
  },
  addButton: {
    background: theme.colors.primary,
    color: '#000',
    border: 'none',
    padding: '10px 20px',
    borderRadius: theme.borderRadius.lg,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  centered: {
    height: '80vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors.text.muted,
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
  },
  eventCard: {
    display: 'flex',
    gap: 20,
    cursor: 'pointer',
    padding: '0 0 32px 0',
  },
  eventSidebar: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '20px',
  },
  dateDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: theme.colors.primary,
    border: `3px solid ${theme.colors.background.main}`,
    zIndex: 2,
  },
  dateLine: {
    flex: 1,
    width: '2px',
    background: theme.colors.border.light,
    marginTop: -4,
  },
  eventContent: {
    flex: 1,
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.xl,
    padding: 24,
    marginTop: -8,
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  vehicleInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  vehiclePlate: {
    background: '#facc15',
    color: '#000',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 800,
  },
  vehicleName: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontWeight: 500,
  },
  eventDate: {
    fontSize: 12,
    color: theme.colors.text.muted,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 700,
    margin: '0 0 8px 0',
  },
  eventDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 1.5,
    margin: '0 0 16px 0',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    paddingTop: 16,
    borderTop: `1px solid ${theme.colors.border.light}`,
  },
  eventMileage: {
    fontSize: 12,
    color: theme.colors.text.muted,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 40px',
    background: theme.colors.background.card,
    borderRadius: 24,
    border: `1px dashed ${theme.colors.border.light}`,
  },
}