'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Clock, Wrench } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Vehicle = {
  id: string
  license_plate: string
  make: string | null
  model: string | null
  mileage: number | null
}

type ServiceReminder = {
  vehicleId: string
  plate: string
  vehicleName: string
  task: string
  dueMileage: number
  dueDate?: string
  daysLeft?: number
  milesLeft: number
  overdue: boolean
}

export default function ServiceReminders() {
  const router = useRouter()
  const [reminders, setReminders] = useState<ServiceReminder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReminders()
  }, [])

  const fetchReminders = async () => {
    try {
      // Fetch user's vehicles
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, license_plate, make, model, mileage')
        .order('created_at', { ascending: false })

      if (vehiclesError) throw vehiclesError

      // For each vehicle, get the latest service events for common tasks
      const remindersList: ServiceReminder[] = []

      for (const vehicle of vehicles || []) {
        const { data: events, error: eventsError } = await supabase
          .from('service_events')
          .select('title, mileage, occurred_at')
          .eq('vehicle_id', vehicle.id)
          .order('occurred_at', { ascending: false })

        if (eventsError) continue

        const currentMileage = vehicle.mileage || 0

        // Define intervals (you can expand or make configurable)
        const intervals = [
          { task: 'Oil change', intervalMiles: 5000, intervalMonths: 6 },
          { task: 'Brake inspection', intervalMiles: 20000, intervalMonths: 12 },
          { task: 'Timing belt', intervalMiles: 60000, intervalMonths: 60 },
          { task: 'Coolant flush', intervalMiles: 30000, intervalMonths: 36 },
          { task: 'Tire rotation', intervalMiles: 6000, intervalMonths: 6 },
        ]

        for (const interval of intervals) {
          const lastEvent = events?.find(e => e.title.toLowerCase().includes(interval.task.toLowerCase()))
          const lastMileage = lastEvent?.mileage ?? 0
          const nextMileage = lastMileage + interval.intervalMiles
          const milesLeft = Math.max(0, nextMileage - currentMileage)
          const overdue = milesLeft <= 0

          // Only show reminders that are due soon (within 2000 miles or overdue)
          if (milesLeft <= 2000) {
            remindersList.push({
              vehicleId: vehicle.id,
              plate: vehicle.license_plate,
              vehicleName: `${vehicle.make || ''} ${vehicle.model || ''}`.trim(),
              task: interval.task,
              dueMileage: nextMileage,
              milesLeft,
              overdue,
            })
          }
        }
      }

      // Sort by urgency (overdue first, then by miles left ascending)
      remindersList.sort((a, b) => {
        if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
        return a.milesLeft - b.milesLeft
      })

      setReminders(remindersList)
    } catch (err) {
      console.error('Failed to fetch reminders', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={styles.loading}>Loading reminders...</div>
  if (reminders.length === 0) return null

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Clock size={18} color="#22c55e" />
        <h3 style={styles.title}>Service Reminders</h3>
      </div>
      <div style={styles.list}>
        {reminders.slice(0, 4).map((reminder, idx) => (
          <motion.div
            key={`${reminder.vehicleId}-${reminder.task}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            style={{
              ...styles.item,
              borderLeftColor: reminder.overdue ? '#ef4444' : '#f59e0b',
            }}
            onClick={() => router.push(`/vehicles/${reminder.plate}`)}
          >
            <div>
              <div style={styles.itemTitle}>{reminder.task}</div>
              <div style={styles.itemSub}>
                {reminder.vehicleName} ({reminder.plate})
              </div>
            </div>
            <div style={styles.itemStatus}>
              {reminder.overdue ? (
                <span style={{ color: '#ef4444' }}>Overdue</span>
              ) : (
                <span style={{ color: '#f59e0b' }}>{reminder.milesLeft} mi left</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: '#1e293b',
    borderRadius: '12px',
    borderLeft: '4px solid',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  itemTitle: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  itemSub: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  itemStatus: {
    fontSize: '13px',
    fontWeight: 500,
  },
  loading: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: '20px',
  },
} as const
