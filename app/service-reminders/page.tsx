// app/service-reminders/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import { Plus, Calendar, Gauge, CheckCircle, XCircle, Trash2, Loader2, AlertCircle } from 'lucide-react';
import theme from '@/app/theme';
import toast from 'react-hot-toast';

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_mileage: number | null;
  completed: boolean;
  created_at: string;
  vehicle: {
    make: string;
    model: string;
    license_plate: string;
  };
}

export default function ServiceRemindersPage() {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data, error } = await supabase
        .from('reminders')
        .select(`
          *,
          vehicle:vehicles(make, model, license_plate)
        `)
        .eq('user_id', user.id)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('due_mileage', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setReminders(data || []);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const toggleComplete = async (id: string, completed: boolean) => {
    const { error } = await supabase
      .from('reminders')
      .update({ completed: !completed })
      .eq('id', id);
    if (error) {
      toast.error('Failed to update reminder');
    } else {
      toast.success(completed ? 'Reminder marked incomplete' : 'Reminder completed');
      fetchReminders();
    }
  };

  const deleteReminder = async (id: string) => {
    if (!confirm('Delete this reminder permanently?')) return;
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete reminder');
    } else {
      toast.success('Reminder deleted');
      fetchReminders();
    }
  };

  if (loading) {
    return (
      <div style={styles.centered}>
        <Loader2 size={40} className="spin" color={theme.colors.primary} />
        <p>Loading reminders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <AlertCircle size={48} color={theme.colors.status.critical} />
        <p>{error}</p>
        <button onClick={fetchReminders} style={styles.retryButton}>Try Again</button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Service Reminders</h1>
          <p style={styles.subtitle}>Keep track of your vehicle maintenance</p>
        </div>
        <button onClick={() => router.push('/service-reminders/add')} style={styles.addButton}>
          <Plus size={18} /> Add Reminder
        </button>
      </div>

      {reminders.length === 0 ? (
        <div style={styles.empty}>
          <Calendar size={48} style={{ opacity: 0.3 }} />
          <p>No service reminders yet. Add one to keep your fleet healthy.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          <AnimatePresence>
            {reminders.map((reminder) => (
              <motion.div
                key={reminder.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                style={styles.card}
              >
                <div style={styles.cardHeader}>
                  <div style={styles.cardTitleRow}>
                    <h3 style={styles.cardTitle}>{reminder.title}</h3>
                    <button
                      onClick={() => deleteReminder(reminder.id)}
                      style={styles.deleteIcon}
                      aria-label="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={styles.vehicleBadge}>
                    {reminder.vehicle?.make} {reminder.vehicle?.model} ({reminder.vehicle?.license_plate})
                  </div>
                </div>
                {reminder.description && (
                  <p style={styles.description}>{reminder.description}</p>
                )}
                <div style={styles.metaRow}>
                  {reminder.due_date && (
                    <div style={styles.metaItem}>
                      <Calendar size={14} /> Due: {new Date(reminder.due_date).toLocaleDateString()}
                    </div>
                  )}
                  {reminder.due_mileage && (
                    <div style={styles.metaItem}>
                      <Gauge size={14} /> {reminder.due_mileage.toLocaleString()} mi
                    </div>
                  )}
                </div>
                <div style={styles.cardFooter}>
                  <button
                    onClick={() => toggleComplete(reminder.id, reminder.completed)}
                    style={{
                      ...styles.statusBtn,
                      background: reminder.completed ? `${theme.colors.status.healthy}20` : `${theme.colors.primary}20`,
                      color: reminder.completed ? theme.colors.status.healthy : theme.colors.primary,
                    }}
                  >
                    {reminder.completed ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {reminder.completed ? ' Completed' : ' Mark Complete'}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: theme.spacing[10],
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: theme.colors.text.primary,
    fontFamily: theme.fontFamilies.sans,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[8],
    flexWrap: 'wrap',
    gap: theme.spacing[4],
  },
  title: {
    fontSize: theme.fontSizes['4xl'],
    fontWeight: theme.fontWeights.bold,
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: theme.spacing[1],
  },
  subtitle: {
    color: theme.colors.text.secondary,
    fontSize: theme.fontSizes.sm,
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    color: theme.colors.background.main,
    fontWeight: 700,
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: theme.spacing[5],
  },
  card: {
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
    padding: theme.spacing[5],
    transition: 'transform 0.2s',
  },
  cardHeader: {
    marginBottom: theme.spacing[3],
  },
  cardTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  cardTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 700,
    margin: 0,
  },
  deleteIcon: {
    background: 'transparent',
    border: 'none',
    color: theme.colors.text.muted,
    cursor: 'pointer',
    padding: theme.spacing[1],
    borderRadius: '4px',
  },
  vehicleBadge: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.muted,
    background: theme.colors.background.subtle,
    padding: `${theme.spacing[0]} ${theme.spacing[2]}`,
    borderRadius: theme.borderRadius.full,
    display: 'inline-block',
  },
  description: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[3],
    lineHeight: 1.5,
  },
  metaRow: {
    display: 'flex',
    gap: theme.spacing[4],
    marginBottom: theme.spacing[4],
    flexWrap: 'wrap',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[1],
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.muted,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  statusBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[1],
    border: 'none',
    borderRadius: theme.borderRadius.full,
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    fontSize: theme.fontSizes.xs,
    fontWeight: 600,
    cursor: 'pointer',
  },
  centered: {
    minHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[4],
    textAlign: 'center',
  },
  empty: {
    textAlign: 'center',
    padding: theme.spacing[12],
    color: theme.colors.text.muted,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing[4],
  },
  retryButton: {
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    color: theme.colors.background.main,
    cursor: 'pointer',
  },
};