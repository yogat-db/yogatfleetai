'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  Briefcase,
  LayoutDashboard,
  ShoppingBag,
  Wrench,
} from 'lucide-react';
import theme from '@/app/theme';

type MarketplaceOption = {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
  badge: string;
  featured?: boolean;
};

const marketplaceOptions: MarketplaceOption[] = [
  {
    title: 'Post a Repair Job',
    description: 'Create a clear repair request and receive competitive quotes from mechanics.',
    icon: Briefcase,
    href: '/marketplace/jobs/post',
    color: theme.colors.primary,
    badge: 'Vehicle Owners',
    featured: true,
  },
  {
    title: 'Find Jobs',
    description: 'Browse open repair jobs and submit quotes from one focused workspace.',
    icon: Wrench,
    href: '/marketplace/jobs',
    color: '#16a34a',
    badge: 'Mechanics',
  },
  {
    title: 'Mechanic Dashboard',
    description: 'Track bids, active work, and workshop activity in one place.',
    icon: LayoutDashboard,
    href: '/marketplace/mechanics/dashboard',
    color: '#22c55e',
    badge: 'Workshop',
  },
  {
    title: 'Automotive Supplies',
    description: 'Browse professional accessories, tools, and vehicle care essentials.',
    icon: ShoppingBag,
    href: '/marketplace/affiliate',
    color: '#f59e0b',
    badge: 'Shop',
  },
];

const stats = [
  { value: '500+', label: 'Jobs completed' },
  { value: '150+', label: 'Verified mechanics' },
  { value: '24/7', label: 'Platform uptime' },
];

function getAccentStyles(color: string): {
  iconWrapper: CSSProperties;
  badge: CSSProperties;
} {
  return {
    iconWrapper: {
      ...styles.iconWrapper,
      backgroundColor: `${color}14`,
      border: `1px solid ${color}26`,
    },
    badge: {
      ...styles.badge,
      backgroundColor: `${color}18`,
      color,
    },
  };
}

export default function MarketplacePage() {
  return (
    <motion.main
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={styles.container}
    >
      <header style={styles.header}>
        <div style={styles.eyebrow}>Fleet ecosystem</div>
        <h1 style={styles.title}>Marketplace</h1>
        <p style={styles.subtitle}>
          Post repair work, browse live opportunities, and access trusted automotive supplies
          from one cleaner workspace.
        </p>
      </header>

      <section aria-label="Marketplace modules" style={styles.grid}>
        {marketplaceOptions.map((option) => {
          const Icon = option.icon;
          const accent = getAccentStyles(option.color);

          return (
            <motion.div
              key={option.href}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.18 }}
              style={styles.tileWrap}
            >
              <Link
                href={option.href}
                style={{
                  ...styles.card,
                  ...(option.featured ? styles.featuredCard : {}),
                }}
                aria-label={`${option.title} - ${option.description}`}
              >
                <div style={styles.cardTop}>
                  <div style={accent.iconWrapper}>
                    <Icon size={22} color={option.color} aria-hidden="true" />
                  </div>
                  <span style={accent.badge}>{option.badge}</span>
                </div>

                <div style={styles.cardContent}>
                  <h2 style={styles.cardTitle}>{option.title}</h2>
                  <p style={styles.cardDescription}>{option.description}</p>
                </div>

                <div style={styles.cardFooter}>
                  <span style={styles.footerText}>Open</span>
                  <ArrowUpRight size={15} style={styles.footerIcon} aria-hidden="true" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </section>

      <section aria-label="Marketplace statistics" style={styles.stats}>
        {stats.map((stat, index) => (
          <div key={stat.label} style={styles.statBlock}>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{stat.value}</span>
              <span style={styles.statLabel}>{stat.label}</span>
            </div>
            {index < stats.length - 1 ? <div style={styles.statDivider} /> : null}
          </div>
        ))}
      </section>
    </motion.main>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '32px 20px 40px',
    maxWidth: '1100px',
    margin: '0 auto',
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: theme.colors.text.primary,
  },
  header: {
    textAlign: 'left',
    marginBottom: '28px',
  },
  eyebrow: {
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.22em',
    color: theme.colors.text.muted,
    marginBottom: '8px',
  },
  title: {
    fontSize: 'clamp(2rem, 4vw, 3rem)',
    fontWeight: 800,
    letterSpacing: '-0.03em',
    color: theme.colors.text.primary,
    margin: '0 0 10px 0',
    lineHeight: 1.04,
  },
  subtitle: {
    fontSize: '15px',
    color: theme.colors.text.secondary,
    maxWidth: '620px',
    lineHeight: 1.6,
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  tileWrap: {
    height: '100%',
  },
  card: {
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '206px',
    height: '100%',
    textDecoration: 'none',
    boxShadow: '0 6px 20px rgba(0,0,0,0.05)',
  },
  featuredCard: {
    border: `1px solid ${theme.colors.primary}35`,
    boxShadow: '0 10px 28px rgba(0,0,0,0.07)',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '16px',
  },
  iconWrapper: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: '19px',
    fontWeight: 700,
    color: theme.colors.text.primary,
    margin: '0 0 8px 0',
    letterSpacing: '-0.01em',
    lineHeight: 1.2,
  },
  badge: {
    fontSize: '11px',
    padding: '6px 10px',
    borderRadius: 999,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
  },
  cardDescription: {
    fontSize: '14px',
    color: theme.colors.text.secondary,
    lineHeight: 1.6,
    margin: 0,
  },
  cardFooter: {
    marginTop: '18px',
    paddingTop: '14px',
    borderTop: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    color: theme.colors.text.muted,
  },
  footerText: {
    fontSize: '12px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: theme.colors.text.muted,
  },
  footerIcon: {
    color: theme.colors.text.muted,
    flexShrink: 0,
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '10px',
    padding: '16px',
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border.light}`,
  },
  statBlock: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  statItem: {
    flex: 1,
    textAlign: 'center',
  },
  statDivider: {
    width: '1px',
    alignSelf: 'stretch',
    background: theme.colors.border.light,
  },
  statNumber: {
    display: 'block',
    fontSize: '26px',
    fontWeight: 800,
    color: theme.colors.primary,
    letterSpacing: '-0.03em',
  },
  statLabel: {
    display: 'block',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: theme.colors.text.muted,
    marginTop: '6px',
  },
};