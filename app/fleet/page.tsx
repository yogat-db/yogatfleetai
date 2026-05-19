'use client';

import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  type CSSProperties,
} from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Trash2,
  Edit,
  Car,
  ChevronRight,
  Activity,
  History,
  Info,
  Loader2,
  Calendar,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import toast from 'react-hot-toast';

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

type HealthFilter = 'all' | 'healthy' | 'warning' | 'critical';

const healthFilters: { value: HealthFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'healthy', label: 'Optimal' },
  { value: 'warning', label: 'At risk' },
  { value: 'critical', label: 'Critical' },
];

export default function FleetPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<HealthFilter>('all');

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error('Fleet auth error:', authError);
      }

      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('vehicles')
        .select(
          'id, license_plate, make, model, year, mileage, status, health_score, mot_expiry, mot_status'
        )
        .eq('user_id', user.id)
        .order('health_score', { ascending: true });

      if (error) throw error;
      setVehicles(data ?? []);
    } catch (err) {
      console.error('Fetch vehicles error:', err);
      setError('Unable to load fleet. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchVehicles();
  }, [fetchVehicles]);

  const stats = useMemo(
    () => ({
      total: vehicles.length,
      healthy: vehicles.filter((v) => (v.health_score ?? 0) >= 80).length,
      warning: vehicles.filter(
        (v) =>
          (v.health_score ?? 0) >= 50 && (v.health_score ?? 0) < 80
      ).length,
      critical: vehicles.filter((v) => (v.health_score ?? 0) < 50).length,
    }),
    [vehicles]
  );

  const filteredVehicles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return vehicles.filter((v) => {
      const matchesSearch =
        !term ||
        v.license_plate.toLowerCase().includes(term) ||
        `${v.make} ${v.model}`.toLowerCase().includes(term);

      let matchesStatus = true;
      const score = v.health_score ?? 0;

      if (filterStatus === 'healthy') matchesStatus = score >= 80;
      else if (filterStatus === 'warning')
        matchesStatus = score >= 50 && score < 80;
      else if (filterStatus === 'critical') matchesStatus = score < 50;

      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchTerm, filterStatus]);

  const handleDeleteVehicle = async (id: string) => {
    const previous = vehicles;
    setVehicles((prev) => prev.filter((v) => v.id !== id));

    const { error } = await supabase.from('vehicles').delete().eq('id', id);

    if (error) {
      console.error('Delete vehicle error:', error);
      setVehicles(previous);
      setError('Failed to delete vehicle. Please try again.');
      toast.error('Could not delete vehicle');
    } else {
      toast.success('Vehicle removed from fleet');
    }
  };

  const syncMOT = async (vehicleId: string, registration: string) => {
    toast.loading('Checking MOT status…', { id: 'mot-sync' });

    try {
      const res = await fetch('/api/mot/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, registration }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'MOT sync failed');
      }

      toast.success(
        data.status === 'valid' ? 'MOT valid' : 'MOT expired',
        { id: 'mot-sync' }
      );
      void fetchVehicles();
    } catch (err) {
      console.error('MOT sync error:', err);
      toast.error(
        err instanceof Error ? err.message : 'MOT sync failed',
        { id: 'mot-sync' }
      );
    }
  };

  if (loading) return <LoadingState />;

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={styles.page}
    >
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Fleet overview</h1>
          <p style={styles.subtitle}>
            Monitor asset health, MOT status, and lifecycle at a glance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/vehicles/add')}
          style={styles.addButton}
        >
          <Plus size={16} />
          <span>Add vehicle</span>
        </button>
      </header>

      {error && (
        <div style={styles.errorBanner} role="status">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <section aria-label="Fleet summary" style={styles.statsGrid}>
        <StatCard
          label="Active fleet"
          value={stats.total}
          tone="neutral"
        />
        <StatCard
          label="Optimal"
          value={stats.healthy}
          tone="healthy"
        />
        <StatCard
          label="At risk"
          value={stats.warning}
          tone="warning"
        />
        <StatCard
          label="Critical"
          value={stats.critical}
          tone="critical"
        />
      </section>

      <section aria-label="Filters and search" style={styles.controlRow}>
        <div style={styles.searchBar}>
          <Search size={16} color={theme.colors.text.muted} />
          <input
            type="search"
            placeholder="Search by registration, make, or model…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
            aria-label="Search vehicles"
          />
        </div>
        <nav
          aria-label="Health filter"
          style={styles.filterTabs}
        >
          {healthFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setFilterStatus(filter.value)}
              style={{
                ...styles.filterTab,
                ...(filterStatus === filter.value
                  ? styles.filterTabActive
                  : {}),
              }}
              aria-pressed={filterStatus === filter.value}
            >
              {filter.label}
            </button>
          ))}
        </nav>
      </section>

      <AnimatePresence mode="popLayout">
        {filteredVehicles.length === 0 ? (
          <motion.section
            key="empty"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.16 }}
            style={styles.empty}
            aria-label="No vehicles"
          >
            <Car
              size={40}
              color={theme.colors.border.medium}
              strokeWidth={1.5}
            />
            <h2 style={styles.emptyTitle}>No vehicles match this view</h2>
            <p style={styles.emptyBody}>
              Adjust your filters or add a vehicle to start building your
              fleet.
            </p>
            <button
              type="button"
              onClick={() => router.push('/vehicles/add')}
              style={styles.emptyCta}
            >
              <Plus size={14} />
              <span>Add vehicle</span>
            </button>
          </motion.section>
        ) : (
          <section
            key="grid"
            aria-label="Fleet list"
            style={styles.grid}
          >
            {filteredVehicles.map((vehicle) => (
              <SwipeableCard
                key={vehicle.id}
                vehicle={vehicle}
                onDelete={() => handleDeleteVehicle(vehicle.id)}
                onEdit={() =>
                  router.push(`/vehicles/edit/${vehicle.id}`)
                }
                onView={() =>
                  router.push(`/vehicles/${vehicle.license_plate}`)
                }
                onMOTSync={() =>
                  syncMOT(vehicle.id, vehicle.license_plate)
                }
              />
            ))}
          </section>
        )}
      </AnimatePresence>

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </motion.main>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  tone: 'neutral' | 'healthy' | 'warning' | 'critical';
}

function StatCard({ label, value, tone }: StatCardProps) {
  const toneColor =
    tone === 'healthy'
      ? theme.colors.status.healthy
      : tone === 'warning'
      ? theme.colors.status.warning
      : tone === 'critical'
      ? theme.colors.status.critical
      : theme.colors.text.primary;

  return (
    <div style={styles.statCard}>
      <span style={styles.statLabel}>{label}</span>
      <span
        style={{ ...styles.statValue, color: toneColor }}
      >
        {value}
      </span>
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

function SwipeableCard({
  vehicle,
  onDelete,
  onEdit,
  onView,
  onMOTSync,
}: SwipeableCardProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const getHealthMeta = (score: number | null) => {
    if (score == null)
      return {
        color: theme.colors.text.muted,
        label: 'Incomplete',
      };
    if (score >= 80)
      return {
        color: theme.colors.status.healthy,
        label: 'Optimal',
      };
    if (score >= 50)
      return {
        color: theme.colors.status.warning,
        label: 'At risk',
      };
    return {
      color: theme.colors.status.critical,
      label: 'Critical',
    };
  };

  const healthMeta = getHealthMeta(vehicle.health_score);

  const motMeta = (() => {
    if (!vehicle.mot_status || vehicle.mot_status === 'unknown') {
      return {
        color: theme.colors.text.muted,
        label: 'MOT unknown',
        icon: Info,
      };
    }
    if (vehicle.mot_status === 'valid') {
      return {
        color: theme.colors.status.healthy,
        label: 'MOT valid',
        icon: CheckCircle,
      };
    }
    return {
      color: theme.colors.status.critical,
      label: 'MOT expired',
      icon: AlertCircle,
    };
  })();

  const MotIcon = motMeta.icon;

  const handleDrag = (_: any, info: { offset: { x: number } }) => {
    const newX = info.offset.x;
    if (newX < 0) {
      setDragX(Math.max(-180, newX));
    } else {
      setDragX(0);
    }
  };

  const handleDragEnd = () => {
    if (dragX <= -80) {
      setDragX(-180);
    } else {
      setDragX(0);
    }
    setIsDragging(false);
  };

  return (
    <div style={styles.cardWrapper}>
      <div style={styles.actionLayer} aria-hidden="true">
        <button
          type="button"
          style={{ ...styles.bgBtn, background: '#2563eb' }}
          onClick={onEdit}
        >
          <Edit size={18} />
        </button>
        <button
          type="button"
          style={{ ...styles.bgBtn, background: '#d97706' }}
          onClick={onMOTSync}
        >
          <Calendar size={18} />
        </button>
        <button
          type="button"
          style={{ ...styles.bgBtn, background: '#dc2626' }}
          onClick={onDelete}
        >
          <Trash2 size={18} />
        </button>
      </div>

      <motion.article
        drag="x"
        dragConstraints={{ left: -180, right: 0 }}
        dragElastic={0.08}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onDragStart={() => setIsDragging(true)}
        animate={{ x: dragX }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        onClick={() => !isDragging && dragX === 0 && onView()}
        style={styles.card}
        role="button"
        aria-label={`View ${vehicle.make} ${vehicle.model} (${vehicle.license_plate})`}
      >
        <div style={styles.cardContent}>
          <div style={styles.cardHeader}>
            <span style={styles.platePill}>
              {vehicle.license_plate}
            </span>
            <div
              style={{
                ...styles.healthBadge,
                backgroundColor: `${healthMeta.color}12`,
                color: healthMeta.color,
              }}
            >
              <Activity size={12} />
              <span>{vehicle.health_score ?? 0}%</span>
              <span style={styles.healthLabel}>
                {healthMeta.label}
              </span>
            </div>
            {MotIcon && (
              <div
                style={{
                  ...styles.healthBadge,
                  backgroundColor: `${motMeta.color}12`,
                  color: motMeta.color,
                }}
              >
                <MotIcon size={12} />
                <span>{motMeta.label}</span>
              </div>
            )}
          </div>

          <h2 style={styles.vehicleTitle}>
            {vehicle.make} {vehicle.model}
          </h2>

          <div style={styles.metaRow}>
            <div style={styles.metaItem}>
              <History size={14} />
              <span>
                {vehicle.mileage?.toLocaleString() ?? '0'} mi
              </span>
            </div>
            <div style={styles.metaItem}>
              <Info size={14} />
              <span>{vehicle.year ?? 'Year unknown'}</span>
            </div>
          </div>
        </div>
        <ChevronRight
          size={18}
          color={theme.colors.border.medium}
        />
      </motion.article>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={styles.centered}>
      <Loader2
        size={32}
        color={theme.colors.primary}
        className="animate-spin"
      />
      <p style={styles.loadingLabel}>Syncing fleet data…</p>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    padding: '24px 32px',
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: theme.colors.text.primary,
    maxWidth: 1200,
    marginInline: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
    gap: 16,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: '-0.03em',
  },
  subtitle: {
    marginTop: 4,
    color: theme.colors.text.secondary,
    fontSize: 14,
    maxWidth: 480,
  },
  addButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    borderRadius: 999,
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.primary,
    color: theme.colors.background.main,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 8,
    backgroundColor: `${theme.colors.status.critical}10`,
    color: theme.colors.status.critical,
    fontSize: 13,
    marginBottom: 16,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    background: theme.colors.background.card,
    borderRadius: 12,
    padding: '12px 14px',
    border: `1px solid ${theme.colors.border.light}`,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
    marginTop: 4,
  },
  controlRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    minWidth: 220,
    background: theme.colors.background.card,
    borderRadius: 999,
    border: `1px solid ${theme.colors.border.light}`,
    paddingInline: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    paddingBlock: 8,
    color: theme.colors.text.primary,
    outline: 'none',
    fontSize: 13,
  },
  filterTabs: {
    display: 'inline-flex',
    padding: 4,
    borderRadius: 999,
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    gap: 4,
  },
  filterTab: {
    border: 'none',
    borderRadius: 999,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    color: theme.colors.text.secondary,
    background: 'transparent',
  },
  filterTabActive: {
    background: theme.colors.background.subtle,
    color: theme.colors.text.primary,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 16,
  },
  cardWrapper: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionLayer: {
    position: 'absolute',
    insetBlock: 0,
    right: 0,
    width: 180,
    display: 'flex',
    zIndex: 1,
  },
  bgBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    border: 'none',
  },
  card: {
    position: 'relative',
    zIndex: 2,
    background: theme.colors.background.card,
    borderRadius: 16,
    border: `1px solid ${theme.colors.border.light}`,
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  platePill: {
    fontFamily: theme.fontFamilies.mono,
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 6,
    border: `1px solid ${theme.colors.border.light}`,
    color: theme.colors.text.secondary,
    background: theme.colors.background.subtle,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  healthBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: 999,
  },
  healthLabel: {
    opacity: 0.8,
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 8,
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: theme.colors.text.muted,
  },
  centered: {
    minHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    opacity: 0.65,
  },
  empty: {
    gridColumn: '1 / -1',
    padding: 32,
    borderRadius: 16,
    background: theme.colors.background.card,
    border: `1px dashed ${theme.colors.border.light}`,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 600,
  },
  emptyBody: {
    fontSize: 13,
    color: theme.colors.text.muted,
    maxWidth: 360,
  },
  emptyCta: {
    marginTop: 8,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 999,
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.background.main,
    cursor: 'pointer',
    fontSize: 13,
  },
};