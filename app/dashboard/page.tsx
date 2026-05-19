'use client';

import {
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Calendar,
  TrendingUp,
  Plus,
  Wrench,
  Eye,
  RefreshCw,
  Loader2,
  Bell,
  X,
  Fuel,
  AlertCircle as AlertIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import toast from 'react-hot-toast';

const FleetMap = dynamic(
  () => import('@/components/FleetMap'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: '320px',
          background: theme.colors.background.subtle,
          borderRadius: theme.borderRadius.xl,
        }}
      />
    ),
  }
);

// Types
interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  health_score: number | null;
  lat: number | null;
  lng: number | null;
  year?: number | null;
  mileage?: number | null;
}

interface Reminder {
  id: string;
  title: string;
  due_date: string | null;
  due_mileage: number | null;
  vehicle?: { make: string; model: string; license_plate: string };
}

interface Prediction {
  vehicle_id: string;
  license_plate: string;
  make: string;
  model: string;
  predicted_cost: number;
  predicted_days: number;
}

type NotificationType = 'info' | 'warning' | 'critical';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  created_at: string;
  read: boolean;
}

const getHealthBadgeStyle = (score: number | null): React.CSSProperties => {
  const safeScore = score ?? 0;
  const palette =
    safeScore >= 80
      ? { bg: '#22c55e20', fg: '#22c55e', label: 'Healthy' }
      : safeScore >= 50
      ? { bg: '#f59e0b20', fg: '#f59e0b', label: 'Warning' }
      : { bg: '#ef444420', fg: '#ef4444', label: 'Critical' };

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: palette.bg,
    color: palette.fg,
    minWidth: 72,
    justifyContent: 'center',
  };
};

const getNotificationColor = (type: NotificationType) => {
  if (type === 'critical') return '#ef4444';
  if (type === 'warning') return '#f59e0b';
  return '#22c55e';
};

export default function DashboardPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingScores, setUpdatingScores] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showReminderForm, setShowReminderForm] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: '',
    due_date: '',
    due_mileage: '',
    vehicle_id: '',
  });
  const [addingReminder, setAddingReminder] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setRefreshing(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select(
          'id, license_plate, make, model, health_score, lat, lng, year, mileage'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (vehiclesError) {
        console.error('[dashboard] vehicles error:', vehiclesError);
        setVehicles([]);
      } else {
        setVehicles(vehiclesData || []);
      }

      // Reminders
      const { data: rawReminders, error: remindersError } = await supabase
        .from('reminders')
        .select('id, title, due_date, due_mileage, vehicle_id')
        .eq('completed', false)
        .order('due_date', { ascending: true })
        .limit(10);

      if (remindersError) {
        console.error('[dashboard] reminders error:', remindersError);
        setReminders([]);
      } else if (rawReminders?.length) {
        const vehicleIds = rawReminders.map((r) => r.vehicle_id).filter(Boolean);
        let vehicleMap = new Map<string, { make: string; model: string; license_plate: string }>();

        if (vehicleIds.length) {
          const { data: vehiclesLookup } = await supabase
            .from('vehicles')
            .select('id, make, model, license_plate')
            .in('id', vehicleIds);

          if (vehiclesLookup) {
            vehicleMap = new Map(
              vehiclesLookup.map((v) => [v.id, v])
            );
          }
        }

        setReminders(
          rawReminders.map((r) => ({
            id: r.id,
            title: r.title,
            due_date: r.due_date,
            due_mileage: r.due_mileage,
            vehicle: r.vehicle_id ? vehicleMap.get(r.vehicle_id) : undefined,
          }))
        );
      } else {
        setReminders([]);
      }

      // AI predictions
      if (vehiclesData?.length) {
        try {
          const predRes = await fetch('/api/ai/predictive-maintenance', {
  cache: 'no-store',
});

if (predRes.ok) {
  const json = await predRes.json();
  setPredictions(Array.isArray(json?.predictions) ? json.predictions : []);
} else {
  setPredictions([]);
}
        } catch {
          setPredictions([]);
        }
      } else {
        setPredictions([]);
      }

      // Notifications
      const { data: notifs, error: notifsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (notifsError) {
        console.error('[dashboard] notifications error:', notifsError);
        setNotifications([]);
        setUnreadCount(0);
      } else if (notifs) {
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.read).length);
      }
    } catch (err) {
      console.error('[dashboard] fetchData error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
      setNotifications((notifs) =>
        notifs.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[dashboard] markAsRead error:', err);
    }
  };

  const handleAddReminder = async () => {
    if (!newReminder.title.trim()) {
      toast.error('Please enter a reminder title');
      return;
    }

    setAddingReminder(true);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newReminder.title,
          due_date: newReminder.due_date || null,
          due_mileage: newReminder.due_mileage
            ? parseInt(newReminder.due_mileage, 10)
            : null,
          vehicle_id: newReminder.vehicle_id || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg = body?.error || 'Failed to add reminder';
        throw new Error(msg);
      }

      toast.success('Reminder added');
      setNewReminder({
        title: '',
        due_date: '',
        due_mileage: '',
        vehicle_id: '',
      });
      setShowReminderForm(false);
      fetchData();
    } catch (err) {
      console.error('[dashboard] handleAddReminder error:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to add reminder'
      );
    } finally {
      setAddingReminder(false);
    }
  };

  const handleMOTCheck = (licensePlate?: string) => {
    const reg =
      licensePlate ||
      window.prompt('Enter vehicle registration for MOT check:');
    if (reg) {
      window.open(
        `https://www.gov.uk/check-mot-history?registration=${encodeURIComponent(
          reg
        )}`,
        '_blank'
      );
    }
  };

  const refreshHealthScores = async () => {
    setUpdatingScores(true);
    try {
      const res = await fetch('/api/vehicles/update-health-scores', {
        method: 'POST',
      });
      const payload = await res.json().catch(() => null);

      if (res.ok) {
        toast.success(`Updated scores for ${payload?.updated ?? 0} vehicles`);
      } else {
        toast.error(payload?.error || 'Failed to update scores');
      }

      fetchData();
    } catch (err) {
      console.error('[dashboard] refreshHealthScores error:', err);
      toast.error('Failed to update scores');
    } finally {
      setUpdatingScores(false);
    }
  };

  const total = vehicles.length;
  const healthy = vehicles.filter((v) => (v.health_score ?? 0) >= 80).length;
  const warning = vehicles.filter(
    (v) => (v.health_score ?? 0) >= 50 && (v.health_score ?? 0) < 80
  ).length;
  const critical = vehicles.filter((v) => (v.health_score ?? 0) < 50).length;
  const hasLocationData = vehicles.some((v) => v.lat && v.lng);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (loading && !refreshing) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p style={{ marginTop: 12, color: theme.colors.text.secondary }}>
          Loading your fleet…
        </p>
        <style>{spinnerCss}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <p style={{ color: '#ef4444', marginBottom: 12 }}>Error: {error}</p>
        <button type="button" onClick={fetchData} style={styles.retryButton}>
          Try again
        </button>
        <style>{spinnerCss}</style>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={styles.page}
    >
      <style>{spinnerCss}</style>

      {/* Header */}
      <header style={styles.headerRow}>
        <div>
          <div style={styles.headerEyebrow}>Control centre</div>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>
            Fleet overview, health scores, and upcoming maintenance in one view.
          </p>
        </div>

        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={refreshHealthScores}
            disabled={updatingScores}
            style={styles.iconButton}
            aria-label="Refresh health scores"
          >
            {updatingScores ? (
              <Loader2 size={16} className="spin" aria-hidden="true" />
            ) : (
              <RefreshCw size={16} aria-hidden="true" />
            )}
          </button>

          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowNotifications((open) => !open)}
              style={styles.iconButton}
              aria-label="Open notifications"
            >
              <Bell size={18} aria-hidden="true" />
              {unreadCount > 0 && (
                <span style={styles.badge} aria-label={`${unreadCount} unread`}>
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  style={styles.notifDropdown}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                >
                  <div style={styles.notifHeader}>
                    <span style={styles.notifTitle}>Notifications</span>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      style={styles.notifClose}
                      aria-label="Close notifications"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div style={styles.notifEmpty}>No notifications yet</div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        style={{
                          ...styles.notifItem,
                          opacity: n.read ? 0.6 : 1,
                        }}
                        onClick={() => markAsRead(n.id)}
                      >
                        <AlertIcon
                          size={14}
                          color={getNotificationColor(n.type)}
                          aria-hidden="true"
                        />
                        <span style={styles.notifMessage}>{n.message}</span>
                        <span style={styles.notifMeta}>
                          {new Date(n.created_at).toLocaleDateString()}
                        </span>
                      </button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Stats row */}
      <section style={styles.statsGrid} aria-label="Fleet health overview">
        <div style={styles.statCard}>
          <div style={styles.statIconWrap}>
            <Truck size={18} aria-hidden="true" />
          </div>
          <div>
            <div style={styles.statValue}>{total}</div>
            <div style={styles.statLabel}>Vehicles</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIconWrap, background: '#22c55e20' }}>
            <CheckCircle size={18} color="#22c55e" aria-hidden="true" />
          </div>
          <div>
            <div style={styles.statValue}>{healthy}</div>
            <div style={styles.statLabel}>Healthy</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIconWrap, background: '#f59e0b20' }}>
            <AlertTriangle size={18} color="#f59e0b" aria-hidden="true" />
          </div>
          <div>
            <div style={styles.statValue}>{warning}</div>
            <div style={styles.statLabel}>Warning</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIconWrap, background: '#ef444420' }}>
            <AlertTriangle size={18} color="#ef4444" aria-hidden="true" />
          </div>
          <div>
            <div style={styles.statValue}>{critical}</div>
            <div style={styles.statLabel}>Critical</div>
          </div>
        </div>
      </section>

      {/* Main grid: fleet table + map */}
      <section style={styles.mainGrid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderTitle}>
              <Truck size={18} aria-hidden="true" />
              <h2 style={styles.cardTitle}>Your fleet</h2>
            </div>
            <button
              type="button"
              onClick={() => router.push('/vehicles/add')}
              style={styles.smallButton}
            >
              <Plus size={14} aria-hidden="true" />
              <span>Add vehicle</span>
            </button>
          </div>

          {vehicles.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>You have no vehicles yet.</p>
              <button
                type="button"
                onClick={() => router.push('/vehicles/add')}
                style={styles.primaryButton}
              >
                Add first vehicle
              </button>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Registration</th>
                    <th>Health</th>
                    <th>Year</th>
                    <th>Mileage</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v.id}>
                      <td>
                        {v.make} {v.model}
                      </td>
                      <td>{v.license_plate}</td>
                      <td>
                        <span style={getHealthBadgeStyle(v.health_score)}>
                          {(v.health_score ?? '—') + (v.health_score != null ? '%' : '')}
                        </span>
                      </td>
                      <td>{v.year ?? '—'}</td>
                      <td>
                        {v.mileage != null
                          ? `${v.mileage.toLocaleString()} mi`
                          : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/vehicles/${v.license_plate}`)
                          }
                          style={styles.iconButton}
                          aria-label={`View ${v.make} ${v.model}`}
                        >
                          <Eye size={16} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderTitle}>
              <MapPin size={18} aria-hidden="true" />
              <h2 style={styles.cardTitle}>Live fleet map</h2>
            </div>
          </div>

          {hasLocationData && mapboxToken ? (
            <FleetMap vehicles={vehicles} />
          ) : (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>
                No location data available. Add addresses or tracking to your
                vehicles to unlock the map.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Bottom grid: reminders + predictions */}
      <section style={styles.bottomGrid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderTitle}>
              <Calendar size={18} aria-hidden="true" />
              <h2 style={styles.cardTitle}>Service reminders</h2>
            </div>

            <button
              type="button"
              onClick={() => setShowReminderForm((open) => !open)}
              style={styles.smallButton}
            >
              <Plus size={14} aria-hidden="true" />
              <span>Add</span>
            </button>
          </div>

          <AnimatePresence initial={false}>
            {showReminderForm && (
              <motion.div
                style={styles.reminderForm}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                <input
                  type="text"
                  placeholder="Reminder title (e.g., Oil change)"
                  value={newReminder.title}
                  onChange={(e) =>
                    setNewReminder((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  style={styles.input}
                />

                <div style={styles.reminderRow}>
                  <input
                    type="date"
                    value={newReminder.due_date}
                    onChange={(e) =>
                      setNewReminder((prev) => ({
                        ...prev,
                        due_date: e.target.value,
                      }))
                    }
                    style={styles.inputSmall}
                  />

                  <input
                    type="number"
                    placeholder="Due mileage"
                    value={newReminder.due_mileage}
                    onChange={(e) =>
                      setNewReminder((prev) => ({
                        ...prev,
                        due_mileage: e.target.value,
                      }))
                    }
                    style={styles.inputSmall}
                  />

                  <select
                    value={newReminder.vehicle_id}
                    onChange={(e) =>
                      setNewReminder((prev) => ({
                        ...prev,
                        vehicle_id: e.target.value,
                      }))
                    }
                    style={styles.inputSmall}
                  >
                    <option value="">All vehicles</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.make} {v.model}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAddReminder}
                  disabled={addingReminder}
                  style={styles.primaryButton}
                >
                  {addingReminder ? 'Adding…' : 'Save reminder'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {reminders.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>
                No reminders set. Create one to stay ahead of maintenance.
              </p>
            </div>
          ) : (
            <div>
              {reminders.map((rem) => (
                <div key={rem.id} style={styles.reminderItem}>
                  <div style={styles.reminderTitleRow}>
                    <strong>{rem.title}</strong>
                    {rem.vehicle && (
                      <span style={styles.vehicleTag}>
                        {rem.vehicle.make} {rem.vehicle.model}
                      </span>
                    )}
                  </div>
                  <div style={styles.reminderMeta}>
                    {rem.due_date && (
                      <span>
                        <Calendar size={11} aria-hidden="true" />{' '}
                        {new Date(rem.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {rem.due_mileage && (
                      <span>
                        <Fuel size={11} aria-hidden="true" />{' '}
                        {rem.due_mileage.toLocaleString()} mi
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => handleMOTCheck()}
            style={styles.linkButton}
          >
            <Wrench size={13} aria-hidden="true" /> Check MOT history
          </button>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderTitle}>
              <TrendingUp size={18} aria-hidden="true" />
              <h2 style={styles.cardTitle}>AI maintenance predictions</h2>
            </div>
          </div>

          {predictions.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>
                No predictions yet. Run diagnostics to generate forecasts.
              </p>
            </div>
          ) : (
            <div>
              {predictions.slice(0, 5).map((p) => (
                <div key={p.vehicle_id} style={styles.predictionItem}>
                  <div style={styles.predictionMain}>
                    <span style={styles.predictionVehicle}>
                      {p.make} {p.model} ({p.license_plate})
                    </span>
                    <span style={styles.predictionCost}>
                      £{p.predicted_cost.toLocaleString()}
                    </span>
                  </div>
                  <div style={styles.predictionMeta}>
                    Forecast in {p.predicted_days} days
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => router.push('/diagnostics')}
            style={styles.linkButton}
          >
            View detailed diagnostics →
          </button>
        </div>
      </section>
    </motion.div>
  );
}

const spinnerCss = `
  .spinner {
    border: 2px solid #1f2937;
    border-top-color: #22c55e;
    border-radius: 999px;
    width: 32px;
    height: 32px;
    animation: dashboard-spin 0.8s linear infinite;
  }
  .spin {
    animation: dashboard-spin 0.8s linear infinite;
  }
  @keyframes dashboard-spin {
    to { transform: rotate(360deg); }
  }
`;

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 'clamp(16px, 4vw, 32px)',
    background: theme.colors.background.main,
    minHeight: '100vh',
    fontFamily: theme.fontFamilies.sans,
    color: theme.colors.text.primary,
  },
  centered: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80vh',
  },
  retryButton: {
    marginTop: 12,
    padding: '8px 16px',
    background: theme.colors.primary,
    borderRadius: 10,
    border: 'none',
    color: '#020617',
    fontWeight: 600,
    cursor: 'pointer',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    color: theme.colors.text.muted,
    marginBottom: 6,
  },
  title: {
    fontSize: 'clamp(24px, 5vw, 32px)',
    fontWeight: 800,
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '0 0 6px 0',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    maxWidth: 420,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    background: theme.colors.background.card,
    borderRadius: 999,
    border: `1px solid ${theme.colors.border.medium}`,
    padding: 8,
    cursor: 'pointer',
    color: theme.colors.text.secondary,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    background: '#ef4444',
    color: '#fff',
    borderRadius: 999,
    fontSize: 10,
    padding: '2px 6px',
    minWidth: 16,
    textAlign: 'center',
    fontWeight: 600,
  },
  notifDropdown: {
    position: 'absolute',
    top: 42,
    right: 0,
    width: 300,
    background: theme.colors.background.card,
    borderRadius: 16,
    border: `1px solid ${theme.colors.border.light}`,
    boxShadow: '0 18px 40px rgba(15,23,42,0.35)',
    zIndex: 40,
    maxHeight: 320,
    overflowY: 'auto',
  },
  notifHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderBottom: `1px solid ${theme.colors.border.light}`,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: 600,
  },
  notifClose: {
    background: 'none',
    border: 'none',
    padding: 4,
    cursor: 'pointer',
    color: theme.colors.text.secondary,
    borderRadius: 999,
  },
  notifEmpty: {
    padding: '12px 14px',
    fontSize: 13,
    color: theme.colors.text.muted,
  },
  notifItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 12px',
    borderBottom: `1px solid ${theme.colors.border.light}`,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  notifMessage: {
    fontSize: 13,
    flex: 1,
  },
  notifMeta: {
    fontSize: 11,
    color: theme.colors.text.muted,
    marginLeft: 8,
    whiteSpace: 'nowrap',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    background: theme.colors.background.card,
    borderRadius: 16,
    border: `1px solid ${theme.colors.border.light}`,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 999,
    background: theme.colors.background.subtle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 800,
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: theme.colors.text.muted,
    marginTop: 4,
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2.5fr)',
    gap: 24,
    marginBottom: 24,
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 24,
    marginBottom: 16,
  },
  card: {
    background: theme.colors.background.card,
    borderRadius: 20,
    border: `1px solid ${theme.colors.border.light}`,
    padding: 20,
    minHeight: 180,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  cardHeaderTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 600,
    margin: 0,
  },
  smallButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: `${theme.colors.primary}14`,
    borderRadius: 999,
    border: `1px solid ${theme.colors.primary}28`,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    color: theme.colors.primary,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  emptyState: {
    textAlign: 'center',
    padding: '22px 16px',
    color: theme.colors.text.muted,
  },
  emptyText: {
    fontSize: 13,
    margin: 0,
  },
  primaryButton: {
    marginTop: 12,
    padding: '9px 16px',
    borderRadius: 999,
    border: 'none',
    background: theme.colors.primary,
    color: '#020617',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  reminderForm: {
    background: theme.colors.background.subtle,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${theme.colors.border.medium}`,
    background: theme.colors.background.card,
    color: theme.colors.text.primary,
    fontSize: 13,
    marginBottom: 10,
  },
  inputSmall: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${theme.colors.border.medium}`,
    background: theme.colors.background.card,
    color: theme.colors.text.primary,
    fontSize: 13,
    minWidth: 0,
  },
  reminderRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  reminderItem: {
    paddingBottom: 10,
    marginBottom: 10,
    borderBottom: `1px dashed ${theme.colors.border.light}`,
  },
  reminderTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  vehicleTag: {
    padding: '2px 8px',
    borderRadius: 999,
    background: theme.colors.background.subtle,
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
  reminderMeta: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    fontSize: 12,
    color: theme.colors.text.muted,
  },
  linkButton: {
    marginTop: 10,
    background: 'none',
    border: 'none',
    color: theme.colors.primary,
    cursor: 'pointer',
    fontSize: 13,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  predictionItem: {
    borderRadius: 14,
    padding: '10px 12px',
    marginBottom: 8,
    background: theme.colors.background.subtle,
  },
  predictionMain: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  predictionVehicle: {
    fontSize: 13,
    fontWeight: 600,
  },
  predictionCost: {
    fontWeight: 700,
    color: theme.colors.primary,
    fontSize: 14,
  },
  predictionMeta: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.text.muted,
  },
};