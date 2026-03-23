'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import styles from './page.module.css';

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

  if (loading) {
    return (
      <div className={styles.centered}>
        <div className="spinner" />
        <p>Loading fleet...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centered}>
        <p style={{ color: theme.colors.error }}>Error: {error}</p>
        <button onClick={fetchVehicles} className={styles.retryButton}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Fleet Management</h1>
        <button onClick={() => router.push('/vehicles/add')} className={styles.addButton}>
          <Plus size={20} />
          Add Vehicle
        </button>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>TOTAL</span>
          <span className={styles.statValue}>{stats.total}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>HEALTHY</span>
          <span className={styles.statValue}>{stats.healthy}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>WARNING</span>
          <span className={styles.statValue}>{stats.warning}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>CRITICAL</span>
          <span className={styles.statValue}>{stats.critical}</span>
        </div>
      </div>

      <div className={styles.searchBar}>
        <Search size={18} color="#64748b" />
        <input
          type="text"
          placeholder="Search by plate, make, model..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.filterTabs}>
        {(['all', 'healthy', 'warning', 'critical'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`${styles.filterTab} ${filterStatus === status ? styles.filterTabActive : ''}`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {filteredVehicles.length === 0 ? (
        <div className={styles.empty}>No vehicles found</div>
      ) : (
        <div className={styles.grid}>
          {filteredVehicles.map((vehicle) => (
            <motion.div
              key={vehicle.id}
              whileHover={{ scale: 1.02 }}
              className={styles.card}
              onClick={() => router.push(`/vehicles/${vehicle.license_plate}`)}
            >
              <div className={styles.cardHeader}>
                <h2 className={styles.vehicleName}>
                  {vehicle.make} {vehicle.model}
                </h2>
                <span
                  className={styles.healthBadge}
                  style={{
                    background: `${getHealthColor(vehicle.health_score)}20`,
                    color: getHealthColor(vehicle.health_score),
                  }}
                >
                  {vehicle.health_score ? `${vehicle.health_score}%` : '—'}
                </span>
              </div>
              <p className={styles.licensePlate}>{vehicle.license_plate}</p>
              <div className={styles.details}>
                <span>Year: {vehicle.year || '—'}</span>
                <span>Mileage: {vehicle.mileage?.toLocaleString() || '—'} mi</span>
              </div>
              <div className={styles.statusBadge}>
                {vehicle.status === 'warning' && <AlertTriangle size={14} />}
                {vehicle.status === 'active' && <CheckCircle size={14} />}
                {getStatusText(vehicle.status)}
              </div>
            </motion.div>
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