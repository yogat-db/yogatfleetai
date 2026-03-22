'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase/client';

type Vehicle = {
  id: string;
  license_plate: string;
  make: string | null;
  model: string | null;
};

type Reminder = {
  id: string;
  vehicle_id: string;
  reminder_type: string;
  interval_miles: number | null;
  interval_days: number | null;
  last_service_mileage: number | null;
  last_service_date: string | null;
  next_due_mileage: number | null;
  next_due_date: string | null;
  active: boolean;
  vehicle?: Vehicle;
};

export default function ServiceRemindersPage() {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReminder, setNewReminder] = useState({
    vehicle_id: '',
    reminder_type: '',
    interval_miles: '',
    interval_days: '',
    last_service_mileage: '',
    last_service_date: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      // Fetch reminders with vehicle info
      const { data: remData, error: remErr } = await supabase
        .from('service_reminders')
        .select(`
          *,
          vehicle:vehicle_id (
            id,
            license_plate,
            make,
            model
          )
        `)
        .order('next_due_date', { ascending: true, nullsFirst: false });

      if (remErr) throw remErr;
      setReminders(remData || []);

      // Fetch vehicles for dropdown
      const { data: vehData, error: vehErr } = await supabase
        .from('vehicles')
        .select('id, license_plate, make, model');
      if (vehErr) throw vehErr;
      setVehicles(vehData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddReminder(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('service_reminders')
        .insert({
          vehicle_id: newReminder.vehicle_id,
          reminder_type: newReminder.reminder_type,
          interval_miles: newReminder.interval_miles ? parseInt(newReminder.interval_miles) : null,
          interval_days: newReminder.interval_days ? parseInt(newReminder.interval_days) : null,
          last_service_mileage: newReminder.last_service_mileage ? parseInt(newReminder.last_service_mileage) : null,
          last_service_date: newReminder.last_service_date || null,
          next_due_mileage: null, // you can calculate later or leave to a trigger
          next_due_date: null,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Optionally call a function to calculate next due
      await calculateNextDue(data.id);

      setShowAddForm(false);
      setNewReminder({
        vehicle_id: '',
        reminder_type: '',
        interval_miles: '',
        interval_days: '',
        last_service_mileage: '',
        last_service_date: '',
      });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function calculateNextDue(reminderId: string) {
    // This could be a Supabase function or compute on client.
    // For simplicity, we'll rely on a database trigger or edge function.
    // Here we just refresh data.
    await fetchData();
  }

  async function markCompleted(reminderId: string) {
    // This should update last_service fields based on current mileage/date
    // For now, we can prompt user for current mileage/date
    const currentMileage = prompt('Enter current mileage:');
    const currentDate = prompt('Enter service date (YYYY-MM-DD):');
    if (!currentMileage || !currentDate) return;

    try {
      const { error } = await supabase
        .from('service_reminders')
        .update({
          last_service_mileage: parseInt(currentMileage),
          last_service_date: currentDate,
        })
        .eq('id', reminderId);
      if (error) throw error;
      // Recalculate next due (you could call a function)
      await calculateNextDue(reminderId);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function toggleActive(reminderId: string, currentActive: boolean) {
    try {
      const { error } = await supabase
        .from('service_reminders')
        .update({ active: !currentActive })
        .eq('id', reminderId);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading reminders...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Service Reminders</h1>
        <button onClick={() => setShowAddForm(true)} style={styles.addButton}>
          + Add Reminder
        </button>
      </div>

      {error && <p style={styles.errorText}>{error}</p>}

      {showAddForm && (
        <div style={styles.modalOverlay} onClick={() => setShowAddForm(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>New Service Reminder</h2>
            <form onSubmit={handleAddReminder} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Vehicle</label>
                <select
                  value={newReminder.vehicle_id}
                  onChange={(e) => setNewReminder({ ...newReminder, vehicle_id: e.target.value })}
                  required
                  style={styles.input}
                >
                  <option value="">Select a vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} – {v.license_plate}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Reminder Type</label>
                <input
                  type="text"
                  value={newReminder.reminder_type}
                  onChange={(e) => setNewReminder({ ...newReminder, reminder_type: e.target.value })}
                  required
                  placeholder="e.g., Oil Change, Brake Check"
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Interval (miles)</label>
                <input
                  type="number"
                  value={newReminder.interval_miles}
                  onChange={(e) => setNewReminder({ ...newReminder, interval_miles: e.target.value })}
                  placeholder="e.g., 5000"
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Interval (days)</label>
                <input
                  type="number"
                  value={newReminder.interval_days}
                  onChange={(e) => setNewReminder({ ...newReminder, interval_days: e.target.value })}
                  placeholder="e.g., 180"
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Last Service Mileage</label>
                <input
                  type="number"
                  value={newReminder.last_service_mileage}
                  onChange={(e) => setNewReminder({ ...newReminder, last_service_mileage: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Last Service Date</label>
                <input
                  type="date"
                  value={newReminder.last_service_date}
                  onChange={(e) => setNewReminder({ ...newReminder, last_service_date: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowAddForm(false)} style={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={styles.saveButton}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reminders.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No service reminders configured.</p>
          <button onClick={() => setShowAddForm(true)} style={styles.emptyButton}>
            Add your first reminder
          </button>
        </div>
      ) : (
        <div style={styles.remindersList}>
          {reminders.map((reminder) => (
            <div key={reminder.id} style={styles.reminderCard}>
              <div style={styles.reminderHeader}>
                <div>
                  <span style={styles.vehiclePlate}>{reminder.vehicle?.license_plate}</span>
                  <span style={styles.vehicleName}>
                    {reminder.vehicle?.make} {reminder.vehicle?.model}
                  </span>
                </div>
                <div style={styles.reminderActions}>
                  <button
                    onClick={() => markCompleted(reminder.id)}
                    style={styles.completeButton}
                    title="Mark as completed"
                  >
                    ✓ Complete
                  </button>
                  <button
                    onClick={() => toggleActive(reminder.id, reminder.active)}
                    style={{ ...styles.toggleButton, background: reminder.active ? '#ef4444' : '#22c55e' }}
                  >
                    {reminder.active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
              <h3 style={styles.reminderType}>{reminder.reminder_type}</h3>
              <div style={styles.reminderDetails}>
                {reminder.interval_miles && (
                  <span>Every {reminder.interval_miles.toLocaleString()} mi</span>
                )}
                {reminder.interval_days && (
                  <span>Every {reminder.interval_days} days</span>
                )}
              </div>
              <div style={styles.dueInfo}>
                {reminder.next_due_mileage && (
                  <p>Next due at: {reminder.next_due_mileage.toLocaleString()} mi</p>
                )}
                {reminder.next_due_date && (
                  <p>Next due by: {format(new Date(reminder.next_due_date), 'MMM d, yyyy')}</p>
                )}
                {!reminder.next_due_mileage && !reminder.next_due_date && (
                  <p style={{ color: '#94a3b8' }}>Next due not calculated</p>
                )}
              </div>
            </div>
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
  );
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
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#0f172a',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    border: '1px solid #1e293b',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 600,
    marginBottom: 20,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: '#94a3b8',
  },
  input: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#f1f5f9',
    fontSize: 14,
    outline: 'none',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  cancelButton: {
    background: '#1e293b',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 30,
    color: '#94a3b8',
    cursor: 'pointer',
  },
  saveButton: {
    background: '#22c55e',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 30,
    color: '#020617',
    cursor: 'pointer',
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
    border: 'none',
    padding: '10px 20px',
    borderRadius: 30,
    color: '#020617',
    cursor: 'pointer',
  },
  remindersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  reminderCard: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 16,
    padding: 20,
  },
  reminderHeader: {
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
  reminderType: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 8,
  },
  reminderDetails: {
    display: 'flex',
    gap: 12,
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 12,
  },
  dueInfo: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  reminderActions: {
    display: 'flex',
    gap: 8,
  },
  completeButton: {
    background: '#3b82f6',
    border: 'none',
    padding: '6px 12px',
    borderRadius: 20,
    fontSize: 12,
    color: 'white',
    cursor: 'pointer',
  },
  toggleButton: {
    border: 'none',
    padding: '6px 12px',
    borderRadius: 20,
    fontSize: 12,
    color: 'white',
    cursor: 'pointer',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
  },
};
