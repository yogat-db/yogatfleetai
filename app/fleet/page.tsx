// app/fleet/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Trash2, Edit, Car, ChevronRight, Activity, 
  History, Info, Loader2, Calendar, CheckCircle, AlertCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import toast from 'react-hot-toast';

// ==================== TYPES ====================
type Vehicle = {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  year: number | null;
  mileage: number | null;
  status: string;
  health_score: number | null;
  mot_expiry: string | null;
  mot_status: 'valid' | 'expired' | 'unknown' | null;
};

// ==================== MAIN COMPONENT ====================
export default function FleetPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('health_score', { ascending: true });

      if (error) throw error;
      setVehicles(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const stats = useMemo(() => ({
    total: vehicles.length,
    healthy: vehicles.filter(v => (v.health_score ?? 0) >= 80).length,
    warning: vehicles.filter(v => (v.health_score ?? 0) >= 50 && (v.health_score ?? 0) < 80).length,
    critical: vehicles.filter(v => (v.health_score ?? 0) < 50).length,
  }), [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch =
        v.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${v.make} ${v.model}`.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesStatus = true;
      if (filterStatus === 'healthy') matchesStatus = (v.health_score ?? 0) >= 80;
      else if (filterStatus === 'warning') matchesStatus = (v.health_score ?? 0) >= 50 && (v.health_score ?? 0) < 80;
      else if (filterStatus === 'critical') matchesStatus = (v.health_score ?? 0) < 50;
      
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchTerm, filterStatus]);

  const handleDeleteVehicle = async (id: string) => {
    const previousVehicles = [...vehicles];
    setVehicles(prev => prev.filter(v => v.id !== id));
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) {
      setVehicles(previousVehicles);
      setError('Failed to delete vehicle. Please try again.');
      toast.error('Delete failed');
    } else {
      toast.success('Vehicle removed');
    }
  };

  const syncMOT = async (vehicleId: string, registration: string) => {
    toast.loading('Checking MOT...', { id: 'mot-sync' });
    try {
      const res = await fetch('/api/mot/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, registration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'MOT sync failed');
      toast.success(`MOT ${data.status === 'valid' ? 'valid' : 'expired'}`, { id: 'mot-sync' });
      fetchVehicles(); // refresh list to show updated status
    } catch (err: any) {
      toast.error(err.message, { id: 'mot-sync' });
    }
  };

  if (loading) return <LoadingState />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Asset Management</h1>
          <p style={styles.subtitle}>Fleet telemetry and lifecycle tracking</p>
        </div>
        <button onClick={() => router.push('/vehicles/add')} style={styles.addButton}>
          <Plus size={18} /> Add Vehicle
        </button>
      </header>

      <div style={styles.statsGrid}>
        <StatCard label="Active Fleet" value={stats.total} color={theme.colors.text.primary} />
        <StatCard label="Optimal" value={stats.healthy} color={theme.colors.status.healthy} />
        <StatCard label="At Risk" value={stats.warning} color={theme.colors.status.warning} />
        <StatCard label="Critical" value={stats.critical} color={theme.colors.status.critical} />
      </div>

      <div style={styles.controlRow}>
        <div style={styles.searchBar}>
          <Search size={18} color={theme.colors.text.muted} />
          <input
            type="text"
            placeholder="Search by license plate or model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.filterTabs}>
          {(['all', 'healthy', 'warning', 'critical'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                ...styles.filterTab,
                ...(filterStatus === s ? styles.filterTabActive : {}),
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {filteredVehicles.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={styles.empty}>
            <Car size={48} color={theme.colors.border.medium} strokeWidth={1} />
            <p>No assets found in current segment.</p>
          </motion.div>
        ) : (
          <div style={styles.grid}>
            {filteredVehicles.map((vehicle) => (
              <SwipeableCard
                key={vehicle.id}
                vehicle={vehicle}
                onDelete={() => handleDeleteVehicle(vehicle.id)}
                onEdit={() => router.push(`/vehicles/edit/${vehicle.id}`)}
                onView={() => router.push(`/vehicles/${vehicle.license_plate}`)}
                onMOTSync={() => syncMOT(vehicle.id, vehicle.license_plate)}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}

// ==================== SUB-COMPONENTS ====================

interface StatCardProps { label: string; value: number; color: string; }
function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div style={styles.statCard}>
      <span style={styles.statLabel}>{label}</span>
      <span style={{ ...styles.statValue, color }}>{value}</span>
    </div>
  );
}

interface SwipeableCardProps {
  vehicle: Vehicle;
  onDelete: () => void;
  onEdit: () => void;
  onView: () => void;
  onMOTSync: () => void;
}

function SwipeableCard({ vehicle, onDelete, onEdit, onView, onMOTSync }: SwipeableCardProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const getHealthMeta = (score: number | null) => {
    if (score === null) return { color: theme.colors.text.muted, label: 'Incomplete' };
    if (score >= 80) return { color: theme.colors.status.healthy, label: 'Optimal' };
    if (score >= 50) return { color: theme.colors.status.warning, label: 'Warning' };
    return { color: theme.colors.status.critical, label: 'Critical' };
  };

  const healthMeta = getHealthMeta(vehicle.health_score);
  const motMeta = (() => {
    if (!vehicle.mot_status || vehicle.mot_status === 'unknown') return { color: theme.colors.text.muted, label: '?', icon: null };
    if (vehicle.mot_status === 'valid') return { color: theme.colors.status.healthy, label: 'MOT ✓', icon: CheckCircle };
    return { color: theme.colors.status.critical, label: 'MOT ✗', icon: AlertCircle };
  })();
  const MotIcon = motMeta.icon;

  const handleDragEnd = () => {
    if (dragX <= -80) setDragX(-180);
    else setDragX(0);
    setIsDragging(false);
  };

  const handleDrag = (info: any) => {
    const newX = info.offset.x;
    if (newX < 0) setDragX(Math.max(-180, newX));
    else setDragX(0);
  };

  return (
    <div style={styles.cardWrapper}>
      {/* Background Actions (Revealed on Swipe) */}
      <div style={styles.actionLayer}>
        <div style={{ ...styles.bgBtn, background: '#3b82f6' }} onClick={onEdit}><Edit size={20} /></div>
        <div style={{ ...styles.bgBtn, background: '#f59e0b' }} onClick={onMOTSync}><Calendar size={20} /></div>
        <div style={{ ...styles.bgBtn, background: '#ef4444' }} onClick={onDelete}><Trash2 size={20} /></div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -180, right: 0 }}
        dragElastic={0.1}
        onDrag={(_, info) => handleDrag(info)}
        onDragEnd={handleDragEnd}
        onDragStart={() => setIsDragging(true)}
        animate={{ x: dragX }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={() => !isDragging && dragX === 0 && onView()}
        style={styles.card}
      >
        <div style={styles.cardContent}>
          <div style={styles.cardHeader}>
            <span style={styles.platePill}>{vehicle.license_plate}</span>
            <div style={{ ...styles.healthBadge, backgroundColor: `${healthMeta.color}15`, color: healthMeta.color }}>
              <Activity size={12} /> {vehicle.health_score ?? 0}%
            </div>
            {MotIcon && (
              <div style={{ ...styles.healthBadge, backgroundColor: `${motMeta.color}15`, color: motMeta.color }}>
                <MotIcon size={12} /> {motMeta.label}
              </div>
            )}
          </div>
          <h3 style={styles.vehicleTitle}>{vehicle.make} {vehicle.model}</h3>
          <div style={styles.metaRow}>
            <div style={styles.metaItem}><History size={14} /> {vehicle.mileage?.toLocaleString() ?? '0'} mi</div>
            <div style={styles.metaItem}><Info size={14} /> {vehicle.year ?? '—'}</div>
          </div>
        </div>
        <ChevronRight size={20} color={theme.colors.border.medium} />
      </motion.div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={styles.centered}>
      <Loader2 size={40} color={theme.colors.primary} className="animate-spin" />
      <p style={{ marginTop: 16, fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', opacity: 0.6 }}>SYNCING FLEET ENGINE</p>
    </div>
  );
}

// ==================== STYLES (theme‑aware) ====================
const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: theme.colors.background.main, minHeight: '100vh', color: theme.colors.text.primary },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' },
  title: { fontSize: '32px', fontWeight: '800', background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' },
  subtitle: { color: theme.colors.text.secondary, fontSize: '14px' },
  addButton: { background: theme.colors.primary, color: theme.colors.background.main, border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '32px' },
  statCard: { background: theme.colors.background.card, border: `1px solid ${theme.colors.border.light}`, borderRadius: '16px', padding: '20px' },
  statLabel: { fontSize: '10px', fontWeight: 'bold', color: theme.colors.text.muted, textTransform: 'uppercase', letterSpacing: '1px' },
  statValue: { fontSize: '24px', fontWeight: '900', display: 'block', marginTop: '4px' },
  controlRow: { display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', alignItems: 'center' },
  searchBar: { flex: 1, background: theme.colors.background.card, border: `1px solid ${theme.colors.border.light}`, borderRadius: '12px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '12px' },
  searchInput: { flex: 1, background: 'transparent', border: 'none', padding: '14px 0', color: theme.colors.text.primary, outline: 'none' },
  filterTabs: { display: 'flex', gap: '4px', background: theme.colors.background.card, padding: '4px', borderRadius: '12px', border: `1px solid ${theme.colors.border.light}` },
  filterTab: { background: 'transparent', border: 'none', color: theme.colors.text.secondary, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize' },
  filterTabActive: { background: theme.colors.background.subtle, color: theme.colors.text.primary },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' },
  cardWrapper: { position: 'relative', background: theme.colors.background.card, borderRadius: '24px', overflow: 'hidden' },
  actionLayer: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '180px', display: 'flex', zIndex: 1 },
  bgBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' },
  card: { background: theme.colors.background.card, border: `1px solid ${theme.colors.border.light}`, padding: '24px', borderRadius: '24px', display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative', zIndex: 2 },
  cardContent: { flex: 1 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap', gap: '8px' },
  platePill: { fontFamily: theme.fontFamilies.mono, background: theme.colors.background.subtle, color: theme.colors.text.secondary, padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' },
  healthBadge: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '900', padding: '4px 8px', borderRadius: '8px' },
  vehicleTitle: { fontSize: '20px', fontWeight: '800', marginBottom: '16px', color: theme.colors.text.primary },
  metaRow: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  metaItem: { fontSize: '13px', color: theme.colors.text.muted, display: 'flex', alignItems: 'center', gap: '6px' },
  centered: { height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  empty: { gridColumn: '1 / -1', padding: '80px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: theme.colors.text.muted }
};