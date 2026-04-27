'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Plus, Search, AlertTriangle, CheckCircle, 
  Trash2, Edit, Car, ChevronRight, Activity, 
  History, Info, Loader2 
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

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
        .order('health_score', { ascending: true }); // Prioritize critical assets

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

  // Derivative Analytics & Filtering
  const stats = useMemo(() => ({
    total: vehicles.length,
    healthy: vehicles.filter(v => (v.health_score || 0) >= 80).length,
    warning: vehicles.filter(v => (v.health_score || 0) >= 50 && (v.health_score || 0) < 80).length,
    critical: vehicles.filter(v => (v.health_score || 0) < 50).length,
  }), [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch =
        v.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${v.make} ${v.model}`.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesStatus = true;
      if (filterStatus === 'healthy') matchesStatus = (v.health_score || 0) >= 80;
      else if (filterStatus === 'warning') matchesStatus = (v.health_score || 0) >= 50 && (v.health_score || 0) < 80;
      else if (filterStatus === 'critical') matchesStatus = (v.health_score || 0) < 50;
      
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchTerm, filterStatus]);

  if (loading) return <LoadingState />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      
      {/* 1. BRANDED HEADER */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Asset Management</h1>
          <p style={styles.subtitle}>Fleet telemetry and lifecycle tracking</p>
        </div>
        <button onClick={() => router.push('/vehicles/add')} style={styles.addButton}>
          <Plus size={18} /> Add Vehicle
        </button>
      </header>

      {/* 2. KPI STRIP */}
      <div style={styles.statsGrid}>
        <StatCard label="Active Fleet" value={stats.total} color={theme.colors.text.primary} />
        <StatCard label="Optimal" value={stats.healthy} color={theme.colors.status.healthy} />
        <StatCard label="At Risk" value={stats.warning} color={theme.colors.status.warning} />
        <StatCard label="Critical" value={stats.critical} color={theme.colors.status.critical} />
      </div>

      {/* 3. SEARCH & CONTROL BAR */}
      <div style={styles.controlRow}>
        <div style={styles.searchBar}>
          <Search size={18} color="#64748b" />
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

      {/* 4. ASSET GRID */}
      <AnimatePresence mode="popLayout">
        {filteredVehicles.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={styles.empty}>
            <Car size={48} color="#1e293b" strokeWidth={1} />
            <p>No assets found in current segment.</p>
          </motion.div>
        ) : (
          <div style={styles.grid}>
            {filteredVehicles.map((vehicle) => (
              <SwipeableCard
                key={vehicle.id}
                vehicle={vehicle}
                onDelete={fetchVehicles}
                onEdit={() => router.push(`/vehicles/edit/${vehicle.id}`)}
                onView={() => router.push(`/vehicles/${vehicle.license_plate}`)}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ==================== SUB-COMPONENTS ====================

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={styles.statCard}>
      <span style={styles.statLabel}>{label}</span>
      <span style={{ ...styles.statValue, color }}>{value}</span>
    </div>
  );
}

function SwipeableCard({ vehicle, onDelete, onEdit, onView }: any) {
  const [dragX, setDragX] = useState(0);

  const getHealthMeta = (score: number | null) => {
    if (score === null) return { color: '#64748b', label: 'Incomplete' };
    if (score >= 80) return { color: theme.colors.status.healthy, label: 'Optimal' };
    if (score >= 50) return { color: theme.colors.status.warning, label: 'Warning' };
    return { color: theme.colors.status.critical, label: 'Critical' };
  };

  const meta = getHealthMeta(vehicle.health_score);

  const handleDelete = async () => {
    if (confirm(`Permanently remove ${vehicle.license_plate}?`)) {
      const { error } = await supabase.from('vehicles').delete().eq('id', vehicle.id);
      if (!error) onDelete();
    }
  };

  return (
    <div style={styles.cardWrapper}>
      {/* Background Actions (Revealed on Swipe) */}
      <div style={styles.actionLayer}>
        <div style={{ ...styles.bgBtn, background: '#3b82f6' }} onClick={onEdit}><Edit size={20} /></div>
        <div style={{ ...styles.bgBtn, background: '#ef4444' }} onClick={handleDelete}><Trash2 size={20} /></div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={0.1}
        onDrag={(e, info) => setDragX(info.offset.x)}
        onDragEnd={() => setDragX(0)}
        animate={{ x: dragX === 0 ? 0 : dragX }}
        onClick={() => dragX === 0 && onView()}
        style={styles.card}
      >
        <div style={styles.cardContent}>
          <div style={styles.cardHeader}>
            <span style={styles.platePill}>{vehicle.license_plate}</span>
            <div style={{ ...styles.healthBadge, backgroundColor: `${meta.color}15`, color: meta.color }}>
              <Activity size={12} /> {vehicle.health_score || 0}%
            </div>
          </div>
          
          <h3 style={styles.vehicleTitle}>{vehicle.make} {vehicle.model}</h3>
          
          <div style={styles.metaRow}>
            <div style={styles.metaItem}><History size={14} /> {vehicle.mileage?.toLocaleString() ?? '0'} mi</div>
            <div style={styles.metaItem}><Info size={14} /> {vehicle.year ?? '—'}</div>
          </div>
        </div>
        <ChevronRight size={20} color="#1e293b" />
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

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  title: { fontSize: '32px', fontWeight: '800', background: 'linear-gradient(to right, #fff, #64748b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' },
  subtitle: { color: '#64748b', fontSize: '14px' },
  addButton: { background: '#22c55e', color: '#020617', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' },
  statCard: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' },
  statLabel: { fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' },
  statValue: { fontSize: '24px', fontWeight: '900', display: 'block', marginTop: '4px' },
  controlRow: { display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' },
  searchBar: { flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '12px' },
  searchInput: { flex: 1, background: 'transparent', border: 'none', padding: '14px 0', color: '#fff', outline: 'none' },
  filterTabs: { display: 'flex', gap: '4px', background: '#0f172a', padding: '4px', borderRadius: '12px', border: '1px solid #1e293b' },
  filterTab: { background: 'transparent', border: 'none', color: '#64748b', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize' },
  filterTabActive: { background: '#1e293b', color: '#fff' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' },
  cardWrapper: { position: 'relative', background: '#0f172a', borderRadius: '24px', overflow: 'hidden' },
  actionLayer: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '120px', display: 'flex', zIndex: 1 },
  bgBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' },
  card: { background: '#0f172a', border: '1px solid #1e293b', padding: '24px', borderRadius: '24px', display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative', zIndex: 2 },
  cardContent: { flex: 1 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' },
  platePill: { fontFamily: 'monospace', background: '#1e293b', color: '#94a3b8', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' },
  healthBadge: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '900', padding: '4px 8px', borderRadius: '8px' },
  vehicleTitle: { fontSize: '20px', fontWeight: '800', marginBottom: '16px', color: '#f1f5f9' },
  metaRow: { display: 'flex', gap: '16px' },
  metaItem: { fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' },
  centered: { height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  empty: { gridColumn: '1 / -1', padding: '80px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: '#475569' }
};