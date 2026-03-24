'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trash2, Edit, Plus, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { deleteVehicle } from '@/app/vehicles/actions';
import theme from '@/app/theme';

interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  year: number | null;
  mileage: number | null;
  status: string;
  health_score: number | null;
}

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vehicle? This action cannot be undone.')) return;
    const formData = new FormData();
    formData.append('id', id);
    try {
      await deleteVehicle(formData);
      setVehicles(prev => prev.filter(v => v.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredVehicles = vehicles.filter(v =>
    v.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${v.make} ${v.model}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading vehicles...</p>
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
        <p style={{ color: theme.colors.error }}>Error: {error}</p>
        <button onClick={fetchVehicles} style={styles.retryButton}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.page}
    >
      <div style={styles.header}>
        <h1 style={styles.title}>My Vehicles</h1>
        <button onClick={() => router.push('/vehicles/add')} style={styles.addButton}>
          <Plus size={20} />
          Add Vehicle
        </button>
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

      {filteredVehicles.length === 0 ? (
        <div style={styles.empty}>No vehicles found</div>
      ) : (
        <div style={styles.grid}>
          {filteredVehicles.map((vehicle) => (
            <motion.div
              key={vehicle.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              whileHover={{ scale: 1.02 }}
              style={styles.card}
            >
              <div style={styles.cardHeader}>
                <h2 style={styles.vehicleName}>
                  {vehicle.make} {vehicle.model}
                </h2>
                <div style={styles.cardActions}>
                  <button
                    onClick={() => router.push(`/vehicles/edit/${vehicle.id}`)}
                    style={styles.editButton}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(vehicle.id)}
                    style={styles.deleteButton}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p style={styles.licensePlate}>{vehicle.license_plate}</p>
              <div style={styles.details}>
                <span>Year: {vehicle.year || '—'}</span>
                <span>Mileage: {vehicle.mileage?.toLocaleString() || '—'} mi</span>
              </div>
              <div style={styles.statusBadge}>
                {vehicle.status === 'warning' ? '⚠️ Warning' : vehicle.status === 'critical' ? '🔴 Critical' : '✅ Active'}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
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
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    marginBottom: theme.spacing[6],
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: theme.spacing[6],
  },
  card: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[6],
    transition: 'box-shadow 0.2s ease',
    cursor: 'pointer',
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
    margin: 0,
    color: theme.colors.text.primary,
  },
  cardActions: {
    display: 'flex',
    gap: theme.spacing[2],
  },
  editButton: {
    background: 'transparent',
    border: 'none',
    color: theme.colors.secondary,
    cursor: 'pointer',
    padding: theme.spacing[1],
    borderRadius: theme.borderRadius.lg,
    transition: 'background 0.2s ease',
  },
  deleteButton: {
    background: 'transparent',
    border: 'none',
    color: theme.colors.error,
    cursor: 'pointer',
    padding: theme.spacing[1],
    borderRadius: theme.borderRadius.lg,
    transition: 'background 0.2s ease',
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
    display: 'inline-block',
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    borderRadius: theme.borderRadius.full,
    background: `${theme.colors.primary}20`,
    color: theme.colors.primary,
    fontSize: theme.fontSizes.xs,
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