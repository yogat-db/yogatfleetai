'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Truck, CheckCircle, AlertTriangle, MapPin, Calendar, TrendingUp, Plus, Wrench, Car, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

// Mapbox (only if token exists)
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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

// ==================== COMPONENT ====================
export default function DashboardPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setRefreshing(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. Fetch vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, license_plate, make, model, health_score, lat, lng, year, mileage')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (vehiclesError) throw vehiclesError;
      setVehicles(vehiclesData || []);

      // 2. Fetch reminders (two-step to avoid join issues)
      const { data: rawReminders, error: remindersError } = await supabase
        .from('reminders')
        .select('id, title, due_date, due_mileage, vehicle_id')
        .eq('completed', false)
        .order('due_date', { ascending: true })
        .limit(5);

      if (remindersError) throw remindersError;

      if (rawReminders && rawReminders.length > 0) {
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
        const remindersWithVehicle: Reminder[] = rawReminders.map(r => ({
          id: r.id,
          title: r.title,
          due_date: r.due_date,
          due_mileage: r.due_mileage,
          vehicle: r.vehicle_id ? vehicleMap.get(r.vehicle_id) : undefined,
        }));
        setReminders(remindersWithVehicle);
      } else {
        setReminders([]);
      }

      // 3. Fetch real AI predictions if vehicles exist
      if (vehiclesData && vehiclesData.length > 0) {
        try {
          const predRes = await fetch('/api/ai/predictive-maintenance');
          if (predRes.ok) {
            const predData = await predRes.json();
            // The API returns either an array or single object
            const predArray = Array.isArray(predData) ? predData : [predData];
            setPredictions(predArray);
          } else {
            console.warn('Predictions API returned error, using fallback');
            setPredictions([]);
          }
        } catch (predErr) {
          console.error('Failed to fetch predictions:', predErr);
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

  // Stats calculations
  const total = vehicles.length;
  const healthy = vehicles.filter(v => (v.health_score ?? 0) >= 80).length;
  const warning = vehicles.filter(v => (v.health_score ?? 0) >= 50 && (v.health_score ?? 0) < 80).length;
  const critical = vehicles.filter(v => (v.health_score ?? 0) < 50).length;
  const criticalVehicles = vehicles.filter(v => (v.health_score ?? 0) < 40);

  // Map initialization (only if vehicles have location)
  const hasLocationData = vehicles.some(v => v.lat && v.lng);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!hasLocationData || !mapboxToken || !mapContainerRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [0, 0],
      zoom: 5,
      accessToken: mapboxToken,
    });

    map.on('load', () => {
      vehicles.forEach(v => {
        if (v.lat && v.lng) {
          new mapboxgl.Marker()
            .setLngLat([v.lng, v.lat])
            .setPopup(new mapboxgl.Popup().setHTML(`<strong>${v.make} ${v.model}</strong><br/>${v.license_plate}<br/>Health: ${v.health_score ?? 'N/A'}%`))
            .addTo(map);
        }
      });

      const bounds = vehicles.filter(v => v.lat && v.lng).map(v => [v.lng!, v.lat!] as [number, number]);
      if (bounds.length) {
        const lngBounds = new mapboxgl.LngLatBounds(bounds[0], bounds[0]);
        bounds.forEach(b => lngBounds.extend(b));
        map.fitBounds(lngBounds, { padding: 50 });
      }
    });

    mapInstanceRef.current = map;
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [hasLocationData, vehicles, mapboxToken]);

  // Refresh handler
  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  if (loading && !refreshing) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading dashboard...</p>
        <style jsx>{`
          .spinner {
            border: 3px solid ${theme.colors.border.medium};
            border-top: 3px solid ${theme.colors.primary};
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

  if (error && !refreshing) {
    return (
      <div style={styles.centered}>
        <p style={{ color: theme.colors.error }}>Error: {error}</p>
        <button onClick={handleRefresh} style={styles.retryButton}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>Welcome back to your fleet overview</p>
        </div>
        <button onClick={handleRefresh} style={styles.refreshButton} disabled={refreshing}>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <motion.div whileHover={{ y: -5 }} style={styles.statCard}>
          <Truck size={24} color={theme.colors.info} />
          <div>
            <span style={styles.statValue}>{total}</span>
            <span style={styles.statLabel}>Total Vehicles</span>
          </div>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} style={styles.statCard}>
          <CheckCircle size={24} color={theme.colors.status.healthy} />
          <div>
            <span style={styles.statValue}>{healthy}</span>
            <span style={styles.statLabel}>Healthy</span>
          </div>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} style={styles.statCard}>
          <AlertTriangle size={24} color={theme.colors.status.warning} />
          <div>
            <span style={styles.statValue}>{warning}</span>
            <span style={styles.statLabel}>Warning</span>
          </div>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} style={styles.statCard}>
          <AlertTriangle size={24} color={theme.colors.status.critical} />
          <div>
            <span style={styles.statValue}>{critical}</span>
            <span style={styles.statLabel}>Critical</span>
          </div>
        </motion.div>
      </div>

      {/* Fleet List (New Section) */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <Truck size={20} color={theme.colors.primary} />
          <h2 style={styles.cardTitle}>Your Fleet</h2>
          <button onClick={() => router.push('/vehicles/add')} style={styles.smallButton}>
            <Plus size={16} /> Add Vehicle
          </button>
        </div>
        {vehicles.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No vehicles added yet.</p>
            <button onClick={() => router.push('/vehicles/add')} style={styles.primaryButton}>
              Add your first vehicle
            </button>
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
                    <td>
                      <span style={{
                        ...styles.healthBadge,
                        backgroundColor: (vehicle.health_score ?? 0) >= 80 ? '#22c55e20' : (vehicle.health_score ?? 0) >= 50 ? '#f59e0b20' : '#ef444420',
                        color: (vehicle.health_score ?? 0) >= 80 ? '#22c55e' : (vehicle.health_score ?? 0) >= 50 ? '#f59e0b' : '#ef4444',
                      }}>
                        {vehicle.health_score ?? '—'}%
                      </span>
                    </td>
                    <td>{vehicle.year ?? '—'}</td>
                    <td>{vehicle.mileage?.toLocaleString() ?? '—'} mi</td>
                    <td>
                      <button onClick={() => router.push(`/vehicles/${vehicle.license_plate}`)} style={styles.iconButton} title="View Details">
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
          <MapPin size={20} color={theme.colors.primary} />
          <h2 style={styles.cardTitle}>Fleet Geospatial View</h2>
        </div>
        {hasLocationData && mapboxToken ? (
          <div ref={mapContainerRef} style={{ height: '300px', borderRadius: theme.borderRadius.lg, overflow: 'hidden' }} />
        ) : (
          <div style={styles.emptyState}>
            <p>No location data available or Mapbox token missing. Add addresses to your vehicles to see them on the map.</p>
            <button onClick={() => router.push('/vehicles/add')} style={styles.smallButton}>
              <Plus size={16} /> Add vehicle with location
            </button>
          </div>
        )}
      </div>

      {/* Two-column: Reminders & Predictions */}
      <div style={styles.twoColumn}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Calendar size={20} color={theme.colors.primary} />
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
                  {rem.vehicle && (
                    <span style={styles.vehicleTag}>
                      {rem.vehicle.make} {rem.vehicle.model}
                    </span>
                  )}
                  <div style={styles.reminderMeta}>
                    {rem.due_date && <span>Due: {new Date(rem.due_date).toLocaleDateString()}</span>}
                    {rem.due_mileage && <span> at {rem.due_mileage.toLocaleString()} mi</span>}
                  </div>
                </div>
              ))}
              <button onClick={() => router.push('/service-reminders')} style={styles.linkButton}>
                View all reminders
              </button>
            </div>
          )}
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <TrendingUp size={20} color={theme.colors.primary} />
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
                  <div style={styles.predictionMeta}>
                    Estimated maintenance in {pred.predicted_days} days
                  </div>
                </div>
              ))}
              <button onClick={() => router.push('/diagnostics')} style={styles.linkButton}>
                View detailed predictions
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalVehicles.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <AlertTriangle size={20} color={theme.colors.status.critical} />
            <h2 style={styles.cardTitle}>Critical Alerts</h2>
          </div>
          <div style={styles.alertsList}>
            {criticalVehicles.map(v => (
              <div key={v.id} style={styles.alertItem}>
                <Car size={16} color={theme.colors.status.critical} />
                <span>{v.make} {v.model} ({v.license_plate}) – Health: {v.health_score}%</span>
                <button onClick={() => router.push(`/vehicles/${v.license_plate}`)} style={styles.linkButton}>
                  View Details
                </button>
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
    padding: theme.spacing[8],
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: theme.colors.text.primary,
    fontFamily: theme.fontFamilies.sans,
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[6],
    flexWrap: 'wrap',
    gap: theme.spacing[4],
  },
  title: {
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.bold,
    marginBottom: theme.spacing[1],
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: theme.fontSizes.base,
    color: theme.colors.text.secondary,
  },
  refreshButton: {
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.lg,
    color: theme.colors.text.primary,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  statCard: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[3],
    cursor: 'default',
  },
  statValue: {
    fontSize: theme.fontSizes['2xl'],
    fontWeight: theme.fontWeights.bold,
    display: 'block',
    color: theme.colors.text.primary,
  },
  statLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.muted,
  },
  card: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[5],
    marginBottom: theme.spacing[6],
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[4],
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.text.primary,
    flex: 1,
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: theme.fontSizes.sm,
  },
  healthBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
  },
  iconButton: {
    background: 'transparent',
    border: 'none',
    color: theme.colors.primary,
    cursor: 'pointer',
    padding: theme.spacing[1],
    borderRadius: theme.borderRadius.md,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing[6],
    color: theme.colors.text.muted,
  },
  primaryButton: {
    marginTop: theme.spacing[3],
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    color: theme.colors.background.main,
    fontWeight: theme.fontWeights.medium,
    cursor: 'pointer',
  },
  smallButton: {
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    color: theme.colors.background.main,
    fontSize: theme.fontSizes.sm,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  linkButton: {
    marginTop: theme.spacing[2],
    background: 'transparent',
    border: 'none',
    color: theme.colors.primary,
    cursor: 'pointer',
    fontSize: theme.fontSizes.sm,
    textDecoration: 'underline',
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: theme.spacing[6],
    marginBottom: theme.spacing[6],
  },
  reminderItem: {
    marginBottom: theme.spacing[3],
    paddingBottom: theme.spacing[2],
    borderBottom: `1px solid ${theme.colors.border.light}`,
  },
  vehicleTag: {
    display: 'inline-block',
    marginLeft: theme.spacing[2],
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.muted,
  },
  reminderMeta: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.muted,
    marginTop: theme.spacing[1],
  },
  predictionItem: {
    marginBottom: theme.spacing[3],
    paddingBottom: theme.spacing[2],
    borderBottom: `1px solid ${theme.colors.border.light}`,
  },
  predictionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing[1],
  },
  predictionCost: {
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.primary,
  },
  predictionMeta: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.muted,
  },
  alertsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[2],
  },
  alertItem: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
    flexWrap: 'wrap',
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors.text.secondary,
  },
  retryButton: {
    marginTop: theme.spacing[4],
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    color: theme.colors.background.main,
    cursor: 'pointer',
  },
};