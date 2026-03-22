'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';

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

  if (loading) return <div style={styles.centered}>Loading dashboard...</div>;
  if (error) return <div style={styles.centered}>Error: {error}</div>;
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

      <div style={styles.subscriptionCard}>
        <div>
          <h2 style={styles.businessName}>{mechanic.business_name}</h2>
          <p style={styles.status}>
            Subscription:{' '}
            <span style={{ color: mechanic.subscription_status === 'active' ? '#22c55e' : '#ef4444' }}>
              {mechanic.subscription_status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </p>
          {mechanic.verified ? (
            <span style={styles.verifiedBadge}>✓ Verified</span>
          ) : (
            <span style={{ ...styles.verifiedBadge, background: '#ef444420', color: '#ef4444' }}>
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
                <tr key={app.id}>
                  <td>{app.job?.title || 'Unknown'}</td>
                  <td>£{app.bid_amount}</td>
                  <td>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background: app.status === 'accepted' ? '#22c55e20' : app.status === 'pending' ? '#f59e0b20' : '#64748b20',
                        color: app.status === 'accepted' ? '#22c55e' : app.status === 'pending' ? '#f59e0b' : '#64748b',
                      }}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td>{new Date(app.created_at).toLocaleDateString()}</td>
                  <td>
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

const styles: { [key: string]: React.CSSProperties } = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'Inter, sans-serif' },
  centered: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' },
  title: { fontSize: 32, fontWeight: 700, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 24 },
  subscriptionCard: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 20, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  businessName: { fontSize: 20, fontWeight: 600, marginBottom: 8 },
  status: { color: '#94a3b8' },
  verifiedBadge: { background: '#22c55e20', color: '#22c55e', padding: '4px 8px', borderRadius: 12, fontSize: 12, marginTop: 8, display: 'inline-block' },
  subscribeButton: { background: '#22c55e', color: '#020617', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 20, marginBottom: 32 },
  statCard: { background: '#0f172a', padding: 20, borderRadius: 12, border: '1px solid #1e293b' },
  statLabel: { fontSize: 14, color: '#64748b', display: 'block' },
  statValue: { fontSize: 28, fontWeight: 700, marginTop: 4 },
  sectionTitle: { fontSize: 20, fontWeight: 600, color: '#94a3b8', marginBottom: 16 },
  tableWrapper: { background: '#0f172a', borderRadius: 12, border: '1px solid #1e293b', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  statusBadge: { padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500, textTransform: 'capitalize' },
  viewButton: { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '4px 8px', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  empty: { color: '#64748b', textAlign: 'center', padding: 40 },
};
