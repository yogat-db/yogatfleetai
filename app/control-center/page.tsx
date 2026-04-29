// app/control-center/page.tsx (fixed spacing)
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trash2, Loader2, ChevronRight, Clock, DollarSign, Car, AlertTriangle, Gauge, TrendingUp, RefreshCw } from 'lucide-react';
import { computeFleetBrain } from '@/lib/ai';
import { supabase } from '@/lib/supabase/client';
import type { Vehicle } from '@/app/types/fleet';
import theme from '@/app/theme';

const computeFleetStats = (vehicles: Vehicle[], vehiclesWithAI: any[]) => {
  const totalMileage = vehicles.reduce((sum, v) => sum + (v.mileage || 0), 0);
  const avgHealth = vehiclesWithAI.length
    ? vehiclesWithAI.reduce((sum, v) => sum + (v.health_score ?? 100), 0) / vehiclesWithAI.length
    : 0;
  const predictedMaintenanceCost = vehiclesWithAI.reduce(
    (sum, v) => sum + (v.estimatedRepairCost || 0),
    0
  );
  const highRiskCount = vehiclesWithAI.filter(v => v.risk === 'high').length;
  return { totalMileage, avgHealth, predictedMaintenanceCost, highRiskCount };
};

function DeleteVehicleButton({ vehicleId, onDeleted }: { vehicleId: string; onDeleted?: () => void }) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirm('Delete this vehicle? This action cannot be undone.')) return;
    setIsPending(true);
    setError(null);
    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
      if (error) throw error;
      if (onDeleted) onDeleted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={isPending}
        style={{
          background: 'transparent',
          border: `1px solid ${theme.colors.status.critical}`,
          color: theme.colors.status.critical,
          padding: `${theme.spacing[1]} ${theme.spacing[2]}`, // ✅ fixed from '0.5'
          borderRadius: theme.borderRadius.lg,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
        }}
      >
        {isPending ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
        {isPending ? 'Deleting' : 'Delete'}
      </button>
      {error && <div style={{ color: theme.colors.status.critical, fontSize: '10px', marginTop: '4px' }}>{error}</div>}
    </div>
  );
}

export default function ControlCenterPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingScores, setUpdatingScores] = useState(false);

  const fetchVehicles = async () => {
    try {
      setError(null);
      setRefreshing(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not logged in');
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVehicles(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const vehiclesWithAI = useMemo(() => computeFleetBrain(vehicles), [vehicles]);

  const stats = {
    total: vehicles.length,
    healthy: vehiclesWithAI.filter(v => (v.health_score ?? 100) >= 70).length,
    warning: vehiclesWithAI.filter(v => {
      const s = v.health_score ?? 100;
      return s >= 40 && s < 70;
    }).length,
    critical: vehiclesWithAI.filter(v => (v.health_score ?? 100) < 40).length,
  };

  const fleetStats = useMemo(() => computeFleetStats(vehicles, vehiclesWithAI), [vehicles, vehiclesWithAI]);

  const criticalAlerts = vehiclesWithAI
    .filter(v => (v.health_score ?? 100) < 40)
    .sort((a, b) => (a.health_score ?? 0) - (b.health_score ?? 0));

  const predictedFailures = vehiclesWithAI
    .filter(v => v.risk !== 'low' && v.predictedFailureDate)
    .sort((a, b) => (a.daysToFailure ?? 999) - (b.daysToFailure ?? 999));

  const refreshHealthScores = async () => {
    setUpdatingScores(true);
    try {
      const res = await fetch('/api/vehicles/update-health-scores', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`Updated health scores for ${data.updated} vehicles`);
        await fetchVehicles();
      } else {
        alert(data.error || 'Failed to update scores');
      }
    } catch (err) {
      alert('Error updating scores');
    } finally {
      setUpdatingScores(false);
    }
  };

  if (error && !refreshing) {
    return (
      <div style={styles.errorContainer}>
        <h2>Error loading control center</h2>
        <p>{error}</p>
        <button onClick={fetchVehicles} style={styles.retryButton}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Control Center</h1>
        <div style={styles.headerActions}>
          <button onClick={refreshHealthScores} disabled={updatingScores} style={styles.toggleButton}>
            {updatingScores ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            {updatingScores ? 'Updating...' : 'Refresh Health Scores'}
          </button>
          <button onClick={fetchVehicles} disabled={refreshing} style={styles.toggleButton}>
            {refreshing ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <motion.div whileHover={{ y: -5 }} style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcon, background: `${theme.colors.status.info}20` }}>
            <Car size={24} color={theme.colors.status.info} />
          </div>
          <div style={styles.kpiLabel}>Total Fleet</div>
          <div style={styles.kpiValue}>{stats.total}</div>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcon, background: `${theme.colors.status.healthy}20` }}>
            <Gauge size={24} color={theme.colors.status.healthy} />
          </div>
          <div style={styles.kpiLabel}>Average Health</div>
          <div style={styles.kpiValue}>{fleetStats.avgHealth.toFixed(0)}%</div>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcon, background: `${theme.colors.status.warning}20` }}>
            <TrendingUp size={24} color={theme.colors.status.warning} />
          </div>
          <div style={styles.kpiLabel}>Predicted Maintenance</div>
          <div style={styles.kpiValue}>£{fleetStats.predictedMaintenanceCost.toFixed(0)}</div>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcon, background: `${theme.colors.status.critical}20` }}>
            <AlertTriangle size={24} color={theme.colors.status.critical} />
          </div>
          <div style={styles.kpiLabel}>High Risk Vehicles</div>
          <div style={styles.kpiValue}>{fleetStats.highRiskCount}</div>
        </motion.div>
      </div>

      {/* Charts placeholder */}
      {stats.total > 0 && (
        <div style={styles.chartsSection}>
          <h2 style={styles.sectionTitle}>Fleet Health Overview</h2>
          <div style={styles.chartContainer}>
            <p style={{ color: theme.colors.text.secondary }}>Interactive charts will be available soon.</p>
          </div>
        </div>
      )}

      {/* Critical Alerts */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Critical Alerts</h2>
          <span style={styles.badge}>{criticalAlerts.length}</span>
        </div>
        {loading ? (
          <div style={styles.loadingBox}>Loading alerts...</div>
        ) : criticalAlerts.length === 0 ? (
          <div style={styles.emptyBox}>No critical alerts – all vehicles are stable.</div>
        ) : (
          <div style={styles.list}>
            {criticalAlerts.map(vehicle => (
              <div key={vehicle.id} style={styles.listItem}>
                <div style={styles.listItemMain}>
                  <div>
                    <span style={styles.vehiclePlate}>{vehicle.license_plate}</span>
                    <span style={styles.vehicleModel}> {vehicle.make} {vehicle.model}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ ...styles.healthScore, color: theme.colors.status.critical }}>
                      Health: {vehicle.health_score}%
                    </span>
                    <DeleteVehicleButton vehicleId={vehicle.id} onDeleted={fetchVehicles} />
                  </div>
                </div>
                <div style={styles.listItemFooter}>
                  <button onClick={() => router.push(`/vehicles/${vehicle.license_plate}`)} style={styles.viewButton}>
                    View Details <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Predictions */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>AI Predictions</h2>
          <span style={styles.badge}>{predictedFailures.length}</span>
        </div>
        {loading ? (
          <div style={styles.loadingBox}>Loading predictions...</div>
        ) : predictedFailures.length === 0 ? (
          <div style={styles.emptyBox}>No predicted failures – all vehicles are healthy.</div>
        ) : (
          <div style={styles.list}>
            {predictedFailures.map(vehicle => (
              <div key={vehicle.id} style={styles.listItem}>
                <div style={styles.listItemMain}>
                  <div>
                    <span style={styles.vehiclePlate}>{vehicle.license_plate}</span>
                    <span style={styles.vehicleModel}> {vehicle.make} {vehicle.model}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      ...styles.riskBadge,
                      backgroundColor: vehicle.risk === 'high' ? `${theme.colors.status.critical}20` : `${theme.colors.status.warning}20`,
                      color: vehicle.risk === 'high' ? theme.colors.status.critical : theme.colors.status.warning,
                    }}>
                      {vehicle.risk}
                    </span>
                    <DeleteVehicleButton vehicleId={vehicle.id} onDeleted={fetchVehicles} />
                  </div>
                </div>
                <div style={styles.predictionDetails}>
                  <span style={styles.predictionItem}>
                    <Clock size={14} color={theme.colors.text.muted} />
                    {vehicle.daysToFailure} days
                  </span>
                  {vehicle.estimatedRepairCost && (
                    <span style={styles.predictionItem}>
                      <DollarSign size={14} color={theme.colors.text.muted} />
                      £{vehicle.estimatedRepairCost.toFixed(2)}
                    </span>
                  )}
                </div>
                <div style={styles.listItemFooter}>
                  <button onClick={() => router.push(`/vehicles/${vehicle.license_plate}`)} style={styles.viewButton}>
                    View Details <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Quick Actions</h2>
        <div style={styles.actionsGrid}>
          <div onClick={() => router.push('/vehicles/add')} style={styles.actionTile}>
            <div style={styles.actionIcon}>➕</div>
            <div style={styles.actionLabel}>Add Vehicle</div>
          </div>
          <div onClick={() => router.push('/diagnostics')} style={styles.actionTile}>
            <div style={styles.actionIcon}>🔧</div>
            <div style={styles.actionLabel}>Diagnostics</div>
          </div>
          <div onClick={() => router.push('/marketplace/jobs/post')} style={styles.actionTile}>
            <div style={styles.actionIcon}>📝</div>
            <div style={styles.actionLabel}>Post a Job</div>
          </div>
          <div onClick={() => router.push('/marketplace/mechanics')} style={styles.actionTile}>
            <div style={styles.actionIcon}>👨‍🔧</div>
            <div style={styles.actionLabel}>Find Mechanic</div>
          </div>
          <div onClick={() => router.push('/service-history/add')} style={styles.actionTile}>
            <div style={styles.actionIcon}>📋</div>
            <div style={styles.actionLabel}>Log Service</div>
          </div>
          <div onClick={() => router.push('/settings')} style={styles.actionTile}>
            <div style={styles.actionIcon}>⚙️</div>
            <div style={styles.actionLabel}>Settings</div>
          </div>
        </div>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: theme.spacing[10], background: theme.colors.background.main, minHeight: '100vh', color: theme.colors.text.primary, fontFamily: theme.fontFamilies.sans },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[8], flexWrap: 'wrap', gap: theme.spacing[4] },
  title: { fontSize: theme.fontSizes['4xl'], fontWeight: theme.fontWeights.bold, background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  headerActions: { display: 'flex', gap: theme.spacing[3] },
  toggleButton: { background: theme.colors.background.card, border: `1px solid ${theme.colors.border.light}`, borderRadius: theme.borderRadius.lg, padding: `${theme.spacing[2]} ${theme.spacing[4]}`, color: theme.colors.text.primary, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: theme.spacing[2], fontSize: theme.fontSizes.sm },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: theme.spacing[5], marginBottom: theme.spacing[8] },
  kpiCard: { background: theme.colors.background.card, borderRadius: theme.borderRadius.xl, padding: theme.spacing[5], border: `1px solid ${theme.colors.border.light}`, textAlign: 'center', cursor: 'default' },
  kpiIcon: { display: 'inline-flex', padding: theme.spacing[3], borderRadius: '50%', marginBottom: theme.spacing[3] },
  kpiLabel: { fontSize: theme.fontSizes.sm, color: theme.colors.text.secondary, marginBottom: theme.spacing[1] },
  kpiValue: { fontSize: theme.fontSizes['3xl'], fontWeight: theme.fontWeights.bold, color: theme.colors.text.primary },
  chartsSection: { marginBottom: theme.spacing[8] },
  sectionTitle: { fontSize: theme.fontSizes.xl, fontWeight: theme.fontWeights.semibold, marginBottom: theme.spacing[4], color: theme.colors.text.primary },
  chartContainer: { background: theme.colors.background.card, borderRadius: theme.borderRadius.xl, padding: theme.spacing[4], border: `1px solid ${theme.colors.border.light}`, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: theme.spacing[8] },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing[4] },
  badge: { background: theme.colors.background.subtle, padding: `${theme.spacing[1]} ${theme.spacing[2]}`, borderRadius: theme.borderRadius.full, fontSize: theme.fontSizes.xs, color: theme.colors.text.secondary }, // fixed spacing
  list: { background: theme.colors.background.card, borderRadius: theme.borderRadius.xl, border: `1px solid ${theme.colors.border.light}`, overflow: 'hidden' },
  listItem: { padding: theme.spacing[4], borderBottom: `1px solid ${theme.colors.border.light}` },
  listItemMain: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing[3], marginBottom: theme.spacing[2] },
  vehiclePlate: { fontWeight: theme.fontWeights.semibold, fontSize: theme.fontSizes.base },
  vehicleModel: { fontSize: theme.fontSizes.sm, color: theme.colors.text.muted },
  healthScore: { fontSize: theme.fontSizes.sm, fontWeight: theme.fontWeights.medium },
  riskBadge: { display: 'inline-block', padding: `${theme.spacing[1]} ${theme.spacing[2]}`, borderRadius: theme.borderRadius.full, fontSize: theme.fontSizes.xs, fontWeight: theme.fontWeights.medium, textTransform: 'capitalize' }, // fixed
  predictionDetails: { display: 'flex', gap: theme.spacing[4], marginBottom: theme.spacing[3] },
  predictionItem: { display: 'inline-flex', alignItems: 'center', gap: theme.spacing[1], fontSize: theme.fontSizes.xs, color: theme.colors.text.muted },
  listItemFooter: { display: 'flex', justifyContent: 'flex-end' },
  viewButton: { background: 'transparent', border: 'none', color: theme.colors.primary, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: theme.spacing[1], fontSize: theme.fontSizes.sm, textDecoration: 'underline' },
  loadingBox: { textAlign: 'center', padding: theme.spacing[8], color: theme.colors.text.muted },
  emptyBox: { textAlign: 'center', padding: theme.spacing[8], color: theme.colors.text.muted, background: theme.colors.background.card, borderRadius: theme.borderRadius.xl, border: `1px solid ${theme.colors.border.light}` },
  errorContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: theme.colors.background.main, color: theme.colors.text.primary, textAlign: 'center', gap: theme.spacing[4] },
  retryButton: { background: theme.colors.primary, border: 'none', borderRadius: theme.borderRadius.lg, padding: `${theme.spacing[2]} ${theme.spacing[4]}`, color: theme.colors.background.main, cursor: 'pointer' },
  actionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: theme.spacing[4] },
  actionTile: { background: theme.colors.background.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing[4], textAlign: 'center', cursor: 'pointer', border: `1px solid ${theme.colors.border.light}` },
  actionIcon: { fontSize: '28px', marginBottom: theme.spacing[2] },
  actionLabel: { fontSize: theme.fontSizes.xs, color: theme.colors.text.secondary },
};