'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

export default function AddReminderPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueMileage, setDueMileage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data } = await supabase
      .from('vehicles')
      .select('id, make, model, license_plate')
      .eq('user_id', user.id);
    setVehicles(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!selectedVehicle) {
      setError('Please select a vehicle');
      setLoading(false);
      return;
    }
    if (!title.trim()) {
      setError('Reminder title is required');
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { error } = await supabase.from('reminders').insert({
        user_id: user.id,
        vehicle_id: selectedVehicle,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        due_mileage: dueMileage ? parseInt(dueMileage) : null,
        completed: false,
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => router.push('/service-reminders'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>
        ← Back
      </button>
      <div style={styles.card}>
        <h1 style={styles.title}>Add Service Reminder</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Vehicle *</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              style={styles.select}
              required
            >
              <option value="">Select a vehicle</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} ({v.license_plate})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Reminder Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Oil Change"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={styles.textarea}
              placeholder="Additional details..."
            />
          </div>

          <div style={styles.row}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Due Mileage (mi)</label>
              <input
                type="number"
                value={dueMileage}
                onChange={(e) => setDueMileage(e.target.value)}
                placeholder="e.g., 50000"
                style={styles.input}
              />
            </div>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}
          {success && <div style={styles.successBox}>✓ Reminder added! Redirecting...</div>}

          <button type="submit" disabled={loading} style={styles.submitButton}>
            {loading ? 'Adding...' : 'Add Reminder'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: theme.spacing[10],
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: theme.colors.text.primary,
    fontFamily: theme.fontFamilies.sans,
    display: 'flex',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: theme.spacing[5],
    left: theme.spacing[5],
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    color: theme.colors.text.secondary,
    cursor: 'pointer',
  },
  card: {
    maxWidth: '600px',
    width: '100%',
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[8],
    marginTop: theme.spacing[10],
  },
  title: {
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.bold,
    marginBottom: theme.spacing[6],
    color: theme.colors.text.primary,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[5],
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[2],
  },
  label: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
  },
  input: {
    width: '100%',
    background: theme.colors.background.elevated,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
  },
  select: {
    width: '100%',
    background: theme.colors.background.elevated,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
  },
  textarea: {
    width: '100%',
    background: theme.colors.background.elevated,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    resize: 'vertical',
  },
  row: {
    display: 'flex',
    gap: theme.spacing[4],
  },
  errorBox: {
    background: `${theme.colors.error}20`,
    border: `1px solid ${theme.colors.error}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.error,
    fontSize: theme.fontSizes.sm,
  },
  successBox: {
    background: `${theme.colors.primary}20`,
    border: `1px solid ${theme.colors.primary}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.primary,
    fontSize: theme.fontSizes.sm,
    textAlign: 'center',
  },
  submitButton: {
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.background.main,
    cursor: 'pointer',
  },
};