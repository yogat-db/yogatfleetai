'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Briefcase, Wrench, ShoppingBag, Truck, ArrowUpRight } from 'lucide-react';
import theme from '@/app/theme';

export default function MarketplacePage() {
  const marketplaceOptions = [
    {
      title: 'Post a Repair Job',
      description: 'Describe your issue and get competitive quotes.',
      icon: Briefcase,
      href: '/jobs/post',
      color: theme.colors.primary,
      badge: 'Vehicle Owners',
    },
    {
      title: 'Find Jobs',
      description: 'Browse open repair jobs and submit your application.',
      icon: Wrench,
      href: '/marketplace/jobs',
      color: '#10b981',
      badge: 'Mechanic Hub',
    },
    {
      title: 'Car Accessories',
      description: 'Shop premium parts, tools, and upgrades.',
      icon: Truck,
      href: '/marketplace/affiliate',
      color: '#f59e0b',
      badge: 'Shop & Save',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={styles.container}
    >
      <header style={styles.header}>
        <div style={styles.badgeTop}>Fleet Ecosystem</div>
        <h1 style={styles.title}>Marketplace</h1>
        <p style={styles.subtitle}>Everything you need to keep your vehicle on the road</p>
      </header>

      <div style={styles.grid}>
        {marketplaceOptions.map((option, idx) => {
          const Icon = option.icon;
          return (
            <motion.div
              key={option.href}
              whileHover={{ y: -3 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Link href={option.href} style={styles.card}>
                <div style={{ ...styles.iconWrapper, background: `${option.color}15`, border: `1px solid ${option.color}30` }}>
                  <Icon size={22} style={{ color: option.color }} />
                </div>
                <div style={styles.cardContent}>
                  <div style={styles.cardHeader}>
                    <h2 style={styles.cardTitle}>{option.title}</h2>
                    <span style={{ ...styles.badge, background: `${option.color}20`, color: option.color }}>
                      {option.badge}
                    </span>
                  </div>
                  <p style={styles.cardDescription}>{option.description}</p>
                </div>
                <div style={styles.cardFooter}>
                  <span style={styles.footerText}>Open Module</span>
                  <ArrowUpRight size={12} style={styles.footerIcon} />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Stats bar – also made more compact */}
      <div style={styles.stats}>
        <div style={styles.statItem}>
          <span style={styles.statNumber}>500+</span>
          <span style={styles.statLabel}>Jobs Completed</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <span style={styles.statNumber}>150+</span>
          <span style={styles.statLabel}>Verified Mechanics</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <span style={styles.statNumber}>24/7</span>
          <span style={styles.statLabel}>System Uptime</span>
        </div>
      </div>
    </motion.div>
  );
}

// ==================== COMPACT STYLES (smaller cards) ====================
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${theme.spacing[8]} ${theme.spacing[6]}`,
    maxWidth: '1200px',
    margin: '0 auto',
    background: theme.colors.background.main,
    minHeight: '100vh',
  },
  header: {
    textAlign: 'left',
    marginBottom: theme.spacing[8],
    paddingLeft: theme.spacing[2],
  },
  badgeTop: {
    fontSize: '10px',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '0.3em',
    color: theme.colors.text.muted,
    marginBottom: theme.spacing[1],
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '800',
    letterSpacing: '-0.03em',
    color: '#fff',
    marginBottom: theme.spacing[2],
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
    maxWidth: '500px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: theme.spacing[6],
    marginBottom: theme.spacing[10],
  },
  card: {
    background: 'rgba(15, 23, 42, 0.4)',
    borderRadius: '1.5rem',
    border: `1px solid ${theme.colors.border.light}`,
    padding: theme.spacing[5],
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    textDecoration: 'none',
    transition: 'all 0.25s ease',
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[4],
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[3],
  },
  cardTitle: {
    fontSize: theme.fontSizes.xl,
    fontWeight: '700',
    color: '#fff',
    margin: 0,
    letterSpacing: '-0.01em',
  },
  badge: {
    fontSize: '8px',
    padding: '3px 10px',
    borderRadius: '100px',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  cardDescription: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.secondary,
    lineHeight: 1.5,
    margin: 0,
  },
  cardFooter: {
    marginTop: theme.spacing[5],
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    color: theme.colors.text.muted,
  },
  footerText: {
    fontSize: '10px',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  footerIcon: {
    transition: 'transform 0.2s',
  },
  stats: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing[5],
    background: 'rgba(2, 6, 23, 0.5)',
    borderRadius: '1.5rem',
    border: `1px solid ${theme.colors.border.light}`,
  },
  statItem: {
    flex: 1,
    textAlign: 'center',
  },
  statDivider: {
    width: '1px',
    height: '30px',
    background: theme.colors.border.light,
  },
  statNumber: {
    display: 'block',
    fontSize: theme.fontSizes['2xl'],
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: '-0.03em',
  },
  statLabel: {
    fontSize: '9px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: theme.colors.text.muted,
    marginTop: theme.spacing[1],
  },
};