'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Trash2,
  Loader2,
  ChevronRight,
  Clock,
  DollarSign,
  Car,
  AlertTriangle,
  Gauge,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { computeFleetBrain } from '@/lib/ai';
import { supabase } from '@/lib/supabase/client';
import type { Vehicle } from '@/app/types/fleet';
import theme from '@/app/theme';

type VehicleWithAI = ReturnType<typeof computeFleetBrain>[number];

const computeFleetStats = (vehicles: Vehicle[], vehiclesWithAI: VehicleWithAI[]) => {
  const totalMileage = vehicles.reduce((sum, v) => sum + (v.mileage || 0), 0);

  const avgHealth = vehiclesWithAI.length
    ? vehiclesWithAI.reduce((sum, v) => sum + (v.health_score ?? 100), 0) /
      vehiclesWithAI.length
    : 0;

  const predictedMaintenanceCost = vehiclesWithAI.reduce(
    (sum, v) => sum + (v.estimatedRepairCost || 0),
    0
  );

  const highRiskCount = vehiclesWithAI.filter((v) => v.risk === 'high').length;

  return { totalMileage, avgHealth, predictedMaintenanceCost, highRiskCount };
};

function DeleteVehicleButton({
  vehicleId,
  onDeleted,
}: {
  vehicleId: string;
  onDeleted?: () => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm('Delete this vehicle? This action cannot be undone.')) return;

    setIsPending(true);
    setError(null);

    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
      if (error) throw error;
      onDeleted?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete vehicle';
      setError(msg);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        style={{
          background: 'transparent',
          border: `1px solid ${theme.colors.status.critical}`,
          color: theme.colors.status.critical,
          padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
          borderRadius: theme.borderRadius.lg,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 12,
        }}
      >
        {isPending ? (
          <Loader2 size={14} className="spin" aria-hidden="true" />
        ) : (
          <Trash2 size={14} aria-hidden="true" />
        )}
        <span>{isPending ? 'Deleting' : 'Delete'}</span>
      </button>
      {error && (
        <div
          style={{
            color: theme.colors.status.critical,
            fontSize: 10,
            marginTop: 4,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

export default function ControlCenterPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingScores, setUpdatingScores] = useState(false);

  const fetchVehicles = async () => {
    try {
      setError(null);
      setRefreshing(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Not logged in');
      }

      const { data, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (vehiclesError) throw vehiclesError;

      setVehicles(data || []);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to load vehicles for control center';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const vehiclesWithAI = useMemo(
    () => computeFleetBrain(vehicles),
    [vehicles]
  ) as VehicleWithAI[];

  const stats = {
    total: vehicles.length,
    healthy: vehiclesWithAI.filter((v) => (v.health_score ?? 100) >= 70).length,
    warning: vehiclesWithAI.filter((v) => {
      const s = v.health_score ?? 100;
      return s >= 40 && s < 70;
    }).length,
    critical: vehiclesWithAI.filter((v) => (v.health_score ?? 100) < 40).length,
  };

  const fleetStats = useMemo(
    () => computeFleetStats(vehicles, vehiclesWithAI),
    [vehicles, vehiclesWithAI]
  );

  const criticalAlerts = vehiclesWithAI
    .filter((v) => (v.health_score ?? 100) < 40)
    .sort((a, b) => (a.health_score ?? 0) - (b.health_score ?? 0));

  const predictedFailures = vehiclesWithAI
    .filter((v) => v.risk !== 'low' && v.predictedFailureDate)
    .sort((a, b) => (a.daysToFailure ?? 999) - (b.daysToFailure ?? 999));

  const refreshHealthScores = async () => {
    setUpdatingScores(true);
    try {
      const res = await fetch('/api/vehicles/update-health-scores', {
        method: 'POST',
      });
      const data = await res.json().catch(() => null);

      if (res.ok) {
        window.alert(`Updated health scores for ${data?.updated ?? 0} vehicles`);
        await fetchVehicles();
      } else {
        window.alert(data?.error || 'Failed to update health scores');
      }
    } catch {
      window.alert('Error updating scores');
    } finally {
      setUpdatingScores(false);
    }
  };

  if (error && !refreshing) {
    return (
      <div style={styles.errorContainer}>
        <h2 style={styles.errorTitle}>Error loading control center</h2>
        <p style={styles.errorText}>{error}</p>
        <button type="button" onClick={fetchVehicles} style={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <motion.main
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      style={styles.page}
    >
      <style>{spinnerCss}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerText}>
          <div style={styles.eyebrow}>Operations hub</div>
          <h1 style={styles.title}>Control Center</h1>
          <p style={styles.subtitle}>
            Live view of fleet health, predicted failures, and the actions to keep
            everything moving.
          </p>
        </div>

        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={refreshHealthScores}
            disabled={updatingScores}
            style={styles.headerButton}
          >
            {updatingScores ? (
              <Loader2 size={16} className="spin" aria-hidden="true" />
            ) : (
              <Gauge size={16} aria-hidden="true" />
            )}
            <span>
              {updatingScores ? 'Updating scores…' : 'Refresh health scores'}
            </span>
          </button>

          <button
            type="button"
            onClick={fetchVehicles}
            disabled={refreshing}
            style={styles.headerButton}
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'spin' : undefined}
              aria-hidden="true"
            />
            <span>{refreshing ? 'Refreshing…' : 'Refresh data'}</span>
          </button>
        </div>
      </header>

      {/* KPI row */}
      <section style={styles.kpiGrid} aria-label="Fleet status indicators">
        <motion.article
          style={styles.kpiCard}
          whileHover={shouldReduceMotion ? undefined : { y: -4 }}
          transition={{ duration: 0.18 }}
        >
          <div
            style={{
              ...styles.kpiIcon,
              backgroundColor: `${theme.colors.status.info}20`,
            }}
          >
            <Car size={22} color={theme.colors.status.info} aria-hidden="true" />
          </div>
          <div style={styles.kpiLabel}>Total fleet</div>
          <div style={styles.kpiValue}>{stats.total}</div>
          <div style={styles.kpiHint}>Vehicles currently in your account</div>
        </motion.article>

        <motion.article
          style={styles.kpiCard}
          whileHover={shouldReduceMotion ? undefined : { y: -4 }}
          transition={{ duration: 0.18 }}
        >
          <div
            style={{
              ...styles.kpiIcon,
              backgroundColor: `${theme.colors.status.healthy}20`,
            }}
          >
            <Gauge
              size={22}
              color={theme.colors.status.healthy}
              aria-hidden="true"
            />
          </div>
          <div style={styles.kpiLabel}>Average health</div>
          <div style={styles.kpiValue}>{fleetStats.avgHealth.toFixed(0)}%</div>
          <div style={styles.kpiHint}>
            Weighted across vehicles with AI scores
          </div>
        </motion.article>

        <motion.article
          style={styles.kpiCard}
          whileHover={shouldReduceMotion ? undefined : { y: -4 }}
          transition={{ duration: 0.18 }}
        >
          <div
            style={{
              ...styles.kpiIcon,
              backgroundColor: `${theme.colors.status.warning}20`,
            }}
          >
            <TrendingUp
              size={22}
              color={theme.colors.status.warning}
              aria-hidden="true"
            />
          </div>
          <div style={styles.kpiLabel}>Predicted maintenance</div>
          <div style={styles.kpiValue}>
            £{fleetStats.predictedMaintenanceCost.toFixed(0)}
          </div>
          <div style={styles.kpiHint}>Estimated upcoming spend</div>
        </motion.article>

        <motion.article
          style={styles.kpiCard}
          whileHover={shouldReduceMotion ? undefined : { y: -4 }}
          transition={{ duration: 0.18 }}
        >
          <div
            style={{
              ...styles.kpiIcon,
              backgroundColor: `${theme.colors.status.critical}20`,
            }}
          >
            <AlertTriangle
              size={22}
              color={theme.colors.status.critical}
              aria-hidden="true"
            />
          </div>
          <div style={styles.kpiLabel}>High‑risk vehicles</div>
          <div style={styles.kpiValue}>{fleetStats.highRiskCount}</div>
          <div style={styles.kpiHint}>Needing attention soon</div>
        </motion.article>
      </section>

      {/* Optional charts row */}
      {stats.total > 0 && (
        <section style={styles.chartsSection}>
          <div style={styles.sectionHeaderRow}>
            <h2 style={styles.sectionTitle}>Fleet health overview</h2>
          </div>
          <div style={styles.chartContainer}>
            <p style={styles.chartText}>
              Interactive charts for health, mileage, and downtime will be
              available here once time‑series data is connected.
            </p>
          </div>
        </section>
      )}

      {/* Alerts + predictions band */}
      <section style={styles.alertsGrid}>
        {/* Critical alerts */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeaderRow}>
            <h2 style={styles.sectionTitle}>Critical alerts</h2>
            <span style={styles.badge}>{criticalAlerts.length}</span>
          </div>

          {loading ? (
            <div style={styles.loadingBox}>Loading alerts…</div>
          ) : criticalAlerts.length === 0 ? (
            <div style={styles.emptyBox}>
              <p style={styles.emptyText}>
                No critical alerts. Vehicles are within safe operating ranges.
              </p>
            </div>
          ) : (
            <div style={styles.list}>
              {criticalAlerts.map((vehicle) => (
                <div key={vehicle.id} style={styles.listItem}>
                  <div style={styles.listItemMain}>
                    <div>
                      <span style={styles.vehiclePlate}>
                        {vehicle.license_plate}
                      </span>
                      <span style={styles.vehicleModel}>
                        {' '}
                        {vehicle.make} {vehicle.model}
                      </span>
                    </div>

                    <div style={styles.listRightGroup}>
                      <span
                        style={{
                          ...styles.healthScore,
                          color: theme.colors.status.critical,
                        }}
                      >
                        Health {vehicle.health_score ?? '—'}%
                      </span>
                      <DeleteVehicleButton
                        vehicleId={vehicle.id}
                        onDeleted={fetchVehicles}
                      />
                    </div>
                  </div>

                  <div style={styles.listItemFooter}>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/vehicles/${vehicle.license_plate}`)
                      }
                      style={styles.viewButton}
                    >
                      View details <ChevronRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI predictions */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeaderRow}>
            <h2 style={styles.sectionTitle}>AI predictions</h2>
            <span style={styles.badge}>{predictedFailures.length}</span>
          </div>

          {loading ? (
            <div style={styles.loadingBox}>Loading predictions…</div>
          ) : predictedFailures.length === 0 ? (
            <div style={styles.emptyBox}>
              <p style={styles.emptyText}>
                No predicted failures detected. Continue monitoring to stay ahead
                of issues.
              </p>
            </div>
          ) : (
            <div style={styles.list}>
              {predictedFailures.map((vehicle) => (
                <div key={vehicle.id} style={styles.listItem}>
                  <div style={styles.listItemMain}>
                    <div>
                      <span style={styles.vehiclePlate}>
                        {vehicle.license_plate}
                      </span>
                      <span style={styles.vehicleModel}>
                        {' '}
                        {vehicle.make} {vehicle.model}
                      </span>
                    </div>

                    <div style={styles.listRightGroup}>
                      <span
                        style={{
                          ...styles.riskBadge,
                          backgroundColor:
                            vehicle.risk === 'high'
                              ? `${theme.colors.status.critical}20`
                              : `${theme.colors.status.warning}20`,
                          color:
                            vehicle.risk === 'high'
                              ? theme.colors.status.critical
                              : theme.colors.status.warning,
                        }}
                      >
                        {vehicle.risk}
                      </span>
                      <DeleteVehicleButton
                        vehicleId={vehicle.id}
                        onDeleted={fetchVehicles}
                      />
                    </div>
                  </div>

                  <div style={styles.predictionDetails}>
                    <span style={styles.predictionItem}>
                      <Clock
                        size={14}
                        color={theme.colors.text.muted}
                        aria-hidden="true"
                      />
                      {vehicle.daysToFailure} days
                    </span>
                    {vehicle.estimatedRepairCost && (
                      <span style={styles.predictionItem}>
                        <DollarSign
                          size={14}
                          color={theme.colors.text.muted}
                          aria-hidden="true"
                        />
                        £{vehicle.estimatedRepairCost.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div style={styles.listItemFooter}>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/vehicles/${vehicle.license_plate}`)
                      }
                      style={styles.viewButton}
                    >
                      View details <ChevronRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick actions */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Quick actions</h2>
        <p style={styles.quickActionsText}>
          Jump straight to the workflows you use most often.
        </p>

        <div style={styles.actionsGrid}>
          <button
            type="button"
            onClick={() => router.push('/vehicles/add')}
            style={styles.actionTile}
          >
            <div style={styles.actionIcon}>➕</div>
            <div style={styles.actionLabel}>Add vehicle</div>
          </button>

          <button
            type="button"
            onClick={() => router.push('/diagnostics')}
            style={styles.actionTile}
          >
            <div style={styles.actionIcon}>🔧</div>
            <div style={styles.actionLabel}>Diagnostics</div>
          </button>

          <button
            type="button"
            onClick={() => router.push('/marketplace/jobs/post')}
            style={styles.actionTile}
          >
            <div style={styles.actionIcon}>📝</div>
            <div style={styles.actionLabel}>Post a job</div>
          </button>

          <button
            type="button"
            onClick={() => router.push('/marketplace/mechanics')}
            style={styles.actionTile}
          >
            <div style={styles.actionIcon}>👨‍🔧</div>
            <div style={styles.actionLabel}>Find mechanic</div>
          </button>

          <button
            type="button"
            onClick={() => router.push('/service-history/add')}
            style={styles.actionTile}
          >
            <div style={styles.actionIcon}>📋</div>
            <div style={styles.actionLabel}>Log service</div>
          </button>

          <button
            type="button"
            onClick={() => router.push('/settings')}
            style={styles.actionTile}
          >
            <div style={styles.actionIcon}>⚙️</div>
            <div style={styles.actionLabel}>Settings</div>
          </button>
        </div>
      </section>
    </motion.main>
  );
}

const spinnerCss = `
  .spin {
    animation: cc-spin 1s linear infinite;
  }
  @keyframes cc-spin {
    to { transform: rotate(360deg); }
  }
`;

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
    alignItems: 'flex-start',
    marginBottom: theme.spacing[8],
    flexWrap: 'wrap',
    gap: theme.spacing[4],
  },
  headerText: {
    maxWidth: 540,
  },
  eyebrow: {
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    color: theme.colors.text.muted,
    marginBottom: theme.spacing[2],
  },
  title: {
    fontSize: theme.fontSizes['4xl'],
    fontWeight: theme.fontWeights.bold,
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
    lineHeight: 1.6,
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    gap: theme.spacing[3],
    flexWrap: 'wrap',
  },
  headerButton: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    color: theme.colors.text.primary,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    fontSize: theme.fontSizes.sm,
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: theme.spacing[4],
    marginBottom: theme.spacing[8],
  },
  kpiCard: {
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[5],
    border: `1px solid ${theme.colors.border.light}`,
    boxShadow: '0 10px 30px rgba(15,23,42,0.35)',
  },
  kpiIcon: {
    display: 'inline-flex',
    padding: theme.spacing[3],
    borderRadius: '50%',
    marginBottom: theme.spacing[3],
  },
  kpiLabel: {
    fontSize: theme.fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: theme.colors.text.muted,
    marginBottom: theme.spacing[1],
  },
  kpiValue: {
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.text.primary,
    lineHeight: 1.1,
    marginBottom: theme.spacing[1],
  },
  kpiHint: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.secondary,
  },
  chartsSection: {
    marginBottom: theme.spacing[8],
  },
  sectionHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[3],
  },
  sectionTitle: {
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.semibold,
    margin: 0,
    color: theme.colors.text.primary,
  },
  chartContainer: {
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[5],
    border: `1px dashed ${theme.colors.border.light}`,
    minHeight: 180,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    maxWidth: 420,
  },
  alertsGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1.2fr)',
    gap: theme.spacing[6],
    marginBottom: theme.spacing[8],
  },
  sectionCard: {
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
    padding: theme.spacing[4],
  },
  badge: {
    background: theme.colors.background.subtle,
    padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.secondary,
    minWidth: 24,
    textAlign: 'center',
  },
  list: {},
  listItem: {
    padding: `${theme.spacing[3]} ${theme.spacing[2]}`,
    borderBottom: `1px solid ${theme.colors.border.light}`,
  },
  listItemMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[2],
  },
  listRightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[3],
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  vehiclePlate: {
    fontWeight: theme.fontWeights.semibold,
    fontSize: theme.fontSizes.base,
  },
  vehicleModel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.muted,
  },
  healthScore: {
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
  },
  riskBadge: {
    display: 'inline-block',
    padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.medium,
    textTransform: 'capitalize',
  },
  predictionDetails: {
    display: 'flex',
    gap: theme.spacing[4],
    marginBottom: theme.spacing[3],
    flexWrap: 'wrap',
  },
  predictionItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing[1],
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.muted,
  },
  listItemFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  viewButton: {
    background: 'transparent',
    border: 'none',
    color: theme.colors.primary,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing[1],
    fontSize: theme.fontSizes.sm,
    textDecoration: 'underline',
  },
  loadingBox: {
    textAlign: 'center',
    padding: theme.spacing[6],
    color: theme.colors.text.muted,
  },
  emptyBox: {
    textAlign: 'center',
    padding: theme.spacing[6],
    color: theme.colors.text.muted,
    background: theme.colors.background.subtle,
    borderRadius: theme.borderRadius.lg,
  },
  emptyText: {
    margin: 0,
    fontSize: theme.fontSizes.sm,
  },
  section: {
    marginBottom: theme.spacing[8],
  },
  quickActionsText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing[1],
    marginBottom: theme.spacing[4],
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: theme.spacing[4],
  },
  actionTile: {
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    textAlign: 'center',
    cursor: 'pointer',
    border: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  actionIcon: {
    fontSize: 26,
  },
  actionLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.secondary,
  },
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: theme.colors.background.main,
    color: theme.colors.text.primary,
    textAlign: 'center',
    gap: theme.spacing[4],
  },
  errorTitle: {
    fontSize: theme.fontSizes['2xl'],
    margin: 0,
  },
  errorText: {
    fontSize: theme.fontSizes.sm,
    maxWidth: 420,
  },
  retryButton: {
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    color: theme.colors.background.main,
    cursor: 'pointer',
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
  },
};