'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { 
  Activity, 
  Wrench, 
  Plus, 
  Settings, 
  Trash2,
  ChevronRight,
  Clock,
  DollarSign,
  Shield,
  Zap,
  BarChart3,
  Car,
  AlertTriangle,
  Gauge,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { computeFleetBrain } from '@/lib/ai';
import { supabase } from '@/lib/supabase/client';
import type { Vehicle } from '@/app/types/fleet';
import theme from '@/app/theme';
import styles from './page.module.css';

// Helper: compute additional stats
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

  return {
    totalMileage,
    avgHealth,
    predictedMaintenanceCost,
    highRiskCount,
  };
};

export default function ControlCenterPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [chartView, setChartView] = useState<'pie' | 'bar'>('pie');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchVehicles() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/vehicles');
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      const data = await res.json();
      setVehicles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Enrich with AI predictions
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

  // Data for charts
  const chartData = [
    { name: 'Healthy', value: stats.healthy, color: theme.colors.status.healthy },
    { name: 'Warning', value: stats.warning, color: theme.colors.status.warning },
    { name: 'Critical', value: stats.critical, color: theme.colors.status.critical },
  ].filter(item => item.value > 0);

  // Critical alerts (health < 40)
  const criticalAlerts = vehiclesWithAI
    .filter(v => (v.health_score ?? 100) < 40)
    .sort((a, b) => (a.health_score ?? 0) - (b.health_score ?? 0));

  // Predicted failures (risk high or medium)
  const predictedFailures = vehiclesWithAI
    .filter(v => v.risk !== 'low' && v.predictedFailureDate)
    .sort((a, b) => (a.daysToFailure ?? 999) - (b.daysToFailure ?? 999));

  async function handleDeleteVehicle(id: string) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this vehicle? This action cannot be undone.')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setVehicles(prev => prev.filter(v => v.id !== id));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  }

  // Optional: fetch AI insight from OpenAI (if you have an endpoint)
  const fetchAiInsight = async () => {
    if (!vehiclesWithAI.length) return;
    setInsightLoading(true);
    try {
      const res = await fetch('/api/ai/fleet-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fleetStats, stats, vehicles: vehiclesWithAI }),
      });
      const data = await res.json();
      setAiInsight(data.insight);
    } catch (err) {
      console.error('Failed to fetch AI insight', err);
    } finally {
      setInsightLoading(false);
    }
  };

  // For demo, we'll just show a static insight; you can call fetchAiInsight on mount if desired
  // useEffect(() => { fetchAiInsight(); }, [vehiclesWithAI]);

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error loading control center</h2>
        <p>{error}</p>
        <button onClick={fetchVehicles} className={styles.retryButton}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={styles.page}
    >
      <div className={styles.header}>
        <h1 className={styles.title}>Control Center</h1>
        <div className={styles.headerActions}>
          <button
            onClick={() => setChartView(chartView === 'pie' ? 'bar' : 'pie')}
            className={styles.toggleButton}
          >
            <BarChart3 size={16} />
            Switch to {chartView === 'pie' ? 'Bar' : 'Pie'} Chart
          </button>
        </div>
      </div>

      {/* KPI Cards with Icons */}
      <div className={styles.kpiGrid}>
        <motion.div whileHover={{ y: -5 }} className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: `${theme.colors.info}20` }}>
            <Car size={24} color={theme.colors.info} />
          </div>
          <div className={styles.kpiLabel}>Total Fleet</div>
          <div className={styles.kpiValue}>{stats.total}</div>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: `${theme.colors.status.healthy}20` }}>
            <Gauge size={24} color={theme.colors.status.healthy} />
          </div>
          <div className={styles.kpiLabel}>Average Health</div>
          <div className={styles.kpiValue}>{fleetStats.avgHealth.toFixed(0)}%</div>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: `${theme.colors.warning}20` }}>
            <TrendingUp size={24} color={theme.colors.warning} />
          </div>
          <div className={styles.kpiLabel}>Predicted Maintenance</div>
          <div className={styles.kpiValue}>£{fleetStats.predictedMaintenanceCost.toFixed(0)}</div>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: `${theme.colors.status.critical}20` }}>
            <AlertTriangle size={24} color={theme.colors.status.critical} />
          </div>
          <div className={styles.kpiLabel}>High Risk Vehicles</div>
          <div className={styles.kpiValue}>{fleetStats.highRiskCount}</div>
        </motion.div>
      </div>

      {/* Charts Section */}
      {stats.total > 0 && (
        <div className={styles.chartsSection}>
          <h2 className={styles.sectionTitle}>Fleet Health Overview</h2>
          <div className={styles.chartContainer}>
            {chartView === 'pie' ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} £{(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: theme.colors.text.muted, strokeWidth: 1 }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: theme.colors.background.card, border: `1px solid ${theme.colors.border.light}`, borderRadius: theme.borderRadius.lg }}
                    itemStyle={{ color: theme.colors.text.primary }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border.medium} />
                  <XAxis dataKey="name" stroke={theme.colors.text.secondary} />
                  <YAxis stroke={theme.colors.text.secondary} />
                  <Tooltip
                    contentStyle={{ background: theme.colors.background.card, border: `1px solid ${theme.colors.border.light}`, borderRadius: theme.borderRadius.lg }}
                    itemStyle={{ color: theme.colors.text.primary }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* AI Insight Card (optional) */}
      {aiInsight && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>AI Insights</h2>
            <Cpu size={20} color={theme.colors.primary} />
          </div>
          <div className={styles.chartContainer} style={{ background: `${theme.colors.primary}08` }}>
            <p style={{ color: theme.colors.text.secondary, lineHeight: 1.5 }}>{aiInsight}</p>
          </div>
        </div>
      )}

      {/* Critical Alerts */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Critical Alerts</h2>
          <span className={styles.badge}>{criticalAlerts.length}</span>
        </div>
        {loading ? (
          <div className={styles.loadingBox}>Loading alerts...</div>
        ) : criticalAlerts.length === 0 ? (
          <div className={styles.emptyBox}>No critical alerts – all vehicles are stable.</div>
        ) : (
          <div className={styles.list}>
            <AnimatePresence>
              {criticalAlerts.map(vehicle => (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className={styles.listItem}
                >
                  <div className={styles.listItemMain}>
                    <div>
                      <span className={styles.vehiclePlate}>{vehicle.license_plate}</span>
                      <span className={styles.vehicleModel}> {vehicle.make} {vehicle.model}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className={styles.healthScore} style={{ color: theme.colors.status.critical }}>
                        Health: {vehicle.health_score}%
                      </span>
                      <button
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                        disabled={deleting === vehicle.id}
                        className={styles.deleteButton}
                        title="Delete vehicle"
                      >
                        {deleting === vehicle.id ? '...' : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className={styles.listItemFooter}>
                    <button
                      onClick={() => router.push(`/vehicles/${vehicle.license_plate}`)}
                      className={styles.viewButton}
                    >
                      View Details <ChevronRight size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* AI Predictions */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>AI Predictions</h2>
          <span className={styles.badge}>{predictedFailures.length}</span>
        </div>
        {loading ? (
          <div className={styles.loadingBox}>Loading predictions...</div>
        ) : predictedFailures.length === 0 ? (
          <div className={styles.emptyBox}>No predicted failures – all vehicles are healthy.</div>
        ) : (
          <div className={styles.list}>
            <AnimatePresence>
              {predictedFailures.map(vehicle => (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className={styles.listItem}
                >
                  <div className={styles.listItemMain}>
                    <div>
                      <span className={styles.vehiclePlate}>{vehicle.license_plate}</span>
                      <span className={styles.vehicleModel}> {vehicle.make} {vehicle.model}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className={styles.riskBadge} style={{
                        backgroundColor: vehicle.risk === 'high' ? `${theme.colors.status.critical}20` : `${theme.colors.status.warning}20`,
                        color: vehicle.risk === 'high' ? theme.colors.status.critical : theme.colors.status.warning,
                      }}>
                        {vehicle.risk}
                      </span>
                      <button
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                        disabled={deleting === vehicle.id}
                        className={styles.deleteButton}
                        title="Delete vehicle"
                      >
                        {deleting === vehicle.id ? '...' : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className={styles.predictionDetails}>
                    <span className={styles.predictionItem}>
                      <Clock size={14} color={theme.colors.text.muted} />
                      {vehicle.daysToFailure} days
                    </span>
                    {vehicle.estimatedRepairCost && (
                      <span className={styles.predictionItem}>
                        <DollarSign size={14} color={theme.colors.text.muted} />
                        £{vehicle.estimatedRepairCost.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className={styles.listItemFooter}>
                    <button
                      onClick={() => router.push(`/vehicles/${vehicle.license_plate}`)}
                      className={styles.viewButton}
                    >
                      View Details <ChevronRight size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Quick Actions as Animated Tiles */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionsGrid}>
          <div
            onClick={() => router.push('/vehicles/add')}
            className={styles.actionTile}
            style={{ color: theme.colors.primary }}
          >
            <div className={styles.actionIcon}>➕</div>
            <div className={styles.actionLabel}>Add Vehicle</div>
          </div>
          <div
            onClick={() => router.push('/diagnostics')}
            className={styles.actionTile}
            style={{ color: theme.colors.secondary }}
          >
            <div className={styles.actionIcon}>🔧</div>
            <div className={styles.actionLabel}>Diagnostics</div>
          </div>
          <div
            onClick={() => router.push('/marketplace/jobs/post')}
            className={styles.actionTile}
            style={{ color: theme.colors.warning }}
          >
            <div className={styles.actionIcon}>📝</div>
            <div className={styles.actionLabel}>Post a Job</div>
          </div>
          <div
            onClick={() => router.push('/marketplace/mechanics')}
            className={styles.actionTile}
            style={{ color: '#a855f7' }}
          >
            <div className={styles.actionIcon}>👨‍🔧</div>
            <div className={styles.actionLabel}>Find Mechanic</div>
          </div>
          <div
            onClick={() => router.push('/service-history/add')}
            className={styles.actionTile}
            style={{ color: '#ec489a' }}
          >
            <div className={styles.actionIcon}>📋</div>
            <div className={styles.actionLabel}>Log Service</div>
          </div>
          <div
            onClick={() => router.push('/settings')}
            className={styles.actionTile}
            style={{ color: theme.colors.text.muted }}
          >
            <div className={styles.actionIcon}>⚙️</div>
            <div className={styles.actionLabel}>Settings</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
