import { supabaseAdmin } from '@/lib/supabase/admin';
import Link from 'next/link';
import { Briefcase, Users, UserCog, ArrowRight, AlertCircle, TrendingUp } from 'lucide-react';
import theme from '@/app/theme';

export const metadata = {
  title: 'Admin Command Center | Yogat Fleet AI',
  description: 'Global platform overview and management.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#020617', // Darker to match our Slate 950 background
};

export default async function AdminDashboardPage() {
  // Concurrent fetching with fail-safes
  const results = await Promise.allSettled([
    supabaseAdmin.from('jobs').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('mechanics').select('*', { count: 'exact', head: true }),
    supabaseAdmin.auth.admin.listUsers()
  ]);

  const jobsCount = results[0].status === 'fulfilled' ? (results[0].value as any).count || 0 : 0;
  const mechanicsCount = results[1].status === 'fulfilled' ? (results[1].value as any).count || 0 : 0;
  const usersCount = results[2].status === 'fulfilled' ? (results[2].value as any).data.users.length || 0 : 0;
  
  // Check if everything failed
  const allFailed = results.every(r => r.status === 'rejected');

  const stats = [
    { label: 'Total Jobs', value: jobsCount, icon: Briefcase, href: '/admin/jobs', color: theme.colors.status.info },
    { label: 'Mechanic Partners', value: mechanicsCount, icon: Users, href: '/admin/mechanics', color: theme.colors.primary },
    { label: 'Registered Users', value: usersCount, icon: UserCog, href: '/admin/users', color: theme.colors.status.warning },
  ];

  if (allFailed) {
    return (
      <div style={styles.errorContainer}>
        <AlertCircle size={48} color={theme.colors.status.critical} />
        <h2 style={{ fontSize: theme.fontSizes['2xl'], fontWeight: '700' }}>System Connectivity Issue</h2>
        <p style={{ color: theme.colors.text.secondary, maxWidth: '400px' }}>
          Unable to establish a connection with the Supabase Admin API. Please verify your Service Role Key.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.badge}>
          <TrendingUp size={12} /> System Live
        </div>
        <h1 style={styles.title}>Admin Dashboard</h1>
        <p style={styles.subtitle}>Real-time metrics and platform control.</p>
      </header>

      <div style={styles.statsGrid}>
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} style={{ textDecoration: 'none' }}>
            <div style={styles.statCard}>
              <div style={{ ...styles.iconBox, background: `${stat.color}15` }}>
                <stat.icon size={24} color={stat.color} />
              </div>
              <div style={styles.statContent}>
                <span style={styles.statValue}>{stat.value.toLocaleString()}</span>
                <span style={styles.statLabel}>{stat.label}</span>
              </div>
              <ArrowRight size={18} style={styles.arrow} />
            </div>
          </Link>
        ))}
      </div>

      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Quick Actions</h2>
        <div style={styles.divider} />
      </div>

      <div style={styles.actionGrid}>
        <ActionCard 
          href="/admin/jobs" 
          icon={Briefcase} 
          title="Manage Jobs" 
          desc="Audit active repair requests and history." 
        />
        <ActionCard 
          href="/admin/mechanics" 
          icon={Users} 
          title="Mechanic Approval" 
          desc="Review pending shop verifications." 
        />
        <ActionCard 
          href="/admin/users" 
          icon={UserCog} 
          title="User Permissions" 
          desc="Adjust roles and account status." 
        />
      </div>
    </div>
  );
}

// Reusable Sub-component (Internal)
function ActionCard({ href, icon: Icon, title, desc }: any) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={styles.actionCard}>
        <div style={styles.actionIconWrapper}>
          <Icon size={20} color={theme.colors.text.primary} />
        </div>
        <div>
          <h3 style={styles.actionTitle}>{title}</h3>
          <p style={styles.actionDesc}>{desc}</p>
        </div>
      </div>
    </Link>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '40px',
    background: theme.colors.background.main,
    minHeight: '100vh',
    fontFamily: theme.fontFamilies.sans,
  },
  header: { marginBottom: '48px' },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    background: `${theme.colors.primary}15`,
    color: theme.colors.primary,
    borderRadius: '99px',
    fontSize: '11px',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '40px',
    fontWeight: '900',
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-1.5px',
    margin: 0,
  },
  subtitle: {
    fontSize: '16px',
    color: theme.colors.text.secondary,
    marginTop: '4px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '64px',
  },
  statCard: {
    background: theme.colors.background.card,
    borderRadius: '24px',
    padding: '32px',
    border: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    cursor: 'pointer',
    position: 'relative',
  },
  iconBox: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: { flex: 1 },
  statValue: {
    fontSize: '32px',
    fontWeight: '800',
    display: 'block',
    color: '#fff',
    lineHeight: 1,
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '14px',
    color: theme.colors.text.muted,
    fontWeight: '500',
  },
  arrow: { color: theme.colors.border.medium },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
    whiteSpace: 'nowrap',
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
  },
  actionIconWrapper: {
    background: '#1e293b',
    padding: '12px',
    borderRadius: '12px',
  },
  actionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#f8fafc',
    margin: 0,
  },
  actionDesc: {
    fontSize: '13px',
    color: '#64748b',
    margin: '2px 0 0 0',
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
  },
};