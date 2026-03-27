'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Truck, CheckCircle, AlertTriangle, MapPin, Calendar, TrendingUp, Plus, Wrench, Car } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

// Mapbox (optional – if you have Mapbox token, you can show a real map)
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Types
interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  health_score: number | null;
  lat: number | null;
  lng: number | null;
}

interface Reminder {
  id: string;
  title: string;
  due_date: string | null;
  due_mileage: number | null;
  vehicle?: { make: string; model: string; license_plate: string };
}

interface Prediction {
  vehicleId: string;
  vehicleName: string;
  predictedCost: number;
  days: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLocationData, setHasLocationData] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, license_plate, make, model, health_score, lat, lng')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (vehiclesError) throw vehiclesError;
      setVehicles(vehiclesData || []);

      // Check if any vehicle has coordinates
      setHasLocationData(vehiclesData?.some(v => v.lat && v.lng) || false);

      // Fetch upcoming reminders – two‑step to avoid join issues
      const { data: rawReminders, error: remindersError } = await supabase
        .from('reminders')
        .select('id, title, due_date, due_mileage, vehicle_id')
        .eq('completed', false)
        .order('due_date', { ascending: true })
        .limit(5);

      if (remindersError) throw remindersError;

      if (rawReminders && rawReminders.length > 0) {
        const vehicleIds = rawReminders.map(r => r.vehicle_id).filter(Boolean);
        const { data: vehiclesData } = await supabase
          .from('vehicles')
          .select('id, make, model, license_plate')
          .in('id', vehicleIds);
        const vehicleMap = new Map(vehiclesData?.map(v => [v.id, v]) || []);
        const remindersWithVehicle = rawReminders.map(r => ({
          ...r,
          vehicle: r.vehicle_id ? vehicleMap.get(r.vehicle_id) : null,
        }));
        setReminders(remindersWithVehicle);
      } else {
        setReminders([]);
      }

      // Fetch AI predictions – replace with real endpoint if available
      // For demo, generate mock predictions based on vehicles
      const mockPredictions: Prediction[] = (vehiclesData || []).slice(0, 3).map(v => ({
        vehicleId: v.id,
        vehicleName: `${v.make} ${v.model}`,
        predictedCost: Math.floor(Math.random() * 500) + 200,
        days: Math.floor(Math.random() * 90) + 30,
      }));
      setPredictions(mockPredictions);
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Stats calculation
  const total = vehicles.length;
  const healthy = vehicles.filter(v => (v.health_score || 0) >= 80).length;
  const warning = vehicles.filter(v => (v.health_score || 0) >= 50 && (v.health_score || 0) < 80).length;
  const critical = vehicles.filter(v => (v.health_score || 0) < 50).length;

  // Critical alerts (health < 40)
  const criticalVehicles = vehicles.filter(v => (v.health_score || 0) < 40);

  // Map component (if Mapbox token is available)
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  useEffect(() => {
    if (!hasLocationData || !process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return;
    const mapContainer = document.getElementById('fleet-map');
    if (!mapContainer) return;
    const mapInstance = new mapboxgl.Map({
      container: 'fleet-map',
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [0, 0],
      zoom: 5,
      accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    });
    setMap(mapInstance);
    // Add markers for vehicles with coordinates
    vehicles.forEach(v => {
      if (v.lat && v.lng) {
        new mapboxgl.Marker()
          .setLngLat([v.lng, v.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>${v.make} ${v.model}</strong><br/>${v.license_plate}`))
          .addTo(mapInstance);
      }
    });
    // Fit bounds
    const bounds = vehicles.filter(v => v.lat && v.lng).map(v => [v.lng!, v.lat!] as [number, number]);
    if (bounds.length) {
      const lngBounds = new mapboxgl.LngLatBounds(bounds[0], bounds[0]);
      bounds.forEach(b => lngBounds.extend(b));
      mapInstance.fitBounds(lngBounds, { padding: 50 });
    }
    return () => mapInstance.remove();
  }, [hasLocationData, vehicles]);

  if (loading) {
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

  if (error) {
    return (
      <div style={styles.centered}>
        <p style={{ color: theme.colors.error }}>Error loading dashboard: {error}</p>
        <button onClick={fetchData} style={styles.retryButton}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.page}
    >
      <h1 style={styles.title}>Dashboard</h1>
      <p style={styles.subtitle}>Welcome back to your fleet overview</p>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <motion.div
          whileHover={{ y: -5 }}
          transition={{ type: 'spring', stiffness: 300 }}
          style={styles.statCard}
        >
          <Truck size={24} color={theme.colors.info} />
          <div>
            <span style={styles.statValue}>{total}</span>
            <span style={styles.statLabel}>Total Vehicles</span>
          </div>
        </motion.div>
        <motion.div
          whileHover={{ y: -5 }}
          transition={{ type: 'spring', stiffness: 300 }}
          style={styles.statCard}
        >
          <CheckCircle size={24} color={theme.colors.status.healthy} />
          <div>
            <span style={styles.statValue}>{healthy}</span>
            <span style={styles.statLabel}>Healthy</span>
          </div>
        </motion.div>
        <motion.div
          whileHover={{ y: -5 }}
          transition={{ type: 'spring', stiffness: 300 }}
          style={styles.statCard}
        >
          <AlertTriangle size={24} color={theme.colors.status.warning} />
          <div>
            <span style={styles.statValue}>{warning}</span>
            <span style={styles.statLabel}>Warning</span>
          </div>
        </motion.div>
        <motion.div
          whileHover={{ y: -5 }}
          transition={{ type: 'spring', stiffness: 300 }}
          style={styles.statCard}
        >
          <AlertTriangle size={24} color={theme.colors.status.critical} />
          <div>
            <span style={styles.statValue}>{critical}</span>
            <span style={styles.statLabel}>Critical</span>
          </div>
        </motion.div>
      </div>

      {/* Map Section */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <MapPin size={20} color={theme.colors.primary} />
          <h2 style={styles.cardTitle}>Fleet Geospatial View</h2>
        </div>
        {hasLocationData ? (
          <div id="fleet-map" style={{ height: '300px', borderRadius: theme.borderRadius.lg, overflow: 'hidden' }} />
        ) : (
          <div style={styles.emptyState}>
            <p>No location data available. Add an address when adding a vehicle to see it on the map.</p>
            <button onClick={() => router.push('/vehicles/add')} style={styles.smallButton}>
              <Plus size={16} /> Add vehicle with location
            </button>
          </div>
        )}
      </div>

      {/* Two‑column layout */}
      <div style={styles.twoColumn}>
        {/* Reminders */}
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

        {/* AI Predictions */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <TrendingUp size={20} color={theme.colors.primary} />
            <h2 style={styles.cardTitle}>AI Predictions</h2>
          </div>
          {predictions.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No predictions available. Predictions will appear as vehicles gather data.</p>
              <button onClick={() => router.push('/diagnostics')} style={styles.smallButton}>
                <Wrench size={16} /> View Diagnostics
              </button>
            </div>
          ) : (
            <div>
              {predictions.map(pred => (
                <div key={pred.vehicleId} style={styles.predictionItem}>
                  <div style={styles.predictionHeader}>
                    <strong>{pred.vehicleName}</strong>
                    <span style={styles.predictionCost}>£{pred.predictedCost}</span>
                  </div>
                  <div style={styles.predictionMeta}>
                    Estimated cost in {pred.days} days
                  </div>
                </div>
              ))}
              <button onClick={() => router.push('/diagnostics')} style={styles.linkButton}>
                View Details
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Critical Alerts */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <AlertTriangle size={20} color={theme.colors.status.critical} />
          <h2 style={styles.cardTitle}>Critical Alerts</h2>
        </div>
        {criticalVehicles.length === 0 ? (
          <p>No critical alerts – all vehicles are stable.</p>
        ) : (
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
        )}
      </div>
    </motion.div>
  );
}

// All styles are inline; no `:hover` pseudo‑class used
const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: theme.spacing[8],
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: theme.colors.text.primary,
    fontFamily: theme.fontFamilies.sans,
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
    marginBottom: theme.spacing[6],
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  statCard: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[3],
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
  },
  cardTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.text.primary,
  },
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing[4],
    color: theme.colors.text.muted,
  },
  smallButton: {
    marginTop: theme.spacing[2],
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
    gridTemplateColumns: '1fr 1fr',
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