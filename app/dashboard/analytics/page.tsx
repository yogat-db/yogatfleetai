// app/dashboard/analytics/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

// ==================== TYPES ====================
interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  year: number;
  health_score: number | null;
}

interface Job {
  id: string;
  title: string;
  budget: number | null;
  status: string;
  created_at: string;
  user_id: string;
  mechanic_id?: string;
}

interface Transaction {
  id: string;
  job_id: string;
  amount: number;        // in pence
  platform_fee: number;  // in pence
  status: string;
  created_at: string;
  mechanic_id: string;
  user_id: string;
}

interface Mechanic {
  id: string;
  business_name: string | null;
}

type TimeRange = '3m' | '6m' | '1y' | 'all';

// ==================== HELPER ====================
const getThemeValue = (path: string, fallback: any): any => {
  const parts = path.split('.');
  let current: any = theme;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return fallback;
    }
  }
  return current;
};

// ==================== MAIN COMPONENT ====================
export default function OwnerAnalyticsPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [mechanics, setMechanics] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('6m');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setRefreshing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUserId(user.id);

      // Fetch vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, license_plate, make, model, year, health_score')
        .eq('user_id', user.id);
      if (vehiclesError) throw vehiclesError;
      setVehicles(vehiclesData || []);

      // Fetch jobs (direct Supabase query, no API dependency)
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (jobsError) throw jobsError;
      setJobs(jobsData || []);

      // Fetch transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (txError) throw txError;
      setTransactions(txData || []);

      // Fetch mechanic names
      const mechanicIds = [...new Set(txData?.map(t => t.mechanic_id).filter(Boolean) || [])];
      if (mechanicIds.length > 0) {
        const { data: mechs, error: mechError } = await supabase
          .from('mechanics')
          .select('id, business_name')
          .in('id', mechanicIds);
        if (!mechError && mechs) {
          const mechMap: Record<string, string> = {};
          mechs.forEach(m => { mechMap[m.id] = m.business_name || 'Unknown'; });
          setMechanics(mechMap);
        }
      }
    } catch (err: any) {
      console.error('Analytics fetch error:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter transactions by time range and status
  const filteredTransactions = useMemo(() => {
    const completed = transactions.filter(t => t.status === 'completed');
    if (timeRange === 'all') return completed;
    const now = new Date();
    const cutoff = new Date();
    if (timeRange === '3m') cutoff.setMonth(now.getMonth() - 3);
    if (timeRange === '6m') cutoff.setMonth(now.getMonth() - 6);
    if (timeRange === '1y') cutoff.setFullYear(now.getFullYear() - 1);
    return completed.filter(t => new Date(t.created_at) >= cutoff);
  }, [transactions, timeRange]);

  // KPI calculations
  const totalSpent = useMemo(() =>
    filteredTransactions.reduce((sum, t) => sum + t.amount / 100, 0), [filteredTransactions]
  );
  const totalVehicles = vehicles.length;
  const avgHealth = useMemo(() => {
    const valid = vehicles.filter(v => v.health_score != null);
    return valid.length ? valid.reduce((sum, v) => sum + (v.health_score || 0), 0) / valid.length : 0;
  }, [vehicles]);
  const completedJobs = jobs.filter(j => j.status === 'completed').length;

  // Spending by month
  const spendingByMonth = useMemo(() => {
    const monthMap: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      const date = new Date(t.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = (monthMap[key] || 0) + t.amount / 100;
    });
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }));
  }, [filteredTransactions]);

  // Health distribution
  const healthDistribution = useMemo(() => {
    const healthy = vehicles.filter(v => (v.health_score || 0) >= 70).length;
    const warning = vehicles.filter(v => (v.health_score || 0) >= 40 && (v.health_score || 0) < 70).length;
    const critical = vehicles.filter(v => (v.health_score || 0) < 40).length;
    const total = healthy + warning + critical;
    if (total === 0) return [];
    return [
      { name: 'Healthy', value: healthy, color: getThemeValue('colors.status.healthy', '#22c55e') },
      { name: 'Warning', value: warning, color: getThemeValue('colors.status.warning', '#f59e0b') },
      { name: 'Critical', value: critical, color: getThemeValue('colors.status.critical', '#ef4444') },
    ].filter(item => item.value > 0);
  }, [vehicles]);

  // Top mechanics by spending
  const topMechanics = useMemo(() => {
    const mechMap: Record<string, { name: string; total: number; count: number }> = {};
    filteredTransactions.forEach(t => {
      const mechId = t.mechanic_id;
      if (!mechId) return;
      if (!mechMap[mechId]) {
        mechMap[mechId] = { name: mechanics[mechId] || 'Unknown', total: 0, count: 0 };
      }
      mechMap[mechId].total += t.amount / 100;
      mechMap[mechId].count += 1;
    });
    return Object.values(mechMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredTransactions, mechanics]);

  // Recent jobs
  const recentJobs = useMemo(() => jobs.slice(0, 5), [jobs]);

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  if (loading && !refreshing) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading analytics...</p>
        <style jsx>{`
          .spinner {
            border: 3px solid ${getThemeValue('colors.border.medium', '#334155')};
            border-top: 3px solid ${getThemeValue('colors.primary', '#22c55e')};
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

  if (error && !refreshing) {
    return (
      <div style={styles.centered}>
        <p style={{ color: getThemeValue('colors.error', '#ef4444') }}>Error: {error}</p>
        <button onClick={handleRefresh} style={styles.retryButton}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Fleet Owner Analytics</h1>
        <button onClick={handleRefresh} disabled={refreshing} style={styles.refreshButton}>
          {refreshing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
          {refreshing ? ' Refreshing...' : ' Refresh'}
        </button>
      </div>

      {/* Time Range Selector */}
      <div style={styles.rangeSelector}>
        <label style={styles.rangeLabel}>Time Range:</label>
        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as TimeRange)} style={styles.select}>
          <option value="3m">Last 3 months</option>
          <option value="6m">Last 6 months</option>
          <option value="1y">Last year</option>
          <option value="all">All time</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Total Spent</span>
          <span style={styles.kpiValue}>£{totalSpent.toFixed(2)}</span>
        </div>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Vehicles</span>
          <span style={styles.kpiValue}>{totalVehicles}</span>
        </div>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Avg. Health</span>
          <span style={styles.kpiValue}>{avgHealth.toFixed(1)}%</span>
        </div>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Completed Jobs</span>
          <span style={styles.kpiValue}>{completedJobs}</span>
        </div>
      </div>

      {/* Charts Row */}
      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Spending Over Time</h3>
          {spendingByMonth.length === 0 ? (
            <p style={styles.emptyText}>No spending data for this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={spendingByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke={getThemeValue('colors.border.medium', '#334155')} />
                <XAxis dataKey="month" stroke={getThemeValue('colors.text.secondary', '#94a3b8')} />
                <YAxis stroke={getThemeValue('colors.text.secondary', '#94a3b8')} />
                <Tooltip contentStyle={{ background: getThemeValue('colors.background.card', '#0f172a'), border: 'none' }} />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke={getThemeValue('colors.primary', '#22c55e')} name="Amount (£)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Vehicle Health</h3>
          {healthDistribution.length === 0 ? (
            <p style={styles.emptyText}>No vehicle data</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={healthDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value, percent }) => `${name} ${(percent! * 100).toFixed(0)}%`}
                >
                  {healthDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Top Mechanics by Spending</h3>
          {topMechanics.length === 0 ? (
            <p style={styles.emptyText}>No mechanic data</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topMechanics} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={getThemeValue('colors.border.medium', '#334155')} />
                <XAxis type="number" stroke={getThemeValue('colors.text.secondary', '#94a3b8')} />
                <YAxis type="category" dataKey="name" stroke={getThemeValue('colors.text.secondary', '#94a3b8')} width={150} />
                <Tooltip contentStyle={{ background: getThemeValue('colors.background.card', '#0f172a'), border: 'none' }} />
                <Bar dataKey="total" fill={getThemeValue('colors.primary', '#22c55e')} name="Total Spent (£)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Recent Jobs</h3>
          {recentJobs.length === 0 ? (
            <p style={styles.emptyText}>No recent jobs</p>
          ) : (
            <div style={styles.jobList}>
              {recentJobs.map(job => (
                <div key={job.id} style={styles.jobItem}>
                  <span style={styles.jobTitle}>{job.title}</span>
                  <span style={styles.jobStatus}>{job.status}</span>
                  <span style={styles.jobDate}>{new Date(job.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: getThemeValue('spacing.10', '40px'),
    background: getThemeValue('colors.background.main', '#020617'),
    minHeight: '100vh',
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
    fontFamily: getThemeValue('fontFamilies.sans', 'Inter, sans-serif'),
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getThemeValue('spacing.8', '32px'),
    flexWrap: 'wrap',
    gap: getThemeValue('spacing.4', '16px'),
  },
  title: {
    fontSize: getThemeValue('fontSizes.3xl', '32px'),
    fontWeight: getThemeValue('fontWeights.bold', '700'),
    background: getThemeValue('gradients.title', 'linear-gradient(135deg, #94a3b8, #f1f5f9)'),
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  refreshButton: {
    padding: `${getThemeValue('spacing.2', '8px')} ${getThemeValue('spacing.4', '16px')}`,
    background: getThemeValue('colors.background.card', '#0f172a'),
    border: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
    borderRadius: getThemeValue('borderRadius.lg', '12px'),
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: getThemeValue('spacing.2', '8px'),
  },
  rangeSelector: {
    marginBottom: getThemeValue('spacing.6', '24px'),
    display: 'flex',
    alignItems: 'center',
    gap: getThemeValue('spacing.3', '12px'),
  },
  rangeLabel: {
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
  },
  select: {
    background: getThemeValue('colors.background.card', '#0f172a'),
    border: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
    borderRadius: getThemeValue('borderRadius.lg', '12px'),
    padding: getThemeValue('spacing.2', '8px'),
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: getThemeValue('spacing.5', '20px'),
    marginBottom: getThemeValue('spacing.8', '32px'),
  },
  kpiCard: {
    background: getThemeValue('colors.background.card', '#0f172a'),
    padding: getThemeValue('spacing.5', '20px'),
    borderRadius: getThemeValue('borderRadius.xl', '16px'),
    border: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
  },
  kpiLabel: {
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
    display: 'block',
  },
  kpiValue: {
    fontSize: getThemeValue('fontSizes.2xl', '28px'),
    fontWeight: getThemeValue('fontWeights.bold', '700'),
    marginTop: getThemeValue('spacing.2', '8px'),
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: getThemeValue('spacing.5', '20px'),
    marginBottom: getThemeValue('spacing.5', '20px'),
  },
  chartCard: {
    background: getThemeValue('colors.background.card', '#0f172a'),
    padding: getThemeValue('spacing.5', '20px'),
    borderRadius: getThemeValue('borderRadius.xl', '16px'),
    border: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
  },
  chartTitle: {
    fontSize: getThemeValue('fontSizes.lg', '18px'),
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    marginBottom: getThemeValue('spacing.4', '16px'),
  },
  emptyText: {
    color: getThemeValue('colors.text.muted', '#64748b'),
    textAlign: 'center',
    padding: getThemeValue('spacing.5', '20px'),
  },
  jobList: {
    display: 'flex',
    flexDirection: 'column',
    gap: getThemeValue('spacing.3', '12px'),
  },
  jobItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: getThemeValue('spacing.2', '8px'),
    borderBottom: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
  },
  jobTitle: {
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    fontWeight: getThemeValue('fontWeights.medium', '500'),
  },
  jobStatus: {
    fontSize: getThemeValue('fontSizes.xs', '12px'),
    color: getThemeValue('colors.primary', '#22c55e'),
    textTransform: 'capitalize' as const,
  },
  jobDate: {
    fontSize: getThemeValue('fontSizes.xs', '12px'),
    color: getThemeValue('colors.text.muted', '#64748b'),
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
  },
  retryButton: {
    marginTop: getThemeValue('spacing.4', '16px'),
    padding: `${getThemeValue('spacing.2', '8px')} ${getThemeValue('spacing.4', '16px')}`,
    background: getThemeValue('colors.primary', '#22c55e'),
    border: 'none',
    borderRadius: getThemeValue('borderRadius.lg', '12px'),
    color: getThemeValue('colors.background.main', '#020617'),
    cursor: 'pointer',
  },
};