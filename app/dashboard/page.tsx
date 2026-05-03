// app/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, CheckCircle, AlertTriangle, MapPin, Calendar,
  TrendingUp, Plus, Wrench, Car, Eye, RefreshCw, Loader2,
  Bell, X, Clock, Fuel, AlertCircle as AlertIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import toast from 'react-hot-toast';

const FleetMap = dynamic(
  () => import('@/components/FleetMap'),
  { ssr: false, loading: () => <div style={{ height: '300px', background: '#1e293b', borderRadius: '12px' }} /> }
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

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  created_at: string;
  read: boolean;
}

// Helper
const getHealthBadgeStyle = (score: number | null) => ({
  display: 'inline-block',
  padding: '4px 10px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: 600,
  backgroundColor: (score ?? 0) >= 80 ? '#22c55e20' : (score ?? 0) >= 50 ? '#f59e0b20' : '#ef444420',
  color: (score ?? 0) >= 80 ? '#22c55e' : (score ?? 0) >= 50 ? '#f59e0b' : '#ef4444',
});

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
  const [newReminder, setNewReminder] = useState({ title: '', due_date: '', due_mileage: '', vehicle_id: '' });
  const [addingReminder, setAddingReminder] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setRefreshing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Vehicles
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('id, license_plate, make, model, health_score, lat, lng, year, mileage')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setVehicles(vehiclesData || []);

      // Reminders
      const { data: rawReminders } = await supabase
        .from('reminders')
        .select('id, title, due_date, due_mileage, vehicle_id')
        .eq('completed', false)
        .order('due_date', { ascending: true })
        .limit(10);
      if (rawReminders?.length) {
        const vehicleIds = rawReminders.map(r => r.vehicle_id).filter(Boolean);
        let vehicleMap = new Map();
        if (vehicleIds.length) {
          const { data: vehiclesLookup } = await supabase
            .from('vehicles')
            .select('id, make, model, license_plate')
            .in('id', vehicleIds);
          if (vehiclesLookup) vehicleMap = new Map(vehiclesLookup.map(v => [v.id, v]));
        }
        setReminders(rawReminders.map(r => ({
          id: r.id,
          title: r.title,
          due_date: r.due_date,
          due_mileage: r.due_mileage,
          vehicle: r.vehicle_id ? vehicleMap.get(r.vehicle_id) : undefined,
        })));
      } else setReminders([]);

      // AI predictions
      if (vehiclesData?.length) {
        try {
          const predRes = await fetch('/api/ai/predictive-maintenance');
          if (predRes.ok) setPredictions(await predRes.json());
          else setPredictions([]);
        } catch { setPredictions([]); }
      } else setPredictions([]);

      // Notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (notifs) {
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowNotifications(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark notification as read
  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(notifs => notifs.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Add reminder
  const handleAddReminder = async () => {
    if (!newReminder.title.trim()) { toast.error('Please enter a reminder title'); return; }
    setAddingReminder(true);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newReminder.title,
          due_date: newReminder.due_date || null,
          due_mileage: newReminder.due_mileage ? parseInt(newReminder.due_mileage) : null,
          vehicle_id: newReminder.vehicle_id || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to add reminder');
      toast.success('Reminder added!');
      setNewReminder({ title: '', due_date: '', due_mileage: '', vehicle_id: '' });
      setShowReminderForm(false);
      fetchData(); // refresh
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAddingReminder(false);
    }
  };

  
  // MOT Check (opens GOV.UK MOT history)
  const handleMOTCheck = (licensePlate?: string) => {
    const reg = licensePlate || prompt('Enter vehicle registration for MOT check:');
    if (reg) window.open(`https://www.gov.uk/check-mot-history?registration=${encodeURIComponent(reg)}`, '_blank');
  };

  // Health scores update
  const refreshHealthScores = async () => {
    setUpdatingScores(true);
    try {
      const res = await fetch('/api/vehicles/update-health-scores', { method: 'POST' });
      const data = await res.json();
      if (res.ok) toast.success(`Updated scores for ${data.updated} vehicles`);
      else toast.error(data.error);
      fetchData();
    } catch { toast.error('Failed to update scores'); }
    finally { setUpdatingScores(false); }
  };

  const total = vehicles.length;
  const healthy = vehicles.filter(v => (v.health_score ?? 0) >= 80).length;
  const warning = vehicles.filter(v => (v.health_score ?? 0) >= 50 && (v.health_score ?? 0) < 80).length;
  const critical = vehicles.filter(v => (v.health_score ?? 0) < 50).length;
  const hasLocationData = vehicles.some(v => v.lat && v.lng);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (loading && !refreshing) return (<div style={styles.centered}><div className="spinner" /><p>Loading...</p></div>);
  if (error) return (<div style={styles.centered}><p style={{ color: '#ef4444' }}>Error: {error}</p><button onClick={() => fetchData()} style={styles.retryButton}>Retry</button></div>);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      {/* Header with Notifications dropdown */}
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>Fleet overview & maintenance planner</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={refreshHealthScores} disabled={updatingScores} style={styles.iconButton}>
            {updatingScores ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
          </button>
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button onClick={() => setShowNotifications(!showNotifications)} style={styles.iconButton}>
              <Bell size={18} />
              {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
            </button>
            {showNotifications && (
              <div style={styles.notifDropdown}>
                {notifications.length === 0 ? <div style={{ padding: '12px', color: '#94a3b8' }}>No notifications</div> :
                  notifications.map(n => (
                    <div key={n.id} style={{ ...styles.notifItem, opacity: n.read ? 0.6 : 1 }} onClick={() => markAsRead(n.id)}>
                      <AlertIcon size={14} color={n.type === 'critical' ? '#ef4444' : n.type === 'warning' ? '#f59e0b' : '#22c55e'} />
                      <span style={{ fontSize: '13px' }}>{n.message}</span>
                      <span style={{ fontSize: '10px', color: '#64748b', marginLeft: 'auto' }}>{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}><Truck size={22} /><div><span style={styles.statValue}>{total}</span><span>Vehicles</span></div></div>
        <div style={styles.statCard}><CheckCircle size={22} color="#22c55e" /><div><span style={styles.statValue}>{healthy}</span><span>Healthy</span></div></div>
        <div style={styles.statCard}><AlertTriangle size={22} color="#f59e0b" /><div><span style={styles.statValue}>{warning}</span><span>Warning</span></div></div>
        <div style={styles.statCard}><AlertTriangle size={22} color="#ef4444" /><div><span style={styles.statValue}>{critical}</span><span>Critical</span></div></div>
      </div>

      {/* Fleet Table */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <Truck size={20} /><h2 style={styles.cardTitle}>Your Fleet</h2>
          <button onClick={() => router.push('/vehicles/add')} style={styles.smallButton}><Plus size={14} /> Add Vehicle</button>
        </div>
        {vehicles.length === 0 ? (
          <div style={styles.emptyState}><p>No vehicles yet.</p><button onClick={() => router.push('/vehicles/add')} style={styles.primaryButton}>Add first vehicle</button></div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead><tr><th>Make & Model</th><th>Reg</th><th>Health</th><th>Year</th><th>Mileage</th><th>Actions</th></tr></thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id}>
                    <td>{v.make} {v.model}</td>
                    <td>{v.license_plate}</td>
                    <td><span style={getHealthBadgeStyle(v.health_score)}>{v.health_score ?? '—'}%</span></td>
                    <td>{v.year ?? '—'}</td>
                    <td>{v.mileage?.toLocaleString() ?? '—'} mi</td>
                    <td><button onClick={() => router.push(`/vehicles/${v.license_plate}`)} style={styles.iconButton}><Eye size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Map */}
      <div style={styles.card}>
        <div style={styles.cardHeader}><MapPin size={20} /><h2 style={styles.cardTitle}>Live Fleet Map</h2></div>
        {hasLocationData && mapboxToken ? <FleetMap vehicles={vehicles} /> : <div style={styles.emptyState}>No location data available. Add addresses to vehicles.</div>}
      </div>

      {/* Reminders & Predictions */}
      <div style={styles.twoColumn}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Calendar size={20} /><h2 style={styles.cardTitle}>Service Reminders</h2>
            <button onClick={() => setShowReminderForm(!showReminderForm)} style={styles.smallButton}><Plus size={14} /> Add</button>
          </div>
          {showReminderForm && (
            <div style={styles.reminderForm}>
              <input type="text" placeholder="Reminder title (e.g., Oil change)" value={newReminder.title} onChange={e => setNewReminder({ ...newReminder, title: e.target.value })} style={styles.input} />
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input type="date" placeholder="Due date" value={newReminder.due_date} onChange={e => setNewReminder({ ...newReminder, due_date: e.target.value })} style={styles.inputSmall} />
                <input type="number" placeholder="Due mileage" value={newReminder.due_mileage} onChange={e => setNewReminder({ ...newReminder, due_mileage: e.target.value })} style={styles.inputSmall} />
                <select value={newReminder.vehicle_id} onChange={e => setNewReminder({ ...newReminder, vehicle_id: e.target.value })} style={styles.inputSmall}>
                  <option value="">All vehicles</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model}</option>)}
                </select>
              </div>
              <button onClick={handleAddReminder} disabled={addingReminder} style={styles.primaryButton}>{addingReminder ? 'Adding...' : 'Save Reminder'}</button>
            </div>
          )}
          {reminders.length === 0 ? <div style={styles.emptyState}>No reminders. Add one above.</div> :
            reminders.map(rem => (
              <div key={rem.id} style={styles.reminderItem}>
                <div><strong>{rem.title}</strong> {rem.vehicle && <span style={styles.vehicleTag}>{rem.vehicle.make} {rem.vehicle.model}</span>}</div>
                <div style={styles.reminderMeta}>
                  {rem.due_date && <span><Calendar size={12} /> {new Date(rem.due_date).toLocaleDateString()}</span>}
                  {rem.due_mileage && <span><Fuel size={12} /> {rem.due_mileage.toLocaleString()} mi</span>}
                </div>
              </div>
            ))}
          <div style={{ marginTop: '12px' }}>
            <button onClick={() => handleMOTCheck()} style={styles.linkButton}>🔧 Check MOT reminder</button>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}><TrendingUp size={20} /><h2 style={styles.cardTitle}>AI Maintenance Predictions</h2></div>
          {predictions.length === 0 ? <div style={styles.emptyState}>No predictions yet.</div> :
            predictions.slice(0, 5).map(p => (
              <div key={p.vehicle_id} style={styles.predictionItem}>
                <strong>{p.make} {p.model} ({p.license_plate})</strong>
                <span style={styles.predictionCost}>£{p.predicted_cost}</span>
                <div style={styles.predictionMeta}>in {p.predicted_days} days</div>
              </div>
            ))}
          <button onClick={() => router.push('/diagnostics')} style={styles.linkButton}>Detailed diagnostics →</button>
        </div>
      </div>

      <style>{`
        .spinner { border: 2px solid #334155; border-top-color: #22c55e; border-radius: 50%; width: 32px; height: 32px; animation: spin 0.8s linear infinite; margin-bottom: 1rem; }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}

// Styles (responsive, clean)
const styles: Record<string, React.CSSProperties> = {
  page: { padding: 'clamp(16px, 4vw, 32px)', background: theme.colors.background.main, minHeight: '100vh', fontFamily: theme.fontFamilies.sans },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' },
  title: { fontSize: 'clamp(24px, 6vw, 32px)', fontWeight: 800, background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '4px' },
  subtitle: { fontSize: 'clamp(12px, 4vw, 14px)', color: theme.colors.text.secondary },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { background: theme.colors.background.card, border: `1px solid ${theme.colors.border.light}`, borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' },
  statValue: { fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 800, display: 'block', lineHeight: 1 },
  card: { background: theme.colors.background.card, border: `1px solid ${theme.colors.border.light}`, borderRadius: '20px', padding: '20px', marginBottom: '24px' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' },
  cardTitle: { fontSize: '18px', fontWeight: 600, flex: 1 },
  smallButton: { background: `${theme.colors.primary}15`, border: `1px solid ${theme.colors.primary}30`, borderRadius: '30px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: theme.colors.primary, cursor: 'pointer' },
  iconButton: { background: theme.colors.background.subtle, border: `1px solid ${theme.colors.border.medium}`, borderRadius: '10px', padding: '8px', cursor: 'pointer', color: theme.colors.text.secondary, position: 'relative' },
  badge: { position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', borderRadius: '10px', fontSize: '10px', padding: '2px 5px', minWidth: '16px', textAlign: 'center' },
  notifDropdown: { position: 'absolute', top: '40px', right: 0, width: '280px', background: theme.colors.background.card, border: `1px solid ${theme.colors.border.light}`, borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', zIndex: 50, maxHeight: '300px', overflowY: 'auto' },
  notifItem: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderBottom: `1px solid ${theme.colors.border.light}`, cursor: 'pointer' },
  reminderForm: { background: theme.colors.background.subtle, borderRadius: '16px', padding: '16px', marginBottom: '16px' },
  input: { width: '100%', padding: '8px 12px', background: theme.colors.background.card, border: `1px solid ${theme.colors.border.medium}`, borderRadius: '8px', color: theme.colors.text.primary, marginBottom: '12px' },
  inputSmall: { flex: 1, padding: '8px 12px', background: theme.colors.background.card, border: `1px solid ${theme.colors.border.medium}`, borderRadius: '8px', color: theme.colors.text.primary },
  reminderItem: { marginBottom: '12px', paddingBottom: '8px', borderBottom: `1px solid ${theme.colors.border.light}` },
  vehicleTag: { background: theme.colors.border.light, padding: '2px 8px', borderRadius: '12px', fontSize: '11px', marginLeft: '8px' },
  reminderMeta: { fontSize: '12px', color: theme.colors.text.muted, display: 'flex', gap: '12px', marginTop: '4px' },
  linkButton: { background: 'none', border: 'none', color: theme.colors.primary, cursor: 'pointer', fontSize: '13px', marginTop: '8px' },
  primaryButton: { background: theme.colors.primary, border: 'none', borderRadius: '12px', padding: '10px 16px', color: '#020617', fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: '12px' },
  emptyState: { textAlign: 'center', padding: '24px', color: theme.colors.text.muted },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '500px' },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' },
  predictionItem: { background: theme.colors.background.subtle, borderRadius: '12px', padding: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
  predictionCost: { fontWeight: 700, color: theme.colors.primary },
  predictionMeta: { fontSize: '11px', color: theme.colors.text.muted, width: '100%', marginTop: '4px' },
  retryButton: { marginTop: '16px', padding: '8px 16px', background: theme.colors.primary, border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' },
  centered: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' },
};