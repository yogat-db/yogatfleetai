// app/admin/dashboard/page.tsx
import type { CSSProperties, ComponentType } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  TrendingUp,
  UserCog,
  Users,
} from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import theme from '@/app/theme';

export const metadata: Metadata = {
  title: 'Admin Command Center | Yogat Fleet AI',
  description: 'Global platform overview and management.',
};

type IconType = ComponentType<{ size?: number; color?: string }>;

type StatItem = {
  label: string;
  value: number;
  icon: IconType;
  href: string;
  color: string;
};

type ActionCardProps = {
  href: string;
  icon: IconType;
  title: string;
  desc: string;
};

export default async function AdminDashboardPage() {
  const [jobsResult, mechanicsResult, usersResult] = await Promise.allSettled([
    supabaseAdmin.from('jobs').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('mechanics').select('id', { count: 'exact', head: true }),
    supabaseAdmin.auth.admin.listUsers(),
  ]);

  const jobsCount =
    jobsResult.status === 'fulfilled' ? jobsResult.value.count ?? 0 : 0;

  const mechanicsCount =
    mechanicsResult.status === 'fulfilled' ? mechanicsResult.value.count ?? 0 : 0;

  const usersCount =
    usersResult.status === 'fulfilled'
      ? usersResult.value.data?.users?.length ?? 0
      : 0;

  const failedSources = [
    jobsResult.status === 'rejected' ? 'jobs' : null,
    mechanicsResult.status === 'rejected' ? 'mechanics' : null,
    usersResult.status === 'rejected' ? 'users' : null,
  ].filter(Boolean) as string[];

  const allFailed = failedSources.length === 3;

  const stats: StatItem[] = [
    {
      label: 'Total Jobs',
      value: jobsCount,
      icon: Briefcase,
      href: '/admin/jobs',
      color: theme.colors.status.info,
    },
    {
      label: 'Mechanic Partners',
      value: mechanicsCount,
      icon: Users,
      href: '/admin/mechanics',
      color: theme.colors.primary,
    },
    {
      label: 'Registered Users',
      value: usersCount,
      icon: UserCog,
      href: '/admin/users',
      color: theme.colors.status.warning,
    },
  ];

  if (allFailed) {
    return (
      <main style={styles.errorContainer}>
        <AlertCircle size={48} color={theme.colors.status.critical} />
        <h2 style={styles.errorTitle}>System connectivity issue</h2>
        <p style={styles.errorText}>
          Unable to establish a connection with the Supabase Admin API. Please
          verify your service role configuration and connectivity.
        </p>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.badge}>
            <TrendingUp size={12} />
            System live
          </div>

          <h1 style={styles.title}>Admin dashboard</h1>
          <p style={styles.subtitle}>Real-time metrics and platform control.</p>

          {failedSources.length > 0 && (
            <div style={styles.warningBox}>
              <AlertCircle size={14} color={theme.colors.status.warning} />
              Partial data unavailable: {failedSources.join(', ')}
            </div>
          )}
        </header>

        <section aria-label="Admin summary metrics" style={styles.statsGrid}>
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <Link key={stat.label} href={stat.href} style={styles.linkReset}>
                <article style={styles.statCard}>
                  <div
                    style={{
                      ...styles.iconBox,
                      background: `${stat.color}15`,
                    }}
                  >
                    <Icon size={24} color={stat.color} />
                  </div>

                  <div style={styles.statContent}>
                    <span style={styles.statValue}>
                      {stat.value.toLocaleString()}
                    </span>
                    <span style={styles.statLabel}>{stat.label}</span>
                  </div>

                  <ArrowRight size={18} style={styles.arrow} />
                </article>
              </Link>
            );
          })}
        </section>

        <section aria-label="Quick actions">
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Quick actions</h2>
            <div style={styles.divider} />
          </div>

          <div style={styles.actionGrid}>
            <ActionCard
              href="/admin/jobs"
              icon={Briefcase}
              title="Manage jobs"
              desc="Audit active repair requests and history."
            />
            <ActionCard
              href="/admin/mechanics"
              icon={Users}
              title="Mechanic approval"
              desc="Review pending shop verifications."
            />
            <ActionCard
              href="/admin/users"
              icon={UserCog}
              title="User permissions"
              desc="Adjust roles and account status."
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function ActionCard({ href, icon: Icon, title, desc }: ActionCardProps) {
  return (
    <Link href={href} style={styles.linkReset}>
      <article style={styles.actionCard}>
        <div style={styles.actionIconWrapper}>
          <Icon size={20} color={theme.colors.text.primary} />
        </div>

        <div style={styles.actionText}>
          <h3 style={styles.actionTitle}>{title}</h3>
          <p style={styles.actionDesc}>{desc}</p>
        </div>
      </article>
    </Link>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    width: '100%',
    margin: 0,
    padding: 0,
    background: theme.colors.background.main,
    minHeight: '100vh',
  },
  container: {
    padding: '40px',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    background: theme.colors.background.main,
    minHeight: '100vh',
    fontFamily: theme.fontFamilies.sans,
  },
  header: {
    marginBottom: '48px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    background: `${theme.colors.primary}15`,
    color: theme.colors.primary,
    borderRadius: '99px',
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '40px',
    fontWeight: 900,
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-1.5px',
    margin: 0,
    lineHeight: 1.05,
  },
  subtitle: {
    fontSize: '16px',
    color: theme.colors.text.secondary,
    marginTop: '6px',
    marginBottom: 0,
  },
  warningBox: {
    marginTop: '16px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    background: `${theme.colors.status.warning}12`,
    border: `1px solid ${theme.colors.status.warning}30`,
    borderRadius: '14px',
    color: theme.colors.status.warning,
    fontSize: '13px',
    fontWeight: 700,
    flexWrap: 'wrap',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '64px',
  },
  linkReset: {
    textDecoration: 'none',
  },
  statCard: {
    background: theme.colors.background.card,
    borderRadius: '24px',
    padding: '32px',
    border: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    position: 'relative',
    minHeight: '120px',
  },
  iconBox: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statContent: {
    flex: 1,
    minWidth: 0,
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 800,
    display: 'block',
    color: theme.colors.text.primary,
    lineHeight: 1,
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '14px',
    color: theme.colors.text.muted,
    fontWeight: 500,
  },
  arrow: {
    color: theme.colors.border.medium,
    flexShrink: 0,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#fff',
    whiteSpace: 'nowrap',
    margin: 0,
  },
  divider: {
    height: '1px',
    background: theme.colors.border.light,
    width: '100%',
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '16px',
  },
  actionCard: {
    background: '#0f172a80',
    borderRadius: '16px',
    padding: '20px',
    border: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'all 0.2s ease',
    minHeight: '88px',
  },
  actionIconWrapper: {
    background: '#1e293b',
    padding: '12px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionText: {
    minWidth: 0,
  },
  actionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#f8fafc',
    margin: 0,
  },
  actionDesc: {
    fontSize: '13px',
    color: '#64748b',
    margin: '4px 0 0 0',
    lineHeight: 1.5,
  },
  errorContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    background: theme.colors.background.main,
    gap: '16px',
    padding: '24px',
  },
  errorTitle: {
    fontSize: theme.fontSizes['2xl'],
    fontWeight: 700,
    margin: 0,
    color: theme.colors.text.primary,
  },
  errorText: {
    color: theme.colors.text.secondary,
    maxWidth: '400px',
    margin: 0,
    lineHeight: 1.6,
  },
};