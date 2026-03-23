// app/dashboard/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase/client';
import { computeFleetBrain } from '@/lib/ai';
import type { Vehicle } from '@/app/types/fleet';
import theme from '@/app/theme';

// Lazy load map to avoid SSR issues
const FleetMap = dynamic(() => import('@/components/maps/FleetMap'), {
  ssr: false,
  loading: () => (
    <div style={styles.mapPlaceholder}>
      <div className="spinner" />
      <p>Loading map…</p>
    </div>
  ),
});

type ServiceReminder = {
  id: string;
  reminder_type: string;
  next_due_mileage: number | null;
  next_due_date: string | null;
  vehicle: {
    license_plate: string;
    make: string | null;
    model: string | null;
  };
};

type AIPrediction = {
  vehicle_id: string;
  license_plate: string;
  make: string;
  model: string;
  predicted_cost: number;
  predicted_days: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reminders, setReminders] = useState<ServiceReminder[]>([]);
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  const loadDashboard = useCallback(async () => {
  try {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not logged in');
    setUser(user);

    // Fetch vehicles
    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id);
    if (vehiclesError) throw vehiclesError;
    setVehicles(vehiclesData || []);

    // Fetch reminders
    const { data: remindersData, error: remindersError } = await supabase
      .from('reminders')
      .select(`*, vehicle:vehicles(license_plate, make, model)`)
      .eq('user_id', user.id);

    if (remindersError) {
      console.error('Reminders fetch error:', remindersError);
      setReminders([]);
    } else {
      const transformed = (remindersData || []).map((reminder: any) => ({
        ...reminder,
        vehicle: Array.isArray(reminder.vehicle) ? reminder.vehicle[0] : reminder.vehicle,
      }));
      setReminders(transformed);
    }
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => {
  loadDashboard();
}, [loadDashboard]);
  // Compute fleet health and critical alerts
  const vehiclesWithAI = useMemo(() => computeFleetBrain(vehicles), [vehicles]);

  useEffect(() => {
    const critical = vehiclesWithAI
      .filter(v => (v.health_score ?? 100) < 40)
      .map(v => ({
        ...v,
        health_score: v.health_score,
      }));
    setCriticalAlerts(critical);
  }, [vehiclesWithAI]);

  const stats = {
    total: vehicles.length,
    healthy: vehiclesWithAI.filter(v => (v.health_score ?? 100) >= 70).length,
    warning: vehiclesWithAI.filter(v => {
      const s = v.health_score ?? 100;
      return s >= 40 && s < 70;
    }).length,
    critical: criticalAlerts.length,
  };

  const mapVehicles = vehicles
    .filter(v => v.lat && v.lng)
    .map(v => ({
      id: v.id,
      position: [v.lat, v.lng] as [number, number],
      license_plate: v.license_plate,
      make: v.make,
      model: v.model,
      health_score: vehiclesWithAI.find(ai => ai.id === v.id)?.health_score,
    }));

  const quickActions = [
    { label: 'Add Vehicle', href: '/vehicles/add', icon: '🚗', color: theme.colors.primary },
    { label: 'Diagnostics', href: '/diagnostics', icon: '🔧', color: theme.colors.secondary },
    { label: 'Post a Job', href: '/marketplace/jobs/post', icon: '📝', color: theme.colors.warning },
    { label: 'Find Mechanic', href: '/marketplace/mechanics', icon: '👨‍🔧', color: '#a855f7' },
    { label: 'Log Service', href: '/service-history/add', icon: '📋', color: '#ec489a' },
  ];

  const handleRetry = () => {
    setRefreshing(true);
    loadDashboard();
  };

  if (error && !refreshing) {
    return (
      <div style={styles.errorContainer}>
        <h2>⚠️ Error loading dashboard</h2>
        <p>{error}</p>
        <button onClick={handleRetry} style={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Fleet Operations Dashboard</h1>
        <div style={styles.statusBadge}>
          <span style={styles.pulse} /> Live
        </div>
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <KPI
          label="Total Fleet"
          value={stats.total}
          color={theme.colors.info}
          onClick={() => router.push('/vehicles')}
        />
        <KPI
          label="Healthy"
          value={stats.healthy}
          color={theme.colors.status.healthy}
          onClick={() => router.push('/vehicles?status=healthy')}
        />
        <KPI
          label="Warning"
          value={stats.warning}
          color={theme.colors.status.warning}
          onClick={() => router.push('/vehicles?status=warning')}
        />
        <KPI
          label="Critical"
          value={stats.critical}
          color={theme.colors.status.critical}
          onClick={() => router.push('/vehicles?status=critical')}
        />
      </div>

      {/* Quick Actions */}
      <div style={styles.quickActionsGrid}>
        {quickActions.map(action => (
          <motion.button
            key={action.label}
            whileHover={{ scale: 1.02, y: -2 }}
            onClick={() => router.push(action.href)}
            style={{
              ...styles.quickActionButton,
              background: `${action.color}20`,
              borderColor: action.color,
            }}
          >
            <span style={{ fontSize: 24 }}>{action.icon}</span>
            <span style={styles.quickActionLabel}>{action.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Main Layout: Map + Recent Vehicles */}
      <div style={styles.mainLayout}>
        <div style={styles.mapCard}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Fleet Geospatial View</h2>
            <span style={styles.liveDot}>● LIVE</span>
          </div>
          <div style={styles.mapWrapper}>
            {loading ? (
              <div style={styles.loadingBox}>
                <div className="spinner" />
                <p>Loading map data...</p>
              </div>
            ) : mapVehicles.length === 0 ? (
              <div style={styles.noLocation}>
                <p>No location data available</p>
                <p style={styles.noLocationSub}>Vehicles need coordinates to appear on map.</p>
                <button
                  onClick={() => router.push('/vehicles/add')}
                  style={styles.smallAddButton}
                >
                  Add vehicle with location
                </button>
              </div>
            ) : (
              <FleetMap vehicles={mapVehicles} />
            )}
          </div>
        </div>

        <div style={styles.listCard}>
          <h2 style={styles.cardTitle}>Recent Vehicles</h2>
          <div style={styles.listScroll}>
            {loading ? (
              <div style={styles.loadingBox}>Loading vehicles...</div>
            ) : vehicles.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No vehicles added yet.</p>
                <button
                  onClick={() => router.push('/vehicles/add')}
                  style={styles.addButton}
                >
                  + Add your first vehicle
                </button>
              </div>
            ) : (
              vehicles.slice(0, 8).map(v => {
                const ai = vehiclesWithAI.find(ai => ai.id === v.id);
                return (
                  <motion.div
                    key={v.id}
                    whileHover={{ scale: 1.02, backgroundColor: theme.colors.background.elevated }}
                    style={styles.vehicleRow}
                    onClick={() => router.push(`/vehicles/${v.license_plate}`)}
                  >
                    <div>
                      <div style={styles.plate}>{v.license_plate}</div>
                      <div style={styles.model}>{v.make} {v.model}</div>
                    </div>
                    <div style={healthBadge(ai?.health_score)}>
                      {ai?.health_score ?? 'N/A'}%
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Secondary Row: Service Reminders + AI Predictions + Critical Alerts */}
      <div style={styles.secondaryGrid}>
        {/* Service Reminders */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Upcoming Service Reminders</h2>
          {loading ? (
            <div style={styles.loadingBox}>Loading reminders...</div>
          ) : reminders.length === 0 ? (
            <div style={styles.emptyStateSmall}>
              <p>No upcoming reminders.</p>
              <button
                onClick={() => router.push('/service-reminders/add')}
                style={styles.linkButton}
              >
                + Add a reminder
              </button>
            </div>
          ) : (
            <div style={styles.listCompact}>
              {reminders.map(r => (
                <div key={r.id} style={styles.reminderRow}>
                  <div>
                    <div style={styles.reminderTitle}>{r.reminder_type}</div>
                    <div style={styles.reminderVehicle}>
                      {r.vehicle?.license_plate} {r.vehicle?.make} {r.vehicle?.model}
                    </div>
                  </div>
                  <div style={styles.reminderDue}>
                    {r.next_due_mileage && (
                      <span>{r.next_due_mileage.toLocaleString()} mi</span>
                    )}
                    {r.next_due_date && (
                      <span>{format(new Date(r.next_due_date), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => router.push('/service-reminders')}
            style={styles.viewAllButton}
          >
            View All Reminders
          </button>
        </div>

        {/* AI Predictions */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>AI Predictions</h2>
          {loading ? (
            <div style={styles.loadingBox}>Loading predictions...</div>
          ) : predictions.length === 0 ? (
            <div style={styles.emptyStateSmall}>
              <p>No predictions available.</p>
              <p style={{ fontSize: 12 }}>Predictions will appear as vehicles gather data.</p>
            </div>
          ) : (
            <div style={styles.listCompact}>
              {predictions.slice(0, 3).map(p => (
                <div key={p.vehicle_id} style={styles.predictionRow}>
                  <div>
                    <div style={styles.reminderTitle}>{p.make} {p.model}</div>
                    <div style={styles.reminderVehicle}>{p.license_plate}</div>
                  </div>
                  <div style={styles.predictionCost}>
                    <span style={{ fontWeight: 700 }}>£{p.predicted_cost}</span>
                    <span style={{ fontSize: 12 }}> in {p.predicted_days} days</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => router.push('/predictions')}
            style={styles.viewAllButton}
          >
            View Details
          </button>
        </div>

        {/* Critical Alerts */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Critical Alerts</h2>
          {loading ? (
            <div style={styles.loadingBox}>Loading alerts...</div>
          ) : criticalAlerts.length === 0 ? (
            <div style={styles.emptyStateSmall}>
              <p>No critical alerts – all vehicles are stable.</p>
            </div>
          ) : (
            <div style={styles.listCompact}>
              {criticalAlerts.map(v => (
                <div key={v.id} style={styles.alertRow}>
                  <div style={{ color: theme.colors.status.critical, fontWeight: 'bold' }}>⚠️</div>
                  <div>
                    <div style={styles.reminderTitle}>
                      {v.make} {v.model} – {v.license_plate}
                    </div>
                    <div style={{ fontSize: 12, color: theme.colors.status.critical }}>
                      Health Score:{' '}
                      {vehiclesWithAI.find(ai => ai.id === v.id)?.health_score}%
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/diagnostics?vehicle=${v.license_plate}`)}
                    style={styles.smallButton}
                  >
                    Diagnose
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => router.push('/control-center')}
            style={styles.viewAllButton}
          >
            View All
          </button>
        </div>
      </div>

      <style jsx>{`
        .spinner {
          border: 3px solid rgba(255,255,255,0.1);
          border-top: 3px solid ${theme.colors.primary};
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </motion.div>
  );
}

// Helper components
function KPI({
  label,
  value,
  color,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: `0 10px 20px -5px ${color}40` }}
      style={{ ...styles.kpiCard, borderBottom: `3px solid ${color}`, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div style={styles.kpiLabel}>{label}</div>
      <div style={{ ...styles.kpiValue, color }}>{value}</div>
    </motion.div>
  );
}

function healthBadge(score?: number) {
  let color = theme.colors.status.healthy;
  if (score !== undefined) {
    if (score < 40) color = theme.colors.status.critical;
    else if (score < 70) color = theme.colors.status.warning;
  }
  return {
    background: `${color}20`,
    color,
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.bold,
  };
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
    margin: 0,
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    background: theme.colors.background.card,
    padding: `${theme.spacing[1]} ${theme.spacing[4]}`,
    borderRadius: theme.borderRadius.full,
    color: theme.colors.status.healthy,
    border: `1px solid ${theme.colors.status.healthy}40`,
  },
  pulse: {
    width: 10,
    height: 10,
    background: theme.colors.status.healthy,
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: theme.spacing[5],
    marginBottom: theme.spacing[8],
  },
  kpiCard: {
    background: theme.colors.background.card,
    padding: theme.spacing[6],
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
    transition: theme.transitions.default,
  },
  kpiLabel: {
    fontSize: theme.fontSizes.sm,
    textTransform: 'uppercase' as const,
    opacity: 0.7,
  },
  kpiValue: {
    fontSize: 36,
    fontWeight: theme.fontWeights.bold,
    marginTop: theme.spacing[2],
  },
  quickActionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: theme.spacing[4],
    marginBottom: theme.spacing[8],
  },
  quickActionButton: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: theme.spacing[2],
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.xl,
    border: `1px solid`,
    cursor: 'pointer',
    transition: theme.transitions.default,
    background: 'transparent',
  },
  quickActionLabel: {
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.semibold,
  },
  mainLayout: {
    display: 'grid',
    gridTemplateColumns: '2.5fr 1.2fr',
    gap: theme.spacing[6],
    marginBottom: theme.spacing[8],
  },
  mapCard: {
    background: theme.colors.background.card,
    padding: theme.spacing[5],
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  cardTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.text.secondary,
    margin: 0,
  },
  liveDot: {
    color: theme.colors.status.critical,
    fontSize: theme.fontSizes.xs,
    fontWeight: 'bold',
    animation: 'pulse 2s infinite',
  },
  mapWrapper: {
    height: 450,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    background: theme.colors.background.elevated,
  },
  mapPlaceholder: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[4],
    background: theme.colors.background.elevated,
    borderRadius: theme.borderRadius.xl,
    color: theme.colors.text.secondary,
  },
  loadingBox: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[4],
    color: theme.colors.text.secondary,
    minHeight: 200,
  },
  noLocation: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors.text.muted,
    textAlign: 'center' as const,
    padding: theme.spacing[5],
  },
  noLocationSub: {
    fontSize: theme.fontSizes.sm,
    marginTop: theme.spacing[2],
    opacity: 0.7,
  },
  listCard: {
    background: theme.colors.background.card,
    padding: theme.spacing[5],
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  listScroll: {
    overflowY: 'auto' as const,
    flex: 1,
    marginTop: theme.spacing[2],
    maxHeight: 450,
  },
  vehicleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing[3],
    borderBottom: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.lg,
    cursor: 'pointer',
    transition: theme.transitions.default,
  },
  plate: {
    fontWeight: theme.fontWeights.semibold,
    fontSize: theme.fontSizes.base,
  },
  model: {
    fontSize: theme.fontSizes.xs,
    opacity: 0.6,
    marginTop: theme.spacing[1],
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: `${theme.spacing[10]} ${theme.spacing[5]}`,
    color: theme.colors.text.muted,
  },
  addButton: {
    background: theme.colors.primary,
    color: theme.colors.background.main,
    border: 'none',
    padding: `${theme.spacing[2]} ${theme.spacing[5]}`,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing[4],
    cursor: 'pointer',
    fontWeight: theme.fontWeights.semibold,
  },
  smallAddButton: {
    background: theme.colors.primary,
    color: theme.colors.background.main,
    border: 'none',
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing[3],
    cursor: 'pointer',
    fontSize: theme.fontSizes.xs,
  },
  secondaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: theme.spacing[6],
    marginTop: theme.spacing[5],
  },
  card: {
    background: theme.colors.background.card,
    padding: theme.spacing[5],
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
  },
  listCompact: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: theme.spacing[3],
    marginBottom: theme.spacing[4],
  },
  reminderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing[2],
    borderBottom: `1px solid ${theme.colors.border.light}`,
  },
  reminderTitle: {
    fontWeight: theme.fontWeights.semibold,
    fontSize: theme.fontSizes.sm,
  },
  reminderVehicle: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing[0.5],
  },
  reminderDue: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.status.healthy,
    display: 'flex',
    gap: theme.spacing[2],
  },
  predictionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing[2],
    borderBottom: `1px solid ${theme.colors.border.light}`,
  },
  predictionCost: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.primary,
    textAlign: 'right' as const,
  },
  alertRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[3],
    padding: theme.spacing[2],
    borderBottom: `1px solid ${theme.colors.border.light}`,
  },
  smallButton: {
    background: theme.colors.status.critical,
    border: 'none',
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.background.main,
    cursor: 'pointer',
  },
  viewAllButton: {
    background: theme.colors.background.elevated,
    border: 'none',
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    width: '100%',
    marginTop: theme.spacing[2],
  },
  emptyStateSmall: {
    textAlign: 'center' as const,
    padding: theme.spacing[5],
    color: theme.colors.text.muted,
  },
  linkButton: {
    background: 'transparent',
    border: 'none',
    color: theme.colors.primary,
    textDecoration: 'underline',
    cursor: 'pointer',
    marginTop: theme.spacing[2],
  },
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors.error,
    padding: theme.spacing[5],
    textAlign: 'center' as const,
  },
  retryButton: {
    marginTop: theme.spacing[4],
    padding: `${theme.spacing[2]} ${theme.spacing[6]}`,
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    color: theme.colors.background.main,
    fontWeight: theme.fontWeights.bold,
    cursor: 'pointer',
  },
};

// Add a small media query for responsiveness
const mediaQuery = `@media (max-width: 768px) {
  .mainLayout {
    grid-template-columns: 1fr;
  }
}`;
