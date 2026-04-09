// app/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  Truck, CheckCircle, AlertTriangle, MapPin, Calendar,
  TrendingUp, Plus, Wrench, Car, Eye, RefreshCw, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

// Dynamically import the map component (no SSR)
const FleetMap = dynamic(
  () => import('@/components/FleetMap'),
  { ssr: false, loading: () => <div style={{ height: '300px', background: '#1e293b', borderRadius: '12px' }} /> }
);

// ==================== TYPES ====================
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

// ==================== HELPER ====================
const getThemeValue = (path: string, fallback: any): any => {
  const parts = path.split('.');
  let current: any = theme;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return fallback;
    }
  }
  return current;
};

// Badge style helper
const getHealthBadgeStyle = (score: number | null) => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: 500,
  backgroundColor: (score ?? 0) >= 80 ? '#22c55e20' : (score ?? 0) >= 50 ? '#f59e0b20' : '#ef444420',
  color: (score ?? 0) >= 80 ? '#22c55e' : (score ?? 0) >= 50 ? '#f59e0b' : '#ef4444',
});

// ==================== MAIN COMPONENT ====================
export default function DashboardPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingScores, setUpdatingScores] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setRefreshing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. Vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, license_plate, make, model, health_score, lat, lng, year, mileage')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (vehiclesError) throw vehiclesError;
      setVehicles(vehiclesData || []);

      // 2. Reminders
      const { data: rawReminders, error: remindersError } = await supabase
        .from('reminders')
        .select('id, title, due_date, due_mileage, vehicle_id')
        .eq('completed', false)
        .order('due_date', { ascending: true })
        .limit(5);

      if (remindersError) throw remindersError;

      if (rawReminders?.length) {
        const vehicleIds = rawReminders.map(r => r.vehicle_id).filter(Boolean);
        let vehicleMap = new Map();
        if (vehicleIds.length) {
          const { data: vehiclesLookup } = await supabase
            .from('vehicles')
            .select('id, make, model, license_plate')
            .in('id', vehicleIds);
          if (vehiclesLookup) {
            vehicleMap = new Map(vehiclesLookup.map(v => [v.id, { make: v.make, model: v.model, license_plate: v.license_plate }]));
          }
        }
        setReminders(rawReminders.map(r => ({
          id: r.id,
          title: r.title,
          due_date: r.due_date,
          due_mileage: r.due_mileage,
          vehicle: r.vehicle_id ? vehicleMap.get(r.vehicle_id) : undefined,
        })));
      } else {
        setReminders([]);
      }

      // 3. AI predictions
      if (vehiclesData?.length) {
        try {
          const predRes = await fetch('/api/ai/predictive-maintenance');
          if (predRes.ok) {
            const predData = await predRes.json();
            const predArray = Array.isArray(predData) ? predData : [predData];
            setPredictions(predArray);
          } else {
            setPredictions([]);
          }
        } catch (predErr) {
          console.error('Predictions error:', predErr);
          setPredictions([]);
        }
      } else {
        setPredictions([]);
      }
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update health scores (persist to DB)
  const refreshHealthScores = async () => {
    setUpdatingScores(true);
    try {
      const res = await fetch('/api/vehicles/update-health-scores', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`Updated health scores for ${data.updated} vehicles`);
        await fetchData(); // refresh dashboard
      } else {
        alert(data.error || 'Failed to update scores');
      }
    } catch (err) {
      alert('Error updating scores');
    } finally {
      setUpdatingScores(false);
    }
  };

  // Stats
  const total = vehicles.length;
  const healthy = vehicles.filter(v => (v.health_score ?? 0) >= 80).length;
  const warning = vehicles.filter(v => (v.health_score ?? 0) >= 50 && (v.health_score ?? 0) < 80).length;
  const critical = vehicles.filter(v => (v.health_score ?? 0) < 50).length;
  const criticalVehicles = vehicles.filter(v => (v.health_score ?? 0) < 40);
  const hasLocationData = vehicles.some(v => v.lat && v.lng);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading dashboard...</p>
        <style jsx>{`
          .spinner {
            border: 3px solid ${getThemeValue('colors.border.medium', '#334155')};
            border-top: 3px solid ${getThemeValue('colors.primary', '#22c55e')};
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error && !refreshing) {
    return (
      <div style={styles.centered}>
        <p style={{ color: getThemeValue('colors.error', '#ef4444') }}>Error: {error}</p>
        <button onClick={handleRefresh} style={styles.retryButton}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      {/* Header with two buttons */}
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>Welcome back to your fleet overview</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={refreshHealthScores} disabled={updatingScores} style={styles.refreshButton}>
            {updatingScores ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
            {updatingScores ? ' Updating...' : ' Update Health Scores'}
          </button>
          <button onClick={handleRefresh} disabled={refreshing} style={styles.refreshButton}>
            {refreshing ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
            {refreshing ? ' Refreshing...' : ' Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <motion.div whileHover={{ y: -5 }} style={styles.statCard}>
          <Truck size={24} color={getThemeValue('colors.info', '#3b82f6')} />
          <div><span style={styles.statValue}>{total}</span><span style={styles.statLabel}>Total Vehicles</span></div>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} style={styles.statCard}>
          <CheckCircle size={24} color={getThemeValue('colors.status.healthy', '#22c55e')} />
          <div><span style={styles.statValue}>{healthy}</span><span style={styles.statLabel}>Healthy</span></div>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} style={styles.statCard}>
          <AlertTriangle size={24} color={getThemeValue('colors.status.warning', '#f59e0b')} />
          <div><span style={styles.statValue}>{warning}</span><span style={styles.statLabel}>Warning</span></div>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} style={styles.statCard}>
          <AlertTriangle size={24} color={getThemeValue('colors.status.critical', '#ef4444')} />
          <div><span style={styles.statValue}>{critical}</span><span style={styles.statLabel}>Critical</span></div>
        </motion.div>
      </div>

      {/* Your Fleet Table */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <Truck size={20} color={getThemeValue('colors.primary', '#22c55e')} />
          <h2 style={styles.cardTitle}>Your Fleet</h2>
          <button onClick={() => router.push('/vehicles/add')} style={styles.smallButton}>
            <Plus size={16} /> Add Vehicle
          </button>
        </div>
        {vehicles.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No vehicles added yet.</p>
            <button onClick={() => router.push('/vehicles/add')} style={styles.primaryButton}>Add your first vehicle</button>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Make & Model</th>
                  <th>License Plate</th>
                  <th>Health</th>
                  <th>Year</th>
                  <th>Mileage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map(vehicle => (
                  <tr key={vehicle.id}>
                    <td>{vehicle.make} {vehicle.model}</td>
                    <td>{vehicle.license_plate}</td>
                    <td><span style={getHealthBadgeStyle(vehicle.health_score)}>{vehicle.health_score ?? '—'}%</span></td>
                    <td>{vehicle.year ?? '—'}</td>
                    <td>{vehicle.mileage?.toLocaleString() ?? '—'} mi</td>
                    <td>
                      <button onClick={() => router.push(`/vehicles/${vehicle.license_plate}`)} style={styles.iconButton}>
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Map Card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <MapPin size={20} color={getThemeValue('colors.primary', '#22c55e')} />
          <h2 style={styles.cardTitle}>Fleet Geospatial View</h2>
        </div>
        {hasLocationData && mapboxToken ? (
          <FleetMap vehicles={vehicles} />
        ) : (
          <div style={styles.emptyState}>
            <p>No location data available or Mapbox token missing. Add addresses to your vehicles to see them on the map.</p>
            <button onClick={() => router.push('/vehicles/add')} style={styles.smallButton}>
              <Plus size={16} /> Add vehicle with location
            </button>
          </div>
        )}
      </div>

      {/* Two‑column: Reminders & Predictions */}
      <div style={styles.twoColumn}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Calendar size={20} color={getThemeValue('colors.primary', '#22c55e')} />
            <h2 style={styles.cardTitle}>Upcoming Service Reminders</h2>
          </div>
          {reminders.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No upcoming reminders.</p>
              <button onClick={() => router.push('/service-history/add')} style={styles.smallButton}>
                <Plus size={16} /> Add a reminder
              </button>
            </div>
          ) : (
            <div>
              {reminders.map(rem => (
                <div key={rem.id} style={styles.reminderItem}>
                  <strong>{rem.title}</strong>
                  {rem.vehicle && <span style={styles.vehicleTag}>{rem.vehicle.make} {rem.vehicle.model}</span>}
                  <div style={styles.reminderMeta}>
                    {rem.due_date && <span>Due: {new Date(rem.due_date).toLocaleDateString()}</span>}
                    {rem.due_mileage && <span> at {rem.due_mileage.toLocaleString()} mi</span>}
                  </div>
                </div>
              ))}
              <button onClick={() => router.push('/service-reminders')} style={styles.linkButton}>View all reminders</button>
            </div>
          )}
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <TrendingUp size={20} color={getThemeValue('colors.primary', '#22c55e')} />
            <h2 style={styles.cardTitle}>AI Predictive Maintenance</h2>
          </div>
          {predictions.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No predictions available yet. Add more vehicle data for AI insights.</p>
              <button onClick={() => router.push('/diagnostics')} style={styles.smallButton}>
                <Wrench size={16} /> Run Diagnostics
              </button>
            </div>
          ) : (
            <div>
              {predictions.slice(0, 5).map(pred => (
                <div key={pred.vehicle_id} style={styles.predictionItem}>
                  <div style={styles.predictionHeader}>
                    <strong>{pred.make} {pred.model} ({pred.license_plate})</strong>
                    <span style={styles.predictionCost}>£{pred.predicted_cost}</span>
                  </div>
                  <div style={styles.predictionMeta}>Estimated maintenance in {pred.predicted_days} days</div>
                </div>
              ))}
              <button onClick={() => router.push('/diagnostics')} style={styles.linkButton}>View detailed predictions</button>
            </div>
          )}
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalVehicles.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <AlertTriangle size={20} color={getThemeValue('colors.status.critical', '#ef4444')} />
            <h2 style={styles.cardTitle}>Critical Alerts</h2>
          </div>
          <div style={styles.alertsList}>
            {criticalVehicles.map(v => (
              <div key={v.id} style={styles.alertItem}>
                <Car size={16} color={getThemeValue('colors.status.critical', '#ef4444')} />
                <span>{v.make} {v.model} ({v.license_plate}) – Health: {v.health_score}%</span>
                <button onClick={() => router.push(`/vehicles/${v.license_plate}`)} style={styles.linkButton}>View Details</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: getThemeValue('spacing.8', '32px'),
    background: getThemeValue('colors.background.main', '#020617'),
    minHeight: '100vh',
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
    fontFamily: getThemeValue('fontFamilies.sans', 'Inter, sans-serif'),
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getThemeValue('spacing.6', '24px'),
    flexWrap: 'wrap',
    gap: getThemeValue('spacing.4', '16px'),
  },
  title: {
    fontSize: getThemeValue('fontSizes.3xl', '32px'),
    fontWeight: getThemeValue('fontWeights.bold', '700'),
    marginBottom: getThemeValue('spacing.1', '4px'),
    background: getThemeValue('gradients.title', 'linear-gradient(135deg, #94a3b8, #f1f5f9)'),
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: getThemeValue('fontSizes.base', '16px'),
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
  },
  refreshButton: {
    padding: `${getThemeValue('spacing.2', '8px')} ${getThemeValue('spacing.4', '16px')}`,
    background: getThemeValue('colors.background.card', '#0f172a'),
    border: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
    borderRadius: getThemeValue('borderRadius.lg', '12px'),
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: getThemeValue('spacing.2', '8px'),
    transition: 'all 0.2s',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: getThemeValue('spacing.4', '16px'),
    marginBottom: getThemeValue('spacing.6', '24px'),
  },
  statCard: {
    background: getThemeValue('colors.background.card', '#0f172a'),
    border: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
    borderRadius: getThemeValue('borderRadius.lg', '12px'),
    padding: getThemeValue('spacing.4', '16px'),
    display: 'flex',
    alignItems: 'center',
    gap: getThemeValue('spacing.3', '12px'),
    cursor: 'default',
  },
  statValue: {
    fontSize: getThemeValue('fontSizes.2xl', '24px'),
    fontWeight: getThemeValue('fontWeights.bold', '700'),
    display: 'block',
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
  },
  statLabel: {
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    color: getThemeValue('colors.text.muted', '#64748b'),
  },
  card: {
    background: getThemeValue('colors.background.card', '#0f172a'),
    border: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
    borderRadius: getThemeValue('borderRadius.xl', '16px'),
    padding: getThemeValue('spacing.5', '20px'),
    marginBottom: getThemeValue('spacing.6', '24px'),
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: getThemeValue('spacing.2', '8px'),
    marginBottom: getThemeValue('spacing.4', '16px'),
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: getThemeValue('fontSizes.lg', '18px'),
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
    flex: 1,
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: getThemeValue('fontSizes.sm', '14px'),
  },
  iconButton: {
    background: 'transparent',
    border: 'none',
    color: getThemeValue('colors.primary', '#22c55e'),
    cursor: 'pointer',
    padding: getThemeValue('spacing.1', '4px'),
    borderRadius: getThemeValue('borderRadius.md', '8px'),
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    textAlign: 'center',
    padding: getThemeValue('spacing.6', '24px'),
    color: getThemeValue('colors.text.muted', '#64748b'),
  },
  primaryButton: {
    marginTop: getThemeValue('spacing.3', '12px'),
    padding: `${getThemeValue('spacing.2', '8px')} ${getThemeValue('spacing.4', '16px')}`,
    background: getThemeValue('colors.primary', '#22c55e'),
    border: 'none',
    borderRadius: getThemeValue('borderRadius.lg', '12px'),
    color: getThemeValue('colors.background.main', '#020617'),
    fontWeight: getThemeValue('fontWeights.medium', '500'),
    cursor: 'pointer',
  },
  smallButton: {
    padding: `${getThemeValue('spacing.1', '4px')} ${getThemeValue('spacing.3', '12px')}`,
    background: getThemeValue('colors.primary', '#22c55e'),
    border: 'none',
    borderRadius: getThemeValue('borderRadius.lg', '12px'),
    color: getThemeValue('colors.background.main', '#020617'),
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: getThemeValue('spacing.1', '4px'),
  },
  linkButton: {
    marginTop: getThemeValue('spacing.2', '8px'),
    background: 'transparent',
    border: 'none',
    color: getThemeValue('colors.primary', '#22c55e'),
    cursor: 'pointer',
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    textDecoration: 'underline',
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: getThemeValue('spacing.6', '24px'),
    marginBottom: getThemeValue('spacing.6', '24px'),
  },
  reminderItem: {
    marginBottom: getThemeValue('spacing.3', '12px'),
    paddingBottom: getThemeValue('spacing.2', '8px'),
    borderBottom: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
  },
  vehicleTag: {
    display: 'inline-block',
    marginLeft: getThemeValue('spacing.2', '8px'),
    fontSize: getThemeValue('fontSizes.xs', '12px'),
    color: getThemeValue('colors.text.muted', '#64748b'),
  },
  reminderMeta: {
    fontSize: getThemeValue('fontSizes.xs', '12px'),
    color: getThemeValue('colors.text.muted', '#64748b'),
    marginTop: getThemeValue('spacing.1', '4px'),
  },
  predictionItem: {
    marginBottom: getThemeValue('spacing.3', '12px'),
    paddingBottom: getThemeValue('spacing.2', '8px'),
    borderBottom: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
  },
  predictionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: getThemeValue('spacing.1', '4px'),
  },
  predictionCost: {
    fontWeight: getThemeValue('fontWeights.bold', '700'),
    color: getThemeValue('colors.primary', '#22c55e'),
  },
  predictionMeta: {
    fontSize: getThemeValue('fontSizes.xs', '12px'),
    color: getThemeValue('colors.text.muted', '#64748b'),
  },
  alertsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: getThemeValue('spacing.2', '8px'),
  },
  alertItem: {
    display: 'flex',
    alignItems: 'center',
    gap: getThemeValue('spacing.2', '8px'),
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
    flexWrap: 'wrap',
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
  },
  retryButton: {
    marginTop: getThemeValue('spacing.4', '16px'),
    padding: `${getThemeValue('spacing.2', '8px')} ${getThemeValue('spacing.4', '16px')}`,
    background: getThemeValue('colors.primary', '#22c55e'),
    border: 'none',
    borderRadius: getThemeValue('borderRadius.lg', '12px'),
    color: getThemeValue('colors.background.main', '#020617'),
    cursor: 'pointer',
  },
};