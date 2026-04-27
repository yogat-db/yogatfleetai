'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, AlertTriangle, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

// --- Types & Constants ---

interface ServiceReminder {
  vehicleId: string
  plate: string
  vehicleName: string
  task: string
  milesLeft: number
  daysLeft: number
  overdue: boolean
  priority: number // 0: Overdue, 1: Urgent, 2: Soon
}

const MAINTENANCE_INTERVALS = [
  { task: 'Oil change', miles: 5000, months: 6 },
  { task: 'Brake inspection', miles: 20000, months: 12 },
  { task: 'Timing belt', miles: 60000, months: 60 },
  { task: 'Coolant flush', miles: 30000, months: 36 },
  { task: 'Tire rotation', miles: 6000, months: 6 },
]

export default function ServiceReminders() {
  const router = useRouter()
  const [reminders, setReminders] = useState<ServiceReminder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // 1. Fetch Vehicles AND their last Service Events in one go if possible
      // Otherwise, fetch all vehicles then all relevant service events for those vehicles.
      const { data: vehicles, error: vError } = await supabase
        .from('vehicles')
        .select(`
          id, license_plate, make, model, mileage,
          service_events (title, mileage, occurred_at)
        `)
        // Filter service_events to only get latest (Supabase doesn't easily limit 1 per child group, 
        // so we'll process the array in JS)

      if (vError) throw vError

      const remindersList: ServiceReminder[] = []
      const now = new Date()

      vehicles?.forEach(vehicle => {
        const currentMileage = vehicle.mileage || 0
        const vehicleName = `${vehicle.make || ''} ${vehicle.model || ''}`.trim()

        MAINTENANCE_INTERVALS.forEach(interval => {
          // Find latest event for this specific task
          const taskEvents = vehicle.service_events
            .filter((e: any) => e.title.toLowerCase().includes(interval.task.toLowerCase()))
            .sort((a: any, b: any) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())

          const lastEvent = taskEvents[0]
          
          // Calculate Miles
          const lastMileage = lastEvent?.mileage ?? 0
          const milesLeft = (lastMileage + interval.miles) - currentMileage
          
          // Calculate Days
          const lastDate = lastEvent ? new Date(lastEvent.occurred_at) : new Date(0)
          const nextDate = new Date(lastDate)
          nextDate.setMonth(nextDate.getMonth() + interval.months)
          const daysLeft = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

          const isOverdue = milesLeft <= 0 || daysLeft <= 0

          // Threshold: Show if within 1000 miles or 30 days
          if (isOverdue || milesLeft < 1000 || daysLeft < 30) {
            remindersList.push({
              vehicleId: vehicle.id,
              plate: vehicle.license_plate,
              vehicleName,
              task: interval.task,
              milesLeft,
              daysLeft,
              overdue: isOverdue,
              priority: isOverdue ? 0 : (milesLeft < 300 || daysLeft < 7 ? 1 : 2)
            })
          }
        })
      })

      setReminders(remindersList.sort((a, b) => a.priority - b.priority))
    } catch (err) {
      console.error('Reminder Sync Error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-500">Scanning vehicle health...</div>
  if (reminders.length === 0) return null

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-emerald-500" />
          <h3 className="text-lg font-semibold text-slate-100">Service Reminders</h3>
        </div>
        <span className="text-xs text-slate-500">{reminders.length} flagged</span>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {reminders.slice(0, 4).map((reminder, idx) => (
            <motion.div
              key={`${reminder.vehicleId}-${reminder.task}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => router.push(`/vehicles/${reminder.plate}`)}
              className={`
                group flex justify-between items-center p-3 rounded-xl cursor-pointer transition-all
                bg-slate-800/50 hover:bg-slate-800 border-l-4
                ${reminder.overdue ? 'border-red-500' : 'border-amber-500'}
              `}
            >
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-200 group-hover:text-white flex items-center gap-1">
                  {reminder.overdue && <AlertTriangle size={12} className="text-red-500" />}
                  {reminder.task}
                </span>
                <span className="text-xs text-slate-400">
                  {reminder.vehicleName} • {reminder.plate}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`text-xs font-bold ${reminder.overdue ? 'text-red-400' : 'text-amber-400'}`}>
                    {reminder.overdue ? 'Action Required' : `${Math.max(0, reminder.milesLeft)} mi left`}
                  </p>
                  {reminder.daysLeft > 0 && !reminder.overdue && (
                    <p className="text-[10px] text-slate-500">approx. {reminder.daysLeft} days</p>
                  )}
                </div>
                <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}