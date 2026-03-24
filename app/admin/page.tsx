import { supabaseAdmin } from '@/lib/supabase/admin';
import Link from 'next/link';
import { Briefcase, Users, UserCog, ArrowRight, AlertCircle } from 'lucide-react';
import theme from '@/app/theme';

// ✅ New (correct)
export const metadata = {
  title: 'Admin Dashboard | Yogat Fleet AI',
  description: '...',
  // no viewport fields here
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#22c55e',
};

export default async function AdminDashboardPage() {
  let jobsCount = 0;
  let mechanicsCount = 0;
  let usersCount = 0;
  let error = null;

  try {
    const { count: jobs, error: jobsErr } = await supabaseAdmin
      .from('jobs')
      .select('*', { count: 'exact', head: true });
    if (jobsErr) throw jobsErr;
    jobsCount = jobs || 0;

    const { count: mechanics, error: mechErr } = await supabaseAdmin
      .from('mechanics')
      .select('*', { count: 'exact', head: true });
    if (mechErr) throw mechErr;
    mechanicsCount = mechanics || 0;

    const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers();
    if (usersErr) throw usersErr;
    usersCount = usersData?.users.length || 0;
  } catch (err: any) {
    console.error('Admin dashboard error:', err);
    error = err.message;
  }

  const stats = [
    { label: 'Total Jobs', value: jobsCount, icon: Briefcase, href: '/admin/jobs', color: '#22c55e' },
    { label: 'Total Mechanics', value: mechanicsCount, icon: Users, href: '/admin/mechanics', color: '#3b82f6' },
    { label: 'Total Users', value: usersCount, icon: UserCog, href: '/admin/users', color: '#f59e0b' },
  ];

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <AlertCircle size={48} color={theme.colors.error} />
        <h2>Unable to load admin data</h2>
        <p>{error}</p>
        <p>Check that Supabase environment variables are set correctly and the service role key has permission.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Admin Dashboard</h1>
      <p style={styles.subtitle}>Manage your platform from one place</p>

      <div style={styles.statsGrid}>
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} style={{ textDecoration: 'none' }}>
            <div style={styles.statCard}>
              <stat.icon size={32} color={stat.color} />
              <div style={styles.statContent}>
                <span style={styles.statValue}>{stat.value}</span>
                <span style={styles.statLabel}>{stat.label}</span>
              </div>
              <ArrowRight size={18} style={styles.arrow} />
            </div>
          </Link>
        ))}
      </div>

      <h2 style={styles.sectionTitle}>Quick Actions</h2>
      <div style={styles.actionGrid}>
        <Link href="/admin/jobs" style={{ textDecoration: 'none' }}>
          <div style={styles.actionCard}>
            <Briefcase size={24} color={theme.colors.primary} />
            <div>
              <h3>Manage Jobs</h3>
              <p>View, edit, or delete repair jobs</p>
            </div>
          </div>
        </Link>
        <Link href="/admin/mechanics" style={{ textDecoration: 'none' }}>
          <div style={styles.actionCard}>
            <Users size={24} color={theme.colors.primary} />
            <div>
              <h3>Manage Mechanics</h3>
              <p>Verify, edit, or remove mechanics</p>
            </div>
          </div>
        </Link>
        <Link href="/admin/users" style={{ textDecoration: 'none' }}>
          <div style={styles.actionCard}>
            <UserCog size={24} color={theme.colors.primary} />
            <div>
              <h3>Manage Users</h3>
              <p>Promote users to admin, view details</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

// Inline styles – no CSS module required, no :hover pseudo‑class
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: theme.spacing[10],
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: theme.colors.text.primary,
    fontFamily: theme.fontFamilies.sans,
  },
  title: {
    fontSize: theme.fontSizes['4xl'],
    fontWeight: theme.fontWeights.bold,
    marginBottom: theme.spacing[2],
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: theme.fontSizes.base,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[8],
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: theme.spacing[6],
    marginBottom: theme.spacing[12],
  },
  statCard: {
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[6],
    border: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[4],
    transition: 'transform 0.2s ease, box-shadow 0.2s ease', // no :hover, but element will still transform if we add JS hover? We'll omit hover to avoid inline pseudo.
    cursor: 'pointer',
  },
  statContent: { flex: 1 },
  statValue: {
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.bold,
    display: 'block',
    color: theme.colors.text.primary,
  },
  statLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.muted,
  },
  arrow: { color: theme.colors.text.muted },
  sectionTitle: {
    fontSize: theme.fontSizes['2xl'],
    fontWeight: theme.fontWeights.semibold,
    marginBottom: theme.spacing[6],
    color: theme.colors.text.primary,
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: theme.spacing[4],
  },
  actionCard: {
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    border: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[4],
    transition: 'background 0.2s ease',
    cursor: 'pointer',
  },
  errorContainer: {
    padding: theme.spacing[10],
    background: theme.colors.background.main,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: theme.colors.text.primary,
    gap: theme.spacing[4],
  },
};