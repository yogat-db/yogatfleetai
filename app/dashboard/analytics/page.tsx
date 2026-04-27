'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  RefreshCw, Loader2, TrendingUp, ShieldCheck, 
  Wallet, Car, Activity, ArrowUpRight, Filter
} from 'lucide-react';

// Core Logic & Theme
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

// ==================== TYPES ====================
interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  health_score: number | null;
}

interface Job {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface Transaction {
  id: string;
  amount: number; // pence
  status: string;
  created_at: string;
  mechanic_id: string;
}

type TimeRange = '3m' | '6m' | '1y' | 'all';

// ==================== UTILS ====================
const getThemeValue = (path: string, fallback: any): any => {
  const parts = path.split('.');
  let current: any = theme;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else return fallback;
  }
  return current;
};

const formatCurrency = (pence: number) => 
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);

// ==================== COMPONENT ====================
export default function OwnerAnalyticsPage() {
  const router = useRouter();
  
  // Data States
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [mechanics, setMechanics] = useState<Record<string, string>>({});
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('6m');

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // Concurrent fetching for production performance
      const [vRes, jRes, tRes] = await Promise.all([
        supabase.from('vehicles').select('id, license_plate, make, model, health_score').eq('user_id', user.id),
        supabase.from('jobs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);

      setVehicles(vRes.data || []);
      setJobs(jRes.data || []);
      setTransactions(tRes.data || []);

      // Resolve Mechanic Names
      const mechIds = [...new Set(tRes.data?.map(t => t.mechanic_id).filter(Boolean) || [])];
      if (mechIds.length) {
        const { data: mData } = await supabase.from('mechanics').select('id, business_name').in('id', mechIds);
        const mMap: Record<string, string> = {};
        mData?.forEach(m => { mMap[m.id] = m.business_name || 'Independent'; });
        setMechanics(mMap);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derived Analytics
  const filteredTx = useMemo(() => {
    const completed = transactions.filter(t => t.status === 'completed');
    if (timeRange === 'all') return completed;
    const cutoff = new Date();
    const months = { '3m': 3, '6m': 6, '1y': 12 };
    cutoff.setMonth(cutoff.getMonth() - months[timeRange as keyof typeof months]);
    return completed.filter(t => new Date(t.created_at) >= cutoff);
  }, [transactions, timeRange]);

  const kpis = useMemo(() => ({
    totalSpent: filteredTx.reduce((sum, t) => sum + t.amount, 0),
    avgHealth: Math.round(vehicles.reduce((a, b) => a + (b.health_score || 0), 0) / (vehicles.length || 1)),
    activeAssets: vehicles.length,
    efficiency: Math.round((jobs.filter(j => j.status === 'completed').length / (jobs.length || 1)) * 100)
  }), [filteredTx, vehicles, jobs]);

  const spendingChart = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTx.forEach(t => {
      const date = new Date(t.created_at).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      map[date] = (map[date] || 0) + t.amount / 100;
    });
    return Object.entries(map).map(([name, amount]) => ({ name, amount }));
  }, [filteredTx]);

  if (loading && !refreshing) return <LoadingState />;

  return (
    <div style={styles.page}>
      {/* HEADER SECTION */}
      <header style={styles.header}>
        <div>
          <motion.h1 initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} style={styles.title}>
            Financial Intelligence
          </motion.h1>
          <p style={styles.subtitle}>Fleet expenditure and health telemetry</p>
        </div>
        
        <div style={styles.controls}>
          <div style={styles.rangeBox}>
            <Filter size={14} color="#64748b" />
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as TimeRange)} style={styles.select}>
              <option value="3m">Last Quarter</option>
              <option value="6m">Last 6 Months</option>
              <option value="1y">Last Year</option>
              <option value="all">Lifetime</option>
            </select>
          </div>
          <button onClick={fetchData} disabled={refreshing} style={styles.refreshBtn}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* KPI GRID */}
      <section style={styles.kpiGrid}>
        <KpiItem label="Total Capital Outlay" value={formatCurrency(kpis.totalSpent)} icon={<Wallet />} trend="+2.4%" color="#22c55e" />
        <KpiItem label="Avg Fleet Health" value={`${kpis.avgHealth}%`} icon={<Activity />} trend="Stable" color="#3b82f6" />
        <KpiItem label="Active Assets" value={kpis.activeAssets} icon={<Car />} trend="0" color="#8b5cf6" />
        <KpiItem label="Service Efficiency" value={`${kpis.efficiency}%`} icon={<ShieldCheck />} trend="+12%" color="#f59e0b" />
      </section>

      {/* MAIN ANALYTICS GRID */}
      <div style={styles.bentoGrid}>
        {/* SPENDING AREA CHART */}
        <motion.div whileHover={{ y: -5 }} style={{ ...styles.card, gridColumn: 'span 2' }}>
          <div style={styles.cardHeader}>
            <TrendingUp size={18} color="#22c55e" />
            <h3 style={styles.cardTitle}>Expenditure Velocity</h3>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendingChart}>
                <defs>
                  <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `£${val}`} />
                <Tooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                  itemStyle={{ color: '#22c55e', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#22c55e" fillOpacity={1} fill="url(#colorAmt)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* RECENT JOBS MINI-LOG */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <ShieldCheck size={18} color="#3b82f6" />
            <h3 style={styles.cardTitle}>Recent Operations</h3>
          </div>
          <div style={styles.jobList}>
            {jobs.slice(0, 5).map(job => (
              <div key={job.id} style={styles.jobItem}>
                <div>
                  <div style={styles.jobName}>{job.title}</div>
                  <div style={styles.jobDate}>{new Date(job.created_at).toLocaleDateString()}</div>
                </div>
                <span style={{ ...styles.statusBadge, backgroundColor: job.status === 'completed' ? '#22c55e20' : '#f59e0b20', color: job.status === 'completed' ? '#22c55e' : '#f59e0b' }}>
                  {job.status}
                </span>
              </div>
            ))}
          </div>
          <button style={styles.ghostBtn} onClick={() => router.push('/dashboard/jobs')}>
            View All Logged Operations <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

function KpiItem({ label, value, icon, trend, color }: any) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} style={styles.kpiCard}>
      <div style={{ ...styles.iconCircle, backgroundColor: `${color}15`, color }}>{icon}</div>
      <div style={styles.kpiContent}>
        <span style={styles.kpiLabel}>{label}</span>
        <div style={styles.kpiValueRow}>
          <span style={styles.kpiValue}>{value}</span>
          <span style={{ ...styles.trend, color: trend.includes('+') ? '#22c55e' : '#64748b' }}>{trend}</span>
        </div>
      </div>
    </motion.div>
  );
}

function LoadingState() {
  return (
    <div style={styles.center}>
      <Loader2 size={40} color="#22c55e" className="animate-spin" />
      <p style={styles.loadingText}>Synthesizing Analytics...</p>
    </div>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '40px',
    background: '#020617',
    minHeight: '100vh',
    color: '#f1f5f9',
    fontFamily: 'Inter, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '800',
    letterSpacing: '-1px',
    background: 'linear-gradient(to right, #fff, #94a3b8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: { color: '#64748b', fontSize: '14px' },
  controls: { display: 'flex', gap: '12px' },
  rangeBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '0 12px'
  },
  select: {
    background: 'transparent',
    border: 'none',
    color: '#f1f5f9',
    fontSize: '13px',
    padding: '10px 0',
    cursor: 'pointer',
    outline: 'none'
  },
  refreshBtn: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    color: '#f1f5f9',
    borderRadius: '12px',
    width: '42px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '24px',
    marginBottom: '32px'
  },
  kpiCard: {
    background: '#0f172a',
    borderRadius: '20px',
    padding: '24px',
    border: '1px solid #1e293b',
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  iconCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  kpiLabel: { color: '#64748b', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' },
  kpiValueRow: { display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' },
  kpiValue: { fontSize: '24px', fontWeight: '800' },
  trend: { fontSize: '11px', fontWeight: 'bold' },
  bentoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '24px'
  },
  card: {
    background: '#0f172a',
    borderRadius: '24px',
    padding: '28px',
    border: '1px solid #1e293b'
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' },
  cardTitle: { fontSize: '16px', fontWeight: '700' },
  jobList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  jobItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '12px',
    borderBottom: '1px solid #1e293b'
  },
  jobName: { fontSize: '14px', fontWeight: '600' },
  jobDate: { fontSize: '12px', color: '#64748b' },
  statusBadge: {
    fontSize: '10px',
    fontWeight: '800',
    padding: '4px 8px',
    borderRadius: '6px',
    textTransform: 'uppercase'
  },
  ghostBtn: {
    width: '100%',
    marginTop: '20px',
    padding: '12px',
    background: 'transparent',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    color: '#64748b',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  center: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: '16px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', color: '#64748b' }
};