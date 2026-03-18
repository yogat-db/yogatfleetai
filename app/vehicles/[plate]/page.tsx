'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { computeFleetBrain } from '@/lib/ai'
import type { Vehicle } from '@/app/types/fleet'

type ServiceEvent = {
  id: string
  title: string
  description: string | null
  mileage: number | null
  occurred_at: string
}

type Reminder = {
  id: string
  task: string
  interval_miles: number | null
  interval_months: number | null
  last_completed_at: string | null
  last_mileage: number | null
  next_due_date: string | null
  next_due_mileage: number | null
}

export default function VehicleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const plate = params.plate as string

  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [events, setEvents] = useState<ServiceEvent[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'service' | 'ai' | 'reminders'>('overview')
  const [showReminderForm, setShowReminderForm] = useState(false)
  const [newReminder, setNewReminder] = useState({
    task: '',
    interval_miles: '',
    interval_months: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!plate) return
    fetchData()
  }, [plate])

  async function fetchData() {
    try {
      setLoading(true)
      const vehicleRes = await fetch(`/api/vehicles/plate/${encodeURIComponent(plate)}`)
      if (!vehicleRes.ok) throw new Error('Vehicle not found')
      const vehicleData = await vehicleRes.json()
      setVehicle(vehicleData)

      const eventsRes = await fetch(`/api/vehicles/${vehicleData.id}/service-events`)
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json()
        setEvents(Array.isArray(eventsData) ? eventsData : [])
      }

      // Fetch reminders
      const remindersRes = await fetch(`/api/vehicles/${vehicleData.id}/reminders`)
      if (remindersRes.ok) {
        const remindersData = await remindersRes.json()
        setReminders(Array.isArray(remindersData) ? remindersData : [])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const enriched = vehicle ? computeFleetBrain([vehicle])[0] : null

  // Reminder handlers
  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vehicle) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: newReminder.task,
          interval_miles: newReminder.interval_miles ? parseInt(newReminder.interval_miles) : null,
          interval_months: newReminder.interval_months ? parseInt(newReminder.interval_months) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add reminder')
      setReminders([...reminders, data])
      setShowReminderForm(false)
      setNewReminder({ task: '', interval_miles: '', interval_months: '' })
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCompleteReminder = async (reminder: Reminder) => {
    if (!vehicle) return
    try {
      const res = await fetch(`/api/reminders/${reminder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reminder,
          last_completed_at: new Date().toISOString(),
          last_mileage: vehicle.mileage,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update reminder')
      setReminders(reminders.map(r => r.id === reminder.id ? data : r))
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDeleteReminder = async (id: string) => {
    if (!confirm('Delete this reminder?')) return
    try {
      const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setReminders(reminders.filter(r => r.id !== id))
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading vehicle details...</p>
      </div>
    )
  }

  if (error || !vehicle) {
    return (
      <div style={styles.centered}>
        <h2>Vehicle not found</h2>
        <p>{error}</p>
        <button onClick={() => router.push('/vehicles')} style={styles.button}>
          Back to Fleet
        </button>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>
        ← Back
      </button>

      <h1 style={styles.title}>
        {vehicle.make} {vehicle.model} – {vehicle.license_plate}
      </h1>

      {/* Tabs */}
      <div style={styles.tabBar}>
        {['overview', 'service', 'ai', 'reminders'].map(tab => (
          <button
            key={tab}
            style={{ ...styles.tab, borderBottomColor: activeTab === tab ? '#22c55e' : 'transparent' }}
            onClick={() => setActiveTab(tab as any)}
          >
            {tab === 'overview' ? 'Overview' : tab === 'service' ? 'Service History' : tab === 'ai' ? 'AI Insights' : 'Reminders'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={styles.tabContent}>
        {activeTab === 'overview' && (
          <div>
            <p><strong>Year:</strong> {vehicle.year}</p>
            <p><strong>Mileage:</strong> {vehicle.mileage?.toLocaleString()} mi</p>
            <p><strong>Status:</strong> {vehicle.status || 'Active'}</p>
            <p><strong>Health Score:</strong> {enriched?.health_score ?? 'N/A'}%</p>
          </div>
        )}

        {activeTab === 'service' && (
          <div>
            <div style={styles.serviceHeader}>
              <h4>Recent Events</h4>
              <button onClick={() => router.push(`/service-history/add?vehicleId=${vehicle.id}`)} style={styles.smallButton}>
                Add Event
              </button>
            </div>
            {events.length === 0 ? (
              <p>No service events recorded.</p>
            ) : (
              <table style={styles.eventTable}>
                <thead><tr><th>Date</th><th>Title</th><th>Mileage</th><th>Description</th></tr></thead>
                <tbody>
                  {events.slice(0,5).map(e => (
                    <tr key={e.id}>
                      <td>{new Date(e.occurred_at).toLocaleDateString()}</td>
                      <td>{e.title}</td>
                      <td>{e.mileage?.toLocaleString() ?? '—'}</td>
                      <td>{e.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'ai' && enriched && (
          <div style={styles.aiCard}>
            <p><strong>Risk Level:</strong> {enriched.risk}</p>
            <p><strong>Health Score:</strong> {enriched.health_score}%</p>
            {enriched.predictedFailureDate && (
              <p><strong>Predicted Failure:</strong> {new Date(enriched.predictedFailureDate).toLocaleDateString()}</p>
            )}
            {enriched.daysToFailure && (
              <p><strong>Days to Failure:</strong> {enriched.daysToFailure}</p>
            )}
            {enriched.estimatedRepairCost && (
              <p><strong>Est. Repair Cost:</strong> £{enriched.estimatedRepairCost.toLocaleString()}</p>
            )}
          </div>
        )}

        {activeTab === 'reminders' && (
          <div>
            <div style={styles.serviceHeader}>
              <h4>Service Reminders</h4>
              <button onClick={() => setShowReminderForm(!showReminderForm)} style={styles.smallButton}>
                {showReminderForm ? 'Cancel' : 'Add Reminder'}
              </button>
            </div>

            <AnimatePresence>
              {showReminderForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAddReminder}
                  style={styles.reminderForm}
                >
                  <input
                    type="text"
                    placeholder="Task (e.g., Oil Change)"
                    value={newReminder.task}
                    onChange={e => setNewReminder({ ...newReminder, task: e.target.value })}
                    style={styles.input}
                    required
                  />
                  <div style={styles.rowFields}>
                    <input
                      type="number"
                      placeholder="Interval (miles)"
                      value={newReminder.interval_miles}
                      onChange={e => setNewReminder({ ...newReminder, interval_miles: e.target.value })}
                      style={styles.input}
                    />
                    <input
                      type="number"
                      placeholder="Interval (months)"
                      value={newReminder.interval_months}
                      onChange={e => setNewReminder({ ...newReminder, interval_months: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <p style={styles.hint}>At least one interval (miles or months) is required.</p>
                  <button type="submit" disabled={submitting} style={styles.submitButton}>
                    {submitting ? 'Adding...' : 'Add Reminder'}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {reminders.length === 0 ? (
              <p>No reminders set.</p>
            ) : (
              <div style={styles.remindersList}>
                {reminders.map(reminder => (
                  <div key={reminder.id} style={styles.reminderCard}>
                    <div style={styles.reminderHeader}>
                      <strong>{reminder.task}</strong>
                      <div style={styles.reminderActions}>
                        <button
                          onClick={() => handleCompleteReminder(reminder)}
                          style={styles.completeButton}
                          title="Mark as completed"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => handleDeleteReminder(reminder.id)}
                          style={styles.deleteButton}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div style={styles.reminderDetails}>
                      {reminder.next_due_date && (
                        <span>Due: {new Date(reminder.next_due_date).toLocaleDateString()}</span>
                      )}
                      {reminder.next_due_mileage && (
                        <span> at {reminder.next_due_mileage.toLocaleString()} mi</span>
                      )}
                    </div>
                    {reminder.last_completed_at && (
                      <div style={styles.lastCompleted}>
                        Last: {new Date(reminder.last_completed_at).toLocaleDateString()}
                        {reminder.last_mileage && ` (${reminder.last_mileage.toLocaleString()} mi)`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9' },
  centered: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' },
  backButton: { background: 'transparent', border: '1px solid #334155', color: '#f1f5f9', padding: '8px 16px', borderRadius: 8, marginBottom: 24, cursor: 'pointer' },
  title: { fontSize: 32, fontWeight: 700, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 32 },
  tabBar: { display: 'flex', gap: 16, borderBottom: '1px solid #1e293b', marginBottom: 24 },
  tab: { background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: '#94a3b8', padding: '8px 0', cursor: 'pointer' },
  tabContent: { padding: '16px 0' },
  serviceHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  smallButton: { background: '#22c55e', color: '#020617', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 14, cursor: 'pointer' },
  eventTable: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  aiCard: { background: '#0f172a', padding: 20, borderRadius: 12, border: '1px solid #1e293b' },
  button: { background: '#22c55e', color: '#020617', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', marginTop: 16 },
  reminderForm: { background: '#0f172a', padding: 16, borderRadius: 8, marginBottom: 16 },
  input: { width: '100%', padding: 8, background: '#1e293b', border: '1px solid #334155', borderRadius: 4, color: '#f1f5f9', marginBottom: 8 },
  rowFields: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  hint: { fontSize: 12, color: '#64748b' },
  submitButton: { background: '#22c55e', color: '#020617', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' },
  remindersList: { display: 'flex', flexDirection: 'column', gap: 8 },
  reminderCard: { background: '#0f172a', padding: 12, borderRadius: 8, border: '1px solid #1e293b' },
  reminderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  reminderActions: { display: 'flex', gap: 4 },
  completeButton: { background: '#22c55e', border: 'none', color: '#020617', width: 24, height: 24, borderRadius: 4, cursor: 'pointer' },
  deleteButton: { background: '#ef4444', border: 'none', color: '#fff', width: 24, height: 24, borderRadius: 4, cursor: 'pointer' },
  reminderDetails: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  lastCompleted: { fontSize: 12, color: '#64748b', marginTop: 4 },
}