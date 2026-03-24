'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, PanInfo } from 'framer-motion';
import { Plus, Search, AlertTriangle, CheckCircle, Trash2, Edit } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { deleteVehicle } from '@/app/vehicles/actions';
import theme from '@/app/theme';

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

export default function FleetPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (score: number | null) => {
    if (score === null) return '#64748b';
    if (score >= 80) return theme.colors.status.healthy;
    if (score >= 50) return theme.colors.status.warning;
    return theme.colors.status.critical;
  };

  const getStatusText = (status: string) => {
    if (status === 'active') return 'Active';
    if (status === 'warning') return 'Warning';
    if (status === 'critical') return 'Critical';
    return 'Unknown';
  };

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${v.make} ${v.model}`.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesStatus = true;
    if (filterStatus === 'healthy') matchesStatus = (v.health_score || 0) >= 80;
    else if (filterStatus === 'warning') matchesStatus = (v.health_score || 0) >= 50 && (v.health_score || 0) < 80;
    else if (filterStatus === 'critical') matchesStatus = (v.health_score || 0) < 50;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: vehicles.length,
    healthy: vehicles.filter(v => (v.health_score || 0) >= 80).length,
    warning: vehicles.filter(v => (v.health_score || 0) >= 50 && (v.health_score || 0) < 80).length,
    critical: vehicles.filter(v => (v.health_score || 0) < 50).length,
  };

  const handleDelete = async (vehicleId: string) => {
    if (!confirm('Delete this vehicle? This action cannot be undone.')) return;
    const formData = new FormData();
    formData.append('id', vehicleId);
    try {
      await deleteVehicle(formData);
      // After successful deletion, the server action redirects to /fleet
      // but we also need to update local state to avoid flicker
      setVehicles(prev => prev.filter(v => v.id !== vehicleId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEdit = (vehicleId: string) => {
    router.push(`/vehicles/edit/${vehicleId}`);
  };

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading fleet...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <p style={{ color: theme.colors.error }}>Error: {error}</p>
        <button onClick={fetchVehicles} style={styles.retryButton}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Fleet Management</h1>
        <button onClick={() => router.push('/vehicles/add')} style={styles.addButton}>
          <Plus size={20} />
          Add Vehicle
        </button>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>TOTAL</span>
          <span style={styles.statValue}>{stats.total}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>HEALTHY</span>
          <span style={styles.statValue}>{stats.healthy}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>WARNING</span>
          <span style={styles.statValue}>{stats.warning}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>CRITICAL</span>
          <span style={styles.statValue}>{stats.critical}</span>
        </div>
      </div>

      <div style={styles.searchBar}>
        <Search size={18} color="#64748b" />
        <input
          type="text"
          placeholder="Search by plate, make, model..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.filterTabs}>
        {(['all', 'healthy', 'warning', 'critical'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            style={{
              ...styles.filterTab,
              ...(filterStatus === status ? styles.filterTabActive : {}),
            }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {filteredVehicles.length === 0 ? (
        <div style={styles.empty}>No vehicles found</div>
      ) : (
        <div style={styles.grid}>
          {filteredVehicles.map((vehicle) => (
            <SwipeableCard
              key={vehicle.id}
              vehicle={vehicle}
              onDelete={() => handleDelete(vehicle.id)}
              onEdit={() => handleEdit(vehicle.id)}
              onCardClick={() => router.push(`/vehicles/${vehicle.license_plate}`)}
              getHealthColor={getHealthColor}
              getStatusText={getStatusText}
            />
          ))}
        </div>
      )}

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
    </motion.div>
  );
}

// Swipeable Card Component
interface SwipeableCardProps {
  vehicle: Vehicle;
  onDelete: () => void;
  onEdit: () => void;
  onCardClick: () => void;
  getHealthColor: (score: number | null) => string;
  getStatusText: (status: string) => string;
}

function SwipeableCard({
  vehicle,
  onDelete,
  onEdit,
  onCardClick,
  getHealthColor,
  getStatusText,
}: SwipeableCardProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const newX = info.offset.x;
    setDragX(newX);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    if (Math.abs(dragX) > 100) {
      if (dragX > 0) {
        // Swipe right → edit
        onEdit();
      } else {
        // Swipe left → delete
        onDelete();
      }
    }
    setDragX(0);
    setIsDragging(false);
  };

  return (
    <div style={styles.cardWrapper}>
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.2}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{ x: dragX }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          ...styles.card,
          cursor: isDragging ? 'grabbing' : 'pointer',
          position: 'relative',
          zIndex: 2,
        }}
        onClick={(e) => {
          if (!isDragging && Math.abs(dragX) < 5) onCardClick();
        }}
      >
        <div style={styles.cardHeader}>
          <h2 style={styles.vehicleName}>
            {vehicle.make} {vehicle.model}
          </h2>
          <span
            style={{
              ...styles.healthBadge,
              background: `${getHealthColor(vehicle.health_score)}20`,
              color: getHealthColor(vehicle.health_score),
            }}
          >
            {vehicle.health_score ? `${vehicle.health_score}%` : '—'}
          </span>
        </div>
        <p style={styles.licensePlate}>{vehicle.license_plate}</p>
        <div style={styles.details}>
          <span>Year: {vehicle.year || '—'}</span>
          <span>Mileage: {vehicle.mileage?.toLocaleString() || '—'} mi</span>
        </div>
        <div style={styles.statusBadge}>
          {vehicle.status === 'warning' && <AlertTriangle size={14} />}
          {vehicle.status === 'active' && <CheckCircle size={14} />}
          {getStatusText(vehicle.status)}
        </div>
      </motion.div>

      {/* Hidden action buttons (shown behind card) */}
      <div style={styles.actionButtons}>
        <button
          onClick={onEdit}
          style={{ ...styles.actionButton, background: '#3b82f6' }}
          aria-label="Edit"
        >
          <Edit size={18} />
        </button>
        <button
          onClick={onDelete}
          style={{ ...styles.actionButton, background: '#ef4444' }}
          aria-label="Delete"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

// Styles (inline, no pseudo‑classes)
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
  },
  title: {
    fontSize: theme.fontSizes['4xl'],
    fontWeight: theme.fontWeights.bold,
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
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
    fontWeight: theme.fontWeights.semibold,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: theme.spacing[4],
    marginBottom: theme.spacing[8],
  },
  statCard: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[4],
    textAlign: 'center',
  },
  statLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.muted,
    display: 'block',
    marginBottom: theme.spacing[1],
  },
  statValue: {
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.text.primary,
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    marginBottom: theme.spacing[4],
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
  },
  filterTabs: {
    display: 'flex',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[6],
  },
  filterTab: {
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.full,
    padding: `${theme.spacing[1]} ${theme.spacing[4]}`,
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  filterTabActive: {
    background: theme.colors.primary,
    borderColor: theme.colors.primary,
    color: theme.colors.background.main,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: theme.spacing[6],
  },
  cardWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: theme.borderRadius.xl,
  },
  card: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[6],
    transition: 'box-shadow 0.2s ease',
    position: 'relative',
    zIndex: 2,
    willChange: 'transform',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  vehicleName: {
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.text.primary,
  },
  healthBadge: {
    padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.medium,
  },
  licensePlate: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[2],
  },
  details: {
    display: 'flex',
    gap: theme.spacing[4],
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.muted,
    marginBottom: theme.spacing[3],
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing[1],
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    borderRadius: theme.borderRadius.full,
    background: `${theme.colors.status.warning}20`,
    color: theme.colors.status.warning,
    fontSize: theme.fontSizes.xs,
    width: 'fit-content',
  },
  actionButtons: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: theme.spacing[2],
    padding: `0 ${theme.spacing[4]}`,
    pointerEvents: 'none',
    zIndex: 1,
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    pointerEvents: 'auto',
    transition: 'transform 0.2s ease',
    color: '#fff',
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
  empty: {
    textAlign: 'center',
    padding: theme.spacing[12],
    color: theme.colors.text.muted,
  },
};