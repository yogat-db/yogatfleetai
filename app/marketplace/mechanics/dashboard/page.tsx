'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Briefcase, CreditCard, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

type Mechanic = {
  id: string;
  business_name: string;
  phone: string | null;
  verified: boolean;
  subscription_status: string;
  stripe_account_id: string | null;
};

type Application = {
  id: string;
  job_id: string;
  bid_amount: number;
  status: string;
  created_at: string;
  job?: { title: string };
};

export default function MechanicDashboardPage() {
  const router = useRouter();
  const [mechanic, setMechanic] = useState<Mechanic | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/login');
        return;
      }

      // Check admin
      if (user.email === 'teebaxy@gmail.com') setIsAdmin(true);

      const { data: mech, error: mechError } = await supabase
        .from('mechanics')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (mechError || !mech) {
        router.push('/marketplace/mechanics/register');
        return;
      }
 
      setMechanic(mech);

      // If subscription is not active, redirect to subscribe
      if (mech.subscription_status !== 'active') {
        router.push('/marketplace/mechanics/subscribe');
        return;
      }

      const { data: apps, error: appsError } = await supabase
        .from('applications')
        .select(`
          *,
          job:jobs(title)
        `)
        .eq('mechanic_id', mech.id)
        .order('created_at', { ascending: false });

      if (!appsError && apps) setApplications(apps);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading dashboard...</p>
        <style jsx>{`
          .spinner {
            border: 3px solid ${theme.colors.border.medium};
            border-top: 3px solid ${theme.colors.primary};
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

  if (error) {
    return (
      <div style={styles.centered}>
        <p style={{ color: theme.colors.error }}>Error: {error}</p>
        <button onClick={fetchData} style={styles.retryButton}>Retry</button>
      </div>
    );
  }

  if (!mechanic) return null;

  const pending = applications.filter(a => a.status === 'pending').length;
  const accepted = applications.filter(a => a.status === 'accepted').length;
  const completed = applications.filter(a => a.status === 'completed').length;
  const totalEarned = applications
    .filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + a.bid_amount, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <h1 style={styles.title}>Mechanic Dashboard</h1>

      {/* Subscription & verification status */}
      <div style={styles.subscriptionCard}>
        <div>
          <h2 style={styles.businessName}>{mechanic.business_name}</h2>
          <p style={styles.status}>
            Subscription:{' '}
            <span style={{ color: mechanic.subscription_status === 'active' ? theme.colors.primary : theme.colors.error }}>
              {mechanic.subscription_status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </p>
          {mechanic.verified ? (
            <span style={styles.verifiedBadge}>✓ Verified</span>
          ) : (
            <span style={{ ...styles.verifiedBadge, background: `${theme.colors.error}20`, color: theme.colors.error }}>
              ⚠️ Not Verified – Complete your profile
            </span>
          )}
        </div>
        {mechanic.subscription_status !== 'active' && (
          <button onClick={() => router.push('/marketplace/mechanics/subscribe')} style={styles.subscribeButton}>
            Subscribe Now
          </button>
        )}
      </div>

      {/* Quick actions */}
      <div style={styles.quickActions}>
        <div style={styles.actionCard} onClick={() => router.push('/marketplace/jobs')}>
          <Briefcase size={24} color={theme.colors.primary} />
          <div>
            <h3>Browse Jobs</h3>
            <p>Find new repair jobs to apply for</p>
          </div>
        </div>
        <div style={styles.actionCard} onClick={() => router.push('/marketplace/mechanics/subscribe')}>
          <CreditCard size={24} color={theme.colors.primary} />
          <div>
            <h3>Manage Subscription</h3>
            <p>Upgrade or change your plan</p>
          </div>
        </div>
        {isAdmin && (
          <div style={styles.actionCard} onClick={() => router.push('/admin')}>
            <Users size={24} color={theme.colors.primary} />
            <div>
              <h3>Admin Dashboard</h3>
              <p>Manage jobs, mechanics, users</p>
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total Applications</span>
          <span style={styles.statValue}>{applications.length}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Pending</span>
          <span style={styles.statValue}>{pending}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Accepted</span>
          <span style={styles.statValue}>{accepted}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Completed</span>
          <span style={styles.statValue}>{completed}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total Earned</span>
          <span style={styles.statValue}>£{totalEarned}</span>
        </div>
      </div>

      {/* Recent Applications */}
      <h2 style={styles.sectionTitle}>Recent Applications</h2>
      {applications.length === 0 ? (
        <p style={styles.empty}>You haven’t applied to any jobs yet. Browse the marketplace to start.</p>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Bid</th>
                <th>Status</th>
                <th>Applied</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.slice(0, 5).map(app => (
                <tr key={app.id} style={styles.tableRow}>
                  <td style={styles.tableCell}>{app.job?.title || 'Unknown'}</td>
                  <td style={styles.tableCell}>£{app.bid_amount}</td>
                  <td style={styles.tableCell}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background: app.status === 'accepted' ? `${theme.colors.primary}20` : app.status === 'pending' ? `${theme.colors.warning}20` : `${theme.colors.text.muted}20`,
                        color: app.status === 'accepted' ? theme.colors.primary : app.status === 'pending' ? theme.colors.warning : theme.colors.text.muted,
                      }}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td style={styles.tableCell}>{new Date(app.created_at).toLocaleDateString()}</td>
                  <td style={styles.tableCell}>
                    <button onClick={() => router.push(`/marketplace/jobs/${app.job_id}`)} style={styles.viewButton}>
                      View Job
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: theme.spacing[10],
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: theme.colors.text.primary,
    fontFamily: theme.fontFamilies.sans,
  },
  title: {
    fontSize: theme.fontSizes['4xl'],
    fontWeight: theme.fontWeights.bold,
    marginBottom: theme.spacing[6],
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subscriptionCard: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[5],
    marginBottom: theme.spacing[6],
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  businessName: {
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.semibold,
    marginBottom: theme.spacing[1],
  },
  status: {
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[1],
  },
  verifiedBadge: {
    background: `${theme.colors.primary}20`,
    color: theme.colors.primary,
    padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSizes.xs,
    display: 'inline-block',
  },
  subscribeButton: {
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    color: theme.colors.background.main,
    fontWeight: theme.fontWeights.semibold,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: theme.spacing[5],
    marginBottom: theme.spacing[8],
  },
  actionCard: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[5],
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[4],
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: theme.spacing[4],
    marginBottom: theme.spacing[8],
  },
  statCard: {
    background: theme.colors.background.card,
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    border: `1px solid ${theme.colors.border.light}`,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.muted,
    display: 'block',
    marginBottom: theme.spacing[1],
  },
  statValue: {
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.text.primary,
  },
  sectionTitle: {
    fontSize: theme.fontSizes['2xl'],
    fontWeight: theme.fontWeights.semibold,
    marginBottom: theme.spacing[4],
    color: theme.colors.text.primary,
  },
  tableWrapper: {
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    overflow: 'auto',
    border: `1px solid ${theme.colors.border.light}`,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: theme.fontSizes.sm,
  },
  tableRow: {
    borderBottom: `1px solid ${theme.colors.border.light}`,
  },
  tableCell: {
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
  },
  statusBadge: {
    display: 'inline-block',
    padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.medium,
    textTransform: 'capitalize',
  },
  viewButton: {
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors.text.secondary,
  },
  retryButton: {
    marginTop: theme.spacing[4],
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    background: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    color: theme.colors.background.main,
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    padding: theme.spacing[12],
    color: theme.colors.text.muted,
  },
};
