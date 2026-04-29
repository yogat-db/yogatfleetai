// app/dashboard/analytics/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  RefreshCw, TrendingUp, ShieldCheck, 
  Wallet, Activity
} from 'lucide-react';
import theme from '@/app/theme';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDistance: 0,
    fuelCost: 0,
    trips: 0,
    safetyScore: 0,
  });

  useEffect(() => {
    async function fetchData() {
      // Simulate loading – replace with real data later
      await new Promise(resolve => setTimeout(resolve, 500));
      setStats({
        totalDistance: 12345,
        fuelCost: 1234,
        trips: 89,
        safetyScore: 92,
      });
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Fleet Analytics</h1>
        <p style={styles.subtitle}>Performance and usage insights</p>
        <button style={styles.refreshBtn} onClick={() => window.location.reload()}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardIcon}><TrendingUp size={24} /></div>
          <h3>Total Distance</h3>
          <p style={styles.stat}>{stats.totalDistance.toLocaleString()} mi</p>
        </div>
        <div style={styles.card}>
          <div style={styles.cardIcon}><Wallet size={24} /></div>
          <h3>Fuel Cost</h3>
          <p style={styles.stat}>£{stats.fuelCost.toLocaleString()}</p>
        </div>
        <div style={styles.card}>
          <div style={styles.cardIcon}><Activity size={24} /></div>
          <h3>Trips</h3>
          <p style={styles.stat}>{stats.trips}</p>
        </div>
        <div style={styles.card}>
          <div style={styles.cardIcon}><ShieldCheck size={24} /></div>
          <h3>Safety Score</h3>
          <p style={styles.stat}>{stats.safetyScore}%</p>
        </div>
      </div>

      <div style={styles.chartPlaceholder}>
        <p>Detailed charts will appear here once data is available.</p>
      </div>

      <style>{`
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid ${theme.colors.border.medium};
          border-top: 3px solid ${theme.colors.primary};
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: theme.colors.background.main, minHeight: '100vh', color: '#fff', fontFamily: theme.fontFamilies.sans },
  centered: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' },
  header: { marginBottom: '40px', textAlign: 'center' },
  title: { fontSize: '32px', fontWeight: 800, background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' },
  subtitle: { color: theme.colors.text.secondary, fontSize: '14px', marginBottom: '20px' },
  refreshBtn: { background: theme.colors.background.card, border: `1px solid ${theme.colors.border.light}`, borderRadius: '40px', padding: '8px 20px', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' },
  card: { background: theme.colors.background.card, borderRadius: '24px', padding: '24px', textAlign: 'center', border: `1px solid ${theme.colors.border.light}` },
  cardIcon: { marginBottom: '16px', color: theme.colors.primary },
  stat: { fontSize: '28px', fontWeight: 800, marginTop: '8px', color: theme.colors.primary },
  chartPlaceholder: { background: theme.colors.background.card, borderRadius: '24px', padding: '80px', textAlign: 'center', color: theme.colors.text.muted, border: `1px solid ${theme.colors.border.light}` },
};