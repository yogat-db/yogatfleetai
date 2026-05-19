'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  Gauge,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import theme from '@/app/theme';

type AnalyticsStats = {
  totalDistance: number;
  fuelCost: number;
  trips: number;
  safetyScore: number;
};

const initialStats: AnalyticsStats = {
  totalDistance: 0,
  fuelCost: 0,
  trips: 0,
  safetyScore: 0,
};

export default function AnalyticsPage() {
  const shouldReduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AnalyticsStats>(initialStats);

  const loadAnalytics = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);

      // Replace with real API later
      await new Promise((resolve) => setTimeout(resolve, 500));

      setStats({
        totalDistance: 12345,
        fuelCost: 1234,
        trips: 89,
        safetyScore: 92,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="analytics-spinner" />
        <p style={styles.loadingText}>Loading analytics…</p>

        <style>{spinnerCss}</style>
      </div>
    );
  }

  const metricCards = [
    {
      title: 'Total Distance',
      value: `${stats.totalDistance.toLocaleString()} mi`,
      hint: 'Fleet movement across all tracked journeys',
      icon: TrendingUp,
      color: theme.colors.primary,
    },
    {
      title: 'Fuel Cost',
      value: `£${stats.fuelCost.toLocaleString()}`,
      hint: 'Estimated spend across active vehicles',
      icon: Wallet,
      color: '#f59e0b',
    },
    {
      title: 'Trips',
      value: stats.trips.toLocaleString(),
      hint: 'Completed journeys recorded this period',
      icon: Activity,
      color: '#22c55e',
    },
    {
      title: 'Safety Score',
      value: `${stats.safetyScore}%`,
      hint: 'Average fleet safety and driving quality',
      icon: ShieldCheck,
      color: '#38bdf8',
    },
  ];

  return (
    <motion.main
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      style={styles.page}
    >
      <style>{spinnerCss}</style>

      <header style={styles.header}>
        <div style={styles.headerCopy}>
          <div style={styles.eyebrow}>Insights hub</div>
          <h1 style={styles.title}>Fleet Analytics</h1>
          <p style={styles.subtitle}>
            Track performance, operating cost, and safety trends across your
            fleet in one view.
          </p>
        </div>

        <button
          type="button"
          style={styles.refreshBtn}
          onClick={() => loadAnalytics(true)}
          disabled={refreshing}
          aria-label="Refresh analytics"
        >
          <RefreshCw
            size={16}
            className={refreshing ? 'spin' : undefined}
            aria-hidden="true"
          />
          <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
        </button>
      </header>

      <section style={styles.metricsGrid} aria-label="Fleet analytics metrics">
        {metricCards.map((card) => {
          const Icon = card.icon;

          return (
            <motion.article
              key={card.title}
              style={styles.metricCard}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
            >
              <div style={styles.metricTop}>
                <div
                  style={{
                    ...styles.metricIconWrap,
                    background: `${card.color}18`,
                    border: `1px solid ${card.color}2e`,
                  }}
                >
                  <Icon size={18} color={card.color} aria-hidden="true" />
                </div>

                <span
                  style={{
                    ...styles.metricPill,
                    color: card.color,
                    background: `${card.color}14`,
                  }}
                >
                  Live metric
                </span>
              </div>

              <div style={styles.metricBody}>
                <h2 style={styles.metricTitle}>{card.title}</h2>
                <div style={styles.metricValue}>{card.value}</div>
                <p style={styles.metricHint}>{card.hint}</p>
              </div>
            </motion.article>
          );
        })}
      </section>

      <section style={styles.analyticsGrid}>
        <div style={styles.heroCard}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionHeaderLeft}>
              <Gauge size={18} aria-hidden="true" />
              <h2 style={styles.sectionTitle}>Performance overview</h2>
            </div>
            <span style={styles.sectionChip}>Summary</span>
          </div>

          <div style={styles.heroStatsRow}>
            <div style={styles.heroStat}>
              <span style={styles.heroStatLabel}>Average trip length</span>
              <span style={styles.heroStatValue}>
                {stats.trips > 0
                  ? `${Math.round(stats.totalDistance / stats.trips)} mi`
                  : '—'}
              </span>
            </div>

            <div style={styles.heroStat}>
              <span style={styles.heroStatLabel}>Average fuel spend / trip</span>
              <span style={styles.heroStatValue}>
                {stats.trips > 0
                  ? `£${Math.round(stats.fuelCost / stats.trips)}`
                  : '—'}
              </span>
            </div>

            <div style={styles.heroStat}>
              <span style={styles.heroStatLabel}>Safety standing</span>
              <span style={styles.heroStatValue}>
                {stats.safetyScore >= 85
                  ? 'Excellent'
                  : stats.safetyScore >= 70
                  ? 'Stable'
                  : 'Needs review'}
              </span>
            </div>
          </div>

          <div style={styles.chartPlaceholder}>
            <div style={styles.chartPlaceholderInner}>
              <TrendingUp
                size={28}
                color={theme.colors.primary}
                aria-hidden="true"
              />
              <h3 style={styles.chartTitle}>Charts will appear here</h3>
              <p style={styles.chartText}>
                Once live analytics data is connected, this area can show trend
                lines for mileage, fuel spend, utilisation, and safety changes
                over time.
              </p>
            </div>
          </div>
        </div>

        <div style={styles.sideStack}>
          <div style={styles.sideCard}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionHeaderLeft}>
                <Wallet size={16} aria-hidden="true" />
                <h2 style={styles.sectionTitle}>Cost signal</h2>
              </div>
            </div>

            <div style={styles.sideValue}>£{stats.fuelCost.toLocaleString()}</div>
            <p style={styles.sideText}>
              Fuel remains one of the clearest controllable operating costs.
              Track it here before adding repairs, servicing, and downtime.
            </p>
          </div>

          <div style={styles.sideCard}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionHeaderLeft}>
                <ShieldCheck size={16} aria-hidden="true" />
                <h2 style={styles.sectionTitle}>Safety signal</h2>
              </div>
            </div>

            <div style={styles.sideValue}>{stats.safetyScore}%</div>
            <p style={styles.sideText}>
              This score gives you a quick operational health check. It works
              best when paired with harsh braking, speeding, and route-risk data.
            </p>
          </div>
        </div>
      </section>
    </motion.main>
  );
}

const spinnerCss = `
  .analytics-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid ${theme.colors.border.medium};
    border-top: 3px solid ${theme.colors.primary};
    border-radius: 999px;
    animation: analytics-spin 1s linear infinite;
    margin-bottom: 16px;
  }

  .spin {
    animation: analytics-spin 0.9s linear infinite;
  }

  @keyframes analytics-spin {
    to { transform: rotate(360deg); }
  }
`;

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 'clamp(16px, 4vw, 32px)',
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: theme.colors.text.primary,
    fontFamily: theme.fontFamilies.sans,
  },
  centered: {
    minHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.text.secondary,
    margin: 0,
    fontSize: 14,
  },
  header: {
    marginBottom: 24,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  headerCopy: {
    maxWidth: 680,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    color: theme.colors.text.muted,
    marginBottom: 8,
  },
  title: {
    fontSize: 'clamp(28px, 5vw, 40px)',
    fontWeight: 800,
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '0 0 10px 0',
    lineHeight: 1.05,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    fontSize: 15,
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 58 * 8,
  },
  refreshBtn: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: 999,
    padding: '10px 16px',
    color: theme.colors.text.primary,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 600,
    minHeight: 42,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  metricCard: {
    background: theme.colors.background.card,
    borderRadius: 20,
    padding: 18,
    border: `1px solid ${theme.colors.border.light}`,
    boxShadow: '0 10px 28px rgba(0,0,0,0.08)',
  },
  metricTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 18,
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricPill: {
    fontSize: 11,
    fontWeight: 700,
    padding: '6px 10px',
    borderRadius: 999,
    whiteSpace: 'nowrap',
  },
  metricBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  metricTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    color: theme.colors.text.secondary,
  },
  metricValue: {
    fontSize: 'clamp(26px, 4vw, 34px)',
    fontWeight: 800,
    lineHeight: 1.05,
    color: theme.colors.text.primary,
  },
  metricHint: {
    margin: 0,
    color: theme.colors.text.muted,
    fontSize: 12,
    lineHeight: 1.5,
  },
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
    gap: 24,
  },
  heroCard: {
    background: theme.colors.background.card,
    borderRadius: 24,
    border: `1px solid ${theme.colors.border.light}`,
    padding: 20,
    boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
  },
  sideStack: {
    display: 'grid',
    gap: 16,
  },
  sideCard: {
    background: theme.colors.background.card,
    borderRadius: 20,
    border: `1px solid ${theme.colors.border.light}`,
    padding: 18,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  sectionHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: theme.colors.text.primary,
  },
  sectionChip: {
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 999,
    padding: '6px 10px',
    color: theme.colors.primary,
    background: `${theme.colors.primary}16`,
  },
  heroStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 12,
    marginBottom: 18,
  },
  heroStat: {
    padding: '14px 14px',
    borderRadius: 16,
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.light}`,
  },
  heroStatLabel: {
    display: 'block',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: theme.colors.text.muted,
    marginBottom: 8,
  },
  heroStatValue: {
    display: 'block',
    fontSize: 20,
    fontWeight: 800,
    color: theme.colors.text.primary,
  },
  chartPlaceholder: {
    minHeight: 320,
    borderRadius: 20,
    border: `1px dashed ${theme.colors.border.medium}`,
    background: theme.colors.background.subtle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  chartPlaceholderInner: {
    textAlign: 'center',
    maxWidth: 420,
  },
  chartTitle: {
    margin: '12px 0 8px 0',
    fontSize: 20,
    fontWeight: 700,
    color: theme.colors.text.primary,
  },
  chartText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    color: theme.colors.text.secondary,
  },
  sideValue: {
    fontSize: 32,
    fontWeight: 800,
    color: theme.colors.text.primary,
    lineHeight: 1.1,
    marginBottom: 10,
  },
  sideText: {
    margin: 0,
    color: theme.colors.text.secondary,
    fontSize: 14,
    lineHeight: 1.6,
  },
};