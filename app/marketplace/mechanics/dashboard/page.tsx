// app/marketplace/mechanics/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Briefcase, DollarSign, CheckCircle, AlertCircle,
  TrendingUp, Users, Calendar, CreditCard, Car,
  PlusCircle, Eye, RefreshCw, Star, MapPin
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

// ==================== TYPES ====================
interface MechanicProfile {
  id: string;
  business_name: string;
  phone: string | null;
  address: string | null;
  verified: boolean;
  subscription_status: 'active' | 'inactive' | 'trialing' | 'past_due' | 'cancelled';
  plan?: 'basic' | 'pro' | null;
  created_at: string;
}

interface Job {
  id: string;
  title: string;
  description: string;
  budget: number;
  status: string;
  location?: string;
  created_at: string;
  vehicle?: { make: string; model: string; license_plate: string };
}

interface Application {
  id: string;
  job_id: string;
  bid_amount: number | null;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  created_at: string;
  job?: Job;
}

interface Earning {
  id: string;
  amount: number;
  status: 'pending' | 'paid';
  description: string;
  created_at: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  license_plate: string;
  health_score: number | null;
  year?: number | null;
  mileage?: number | null;
}

// ==================== HELPER ====================
const getThemeValue = (path: string, fallback: any): any => {
  const parts = path.split('.');
  let current: any = theme;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return fallback;
    }
  }
  return current;
};

const getHealthBadgeStyle = (score: number | null) => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '20px',
  fontSize: '11px',
  fontWeight: 500,
  backgroundColor: (score ?? 0) >= 80 ? '#22c55e20' : (score ?? 0) >= 50 ? '#f59e0b20' : '#ef444420',
  color: (score ?? 0) >= 80 ? '#22c55e' : (score ?? 0) >= 50 ? '#f59e0b' : '#ef4444',
});

// ==================== MAIN COMPONENT ====================
export default function MechanicMarketplaceDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<MechanicProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingScores, setUpdatingScores] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setRefreshing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. Mechanic profile
      const { data: mechanicProfile, error: profileError } = await supabase
        .from('mechanics')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!mechanicProfile) {
        router.push('/marketplace/mechanics/register');
        return;
      }
      setProfile(mechanicProfile);

      // 2. Applications (bids) with job details
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          *,
          job:jobs (
            id, title, description, budget, status, location, created_at,
            vehicle:vehicles (make, model, license_plate)
          )
        `)
        .eq('mechanic_id', mechanicProfile.id)
        .order('created_at', { ascending: false });

      if (!appsError && appsData) {
        setApplications(appsData as Application[]);
      } else {
        setApplications([]);
      }

      // 3. Earnings
      const { data: earningsData, error: earningsError } = await supabase
        .from('earnings')
        .select('*')
        .eq('mechanic_id', mechanicProfile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!earningsError && earningsData) {
        setEarnings(earningsData);
      } else {
        setEarnings([]);
      }

      // 4. Vehicles (fleet) – include year and mileage for table display
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, make, model, license_plate, health_score, year, mileage')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!vehiclesError && vehiclesData) {
        setVehicles(vehiclesData);
      } else {
        setVehicles([]);
      }

      // 5. Available open jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          id, title, description, budget, status, location, created_at,
          vehicle:vehicles (make, model, license_plate)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!jobsError && jobsData) {
        const mappedJobs: Job[] = jobsData.map((job: any) => ({
          id: job.id,
          title: job.title,
          description: job.description,
          budget: job.budget,
          status: job.status,
          location: job.location,
          created_at: job.created_at,
          vehicle: job.vehicle ? {
            make: job.vehicle.make,
            model: job.vehicle.model,
            license_plate: job.vehicle.license_plate,
          } : undefined,
        }));
        setAvailableJobs(mappedJobs);
      } else {
        setAvailableJobs([]);
      }
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Health score updater
  const refreshHealthScores = async () => {
    setUpdatingScores(true);
    try {
      const res = await fetch('/api/vehicles/update-health-scores', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`Updated health scores for ${data.updated} vehicles`);
        fetchData(); // refresh dashboard
      } else {
        alert(data.error || 'Failed to update scores');
      }
    } catch (err) {
      alert('Error updating scores');
    } finally {
      setUpdatingScores(false);
    }
  };

  // Derived stats
  const totalApplications = applications.length;
  const acceptedApplications = applications.filter(a => a.status === 'accepted').length;
  const totalEarnings = earnings.reduce((sum, e) => sum + (e.status === 'paid' ? e.amount : 0), 0);
  const isSubscribed = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing';

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  if (loading && !refreshing) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading dashboard...</p>
        <style jsx>{`
          .spinner {
            border: 3px solid ${getThemeValue('colors.border.medium', '#334155')};
            border-top: 3px solid ${getThemeValue('colors.primary', '#22c55e')};
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

  if (error && !refreshing) {
    return (
      <div style={styles.centered}>
        <p style={{ color: getThemeValue('colors.error', '#ef4444') }}>Error: {error}</p>
        <button onClick={handleRefresh} style={styles.retryButton}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      {/* Header */}
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Mechanic Marketplace</h1>
          <p style={styles.subtitle}>
            {profile?.business_name}
            {profile?.verified ? (
              <span style={styles.verifiedBadge}> ✓ Verified</span>
            ) : (
              <span style={styles.pendingBadge}> ⏳ Pending verification</span>
            )}
            {!isSubscribed && (
              <button onClick={() => router.push('/marketplace/mechanics/subscribe')} style={styles.subscribeBadge}>
                <CreditCard size={14} /> Subscribe
              </button>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleRefresh} style={styles.refreshButton} disabled={refreshing}>
            {refreshing ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
            {refreshing ? ' Refreshing...' : ' Refresh'}
          </button>
          <button onClick={refreshHealthScores} disabled={updatingScores} style={styles.refreshButton}>
            {updatingScores ? 'Updating...' : 'Update Health Scores'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <Briefcase size={24} color={getThemeValue('colors.info', '#3b82f6')} />
          <div><span style={styles.statValue}>{totalApplications}</span><span style={styles.statLabel}>Applications</span></div>
        </div>
        <div style={styles.statCard}>
          <CheckCircle size={24} color={getThemeValue('colors.status.healthy', '#22c55e')} />
          <div><span style={styles.statValue}>{acceptedApplications}</span><span style={styles.statLabel}>Accepted</span></div>
        </div>
        <div style={styles.statCard}>
          <DollarSign size={24} color={getThemeValue('colors.primary', '#22c55e')} />
          <div><span style={styles.statValue}>£{totalEarnings}</span><span style={styles.statLabel}>Total Earnings</span></div>
        </div>
        <div style={styles.statCard}>
          <Car size={24} color={getThemeValue('colors.warning', '#f59e0b')} />
          <div><span style={styles.statValue}>{vehicles.length}</span><span style={styles.statLabel}>Fleet Vehicles</span></div>
        </div>
      </div>

      {/* Two‑column layout */}
      <div style={styles.twoColumn}>
        {/* Left column: Recent Applications */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Briefcase size={20} color={getThemeValue('colors.primary', '#22c55e')} />
            <h2 style={styles.cardTitle}>Recent Applications</h2>
            <button onClick={() => router.push('/marketplace/jobs')} style={styles.linkButton}>
              Browse more jobs →
            </button>
          </div>
          {applications.length === 0 ? (
            <div style={styles.emptyState}>
              <p>You haven't applied to any jobs yet.</p>
              <button onClick={() => router.push('/marketplace/jobs')} style={styles.smallButton}>
                <PlusCircle size={16} /> Browse Jobs
              </button>
            </div>
          ) : (
            <div>
              {applications.slice(0, 5).map(app => (
                <div key={app.id} style={styles.applicationItem}>
                  <div style={styles.applicationHeader}>
                    <strong>{app.job?.title || 'Job'}</strong>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: app.status === 'pending' ? '#f59e0b20' : app.status === 'accepted' ? '#22c55e20' : '#64748b20',
                      color: app.status === 'pending' ? '#f59e0b' : app.status === 'accepted' ? '#22c55e' : '#64748b',
                    }}>
                      {app.status}
                    </span>
                  </div>
                  <div style={styles.applicationDetails}>
                    {app.bid_amount && <span>Bid: £{app.bid_amount}</span>}
                    <span>Applied: {new Date(app.created_at).toLocaleDateString()}</span>
                  </div>
                  {app.status === 'accepted' && (
                    <button onClick={() => router.push(`/marketplace/jobs/${app.job_id}`)} style={styles.viewButton}>
                      View Job
                    </button>
                  )}
                </div>
              ))}
              {totalApplications > 5 && (
                <button onClick={() => router.push('/mechanics/applications')} style={styles.linkButton}>
                  View all {totalApplications} applications
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right column: Recent Earnings & Subscription */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <DollarSign size={20} color={getThemeValue('colors.primary', '#22c55e')} />
            <h2 style={styles.cardTitle}>Recent Earnings</h2>
          </div>
          {earnings.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No earnings yet. Complete jobs to get paid.</p>
            </div>
          ) : (
            <div>
              {earnings.map(earning => (
                <div key={earning.id} style={styles.earningItem}>
                  <div style={styles.earningHeader}>
                    <span>£{earning.amount.toFixed(2)}</span>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: earning.status === 'paid' ? '#22c55e20' : '#f59e0b20',
                      color: earning.status === 'paid' ? '#22c55e' : '#f59e0b',
                    }}>
                      {earning.status}
                    </span>
                  </div>
                  <div style={styles.earningDetails}>
                    {earning.description} – {new Date(earning.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
              <button onClick={() => router.push('/mechanics/earnings')} style={styles.linkButton}>
                View all earnings
              </button>
            </div>
          )}

          <div style={styles.divider} />

          <div style={styles.cardHeader}>
            <CreditCard size={20} color={getThemeValue('colors.primary', '#22c55e')} />
            <h2 style={styles.cardTitle}>Subscription</h2>
          </div>
          <div style={styles.subscriptionInfo}>
            <p>Current plan: <strong>{profile?.plan || 'None'}</strong></p>
            <p>Status: <span style={{ color: isSubscribed ? '#22c55e' : '#f59e0b' }}>{isSubscribed ? 'Active' : 'Inactive'}</span></p>
            {!isSubscribed && (
              <button onClick={() => router.push('/marketplace/mechanics/subscribe')} style={styles.primaryButton}>
                Upgrade to Professional
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Available Jobs Section */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <TrendingUp size={20} color={getThemeValue('colors.primary', '#22c55e')} />
          <h2 style={styles.cardTitle}>Available Jobs Near You</h2>
          <button onClick={() => router.push('/marketplace/jobs')} style={styles.linkButton}>
            View all →
          </button>
        </div>
        {availableJobs.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No open jobs at the moment. Check back later.</p>
          </div>
        ) : (
          <div style={styles.jobsGrid}>
            {availableJobs.map(job => (
              <div key={job.id} style={styles.jobCard}>
                <h3 style={styles.jobTitle}>{job.title}</h3>
                <p style={styles.jobDescription}>{job.description?.slice(0, 80)}...</p>
                <div style={styles.jobMeta}>
                  <span><DollarSign size={14} /> £{job.budget}</span>
                  {job.location && <span><MapPin size={14} /> {job.location}</span>}
                </div>
                <button onClick={() => router.push(`/marketplace/jobs/${job.id}/apply`)} style={styles.applyButton}>
                  Apply Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fleet Overview – Table format */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <Car size={20} color={getThemeValue('colors.primary', '#22c55e')} />
          <h2 style={styles.cardTitle}>Your Fleet Overview</h2>
          <button onClick={() => router.push('/vehicles/add')} style={styles.linkButton}>
            <PlusCircle size={16} /> Add Vehicle
          </button>
        </div>
        {vehicles.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No vehicles registered yet.</p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Make & Model</th>
                  <th>License Plate</th>
                  <th>Health</th>
                  <th>Year</th>
                  <th>Mileage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map(vehicle => (
                  <tr key={vehicle.id}>
                    <td>{vehicle.make} {vehicle.model}</td>
                    <td>{vehicle.license_plate}</td>
                    <td>
                      <span style={getHealthBadgeStyle(vehicle.health_score)}>
                        {vehicle.health_score ?? '—'}%
                      </span>
                    </td>
                    <td>{vehicle.year ?? '—'}</td>
                    <td>{vehicle.mileage?.toLocaleString() ?? '—'} mi</td>
                    <td>
                      <button onClick={() => router.push(`/vehicles/${vehicle.license_plate}`)} style={styles.iconButton}>
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Profile Completion Reminder */}
      {(!profile?.address || !profile?.phone) && (
        <div style={styles.warningCard}>
          <AlertCircle size={20} color={getThemeValue('colors.warning', '#f59e0b')} />
          <span>Your profile is incomplete. <button onClick={() => router.push('/marketplace/mechanics/register')} style={styles.linkButton}>Update now</button></span>
        </div>
      )}
    </motion.div>
  );
}

// ==================== STYLES ====================
const styles: Record<string, any> = {
  page: {
    padding: getThemeValue('spacing.8', '32px'),
    background: getThemeValue('colors.background.main', '#020617'),
    minHeight: '100vh',
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
    fontFamily: getThemeValue('fontFamilies.sans', 'Inter, sans-serif'),
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getThemeValue('spacing.6', '24px'),
    flexWrap: 'wrap',
    gap: getThemeValue('spacing.4', '16px'),
  },
  title: {
    fontSize: getThemeValue('fontSizes.3xl', '32px'),
    fontWeight: getThemeValue('fontWeights.bold', '700'),
    marginBottom: getThemeValue('spacing.1', '4px'),
    background: getThemeValue('gradients.title', 'linear-gradient(135deg, #94a3b8, #f1f5f9)'),
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: getThemeValue('fontSizes.base', '16px'),
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  verifiedBadge: { color: '#22c55e' },
  pendingBadge: { color: '#f59e0b' },
  subscribeBadge: {
    background: getThemeValue('colors.primary', '#22c55e'),
    border: 'none',
    borderRadius: '20px',
    padding: '4px 12px',
    color: '#020617',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  refreshButton: {
    padding: `${getThemeValue('spacing.2', '8px')} ${getThemeValue('spacing.4', '16px')}`,
    background: getThemeValue('colors.background.card', '#0f172a'),
    border: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
    borderRadius: getThemeValue('borderRadius.lg', '12px'),
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: getThemeValue('spacing.2', '8px'),
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: getThemeValue('spacing.4', '16px'),
    marginBottom: getThemeValue('spacing.6', '24px'),
  },
  statCard: {
    background: getThemeValue('colors.background.card', '#0f172a'),
    border: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
    borderRadius: getThemeValue('borderRadius.lg', '12px'),
    padding: getThemeValue('spacing.4', '16px'),
    display: 'flex',
    alignItems: 'center',
    gap: getThemeValue('spacing.3', '12px'),
  },
  statValue: {
    fontSize: getThemeValue('fontSizes.2xl', '24px'),
    fontWeight: getThemeValue('fontWeights.bold', '700'),
    display: 'block',
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
  },
  statLabel: {
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    color: getThemeValue('colors.text.muted', '#64748b'),
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: getThemeValue('spacing.6', '24px'),
    marginBottom: getThemeValue('spacing.6', '24px'),
  },
  card: {
    background: getThemeValue('colors.background.card', '#0f172a'),
    border: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
    borderRadius: getThemeValue('borderRadius.xl', '16px'),
    padding: getThemeValue('spacing.5', '20px'),
    marginBottom: getThemeValue('spacing.6', '24px'),
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: getThemeValue('spacing.2', '8px'),
    marginBottom: getThemeValue('spacing.4', '16px'),
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: getThemeValue('fontSizes.lg', '18px'),
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
    flex: 1,
  },
  linkButton: {
    background: 'transparent',
    border: 'none',
    color: getThemeValue('colors.primary', '#22c55e'),
    cursor: 'pointer',
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    textDecoration: 'underline',
  },
  smallButton: {
    padding: `${getThemeValue('spacing.1', '4px')} ${getThemeValue('spacing.3', '12px')}`,
    background: getThemeValue('colors.primary', '#22c55e'),
    border: 'none',
    borderRadius: getThemeValue('borderRadius.lg', '12px'),
    color: getThemeValue('colors.background.main', '#020617'),
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: getThemeValue('spacing.1', '4px'),
  },
  primaryButton: {
    marginTop: getThemeValue('spacing.3', '12px'),
    padding: `${getThemeValue('spacing.2', '8px')} ${getThemeValue('spacing.4', '16px')}`,
    background: getThemeValue('colors.primary', '#22c55e'),
    border: 'none',
    borderRadius: getThemeValue('borderRadius.lg', '12px'),
    color: getThemeValue('colors.background.main', '#020617'),
    fontWeight: getThemeValue('fontWeights.medium', '500'),
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: getThemeValue('spacing.6', '24px'),
    color: getThemeValue('colors.text.muted', '#64748b'),
  },
  applicationItem: {
    marginBottom: getThemeValue('spacing.3', '12px'),
    paddingBottom: getThemeValue('spacing.2', '8px'),
    borderBottom: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
  },
  applicationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getThemeValue('spacing.1', '4px'),
  },
  applicationDetails: {
    display: 'flex',
    gap: getThemeValue('spacing.3', '12px'),
    fontSize: getThemeValue('fontSizes.xs', '12px'),
    color: getThemeValue('colors.text.muted', '#64748b'),
    marginBottom: getThemeValue('spacing.1', '4px'),
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  viewButton: {
    background: 'transparent',
    border: `1px solid ${getThemeValue('colors.primary', '#22c55e')}`,
    borderRadius: getThemeValue('borderRadius.md', '8px'),
    padding: '4px 12px',
    color: getThemeValue('colors.primary', '#22c55e'),
    fontSize: getThemeValue('fontSizes.xs', '12px'),
    cursor: 'pointer',
    marginTop: getThemeValue('spacing.1', '4px'),
  },
  earningItem: {
    marginBottom: getThemeValue('spacing.3', '12px'),
    paddingBottom: getThemeValue('spacing.2', '8px'),
    borderBottom: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
  },
  earningHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getThemeValue('spacing.1', '4px'),
  },
  earningDetails: {
    fontSize: getThemeValue('fontSizes.xs', '12px'),
    color: getThemeValue('colors.text.muted', '#64748b'),
  },
  divider: {
    margin: `${getThemeValue('spacing.4', '16px')} 0`,
    borderTop: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
  },
  subscriptionInfo: {
    padding: getThemeValue('spacing.2', '8px'),
  },
  jobsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: getThemeValue('spacing.4', '16px'),
  },
  jobCard: {
    background: getThemeValue('colors.background.elevated', '#1e293b'),
    borderRadius: getThemeValue('borderRadius.lg', '12px'),
    padding: getThemeValue('spacing.4', '16px'),
    border: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
  },
  jobTitle: {
    fontSize: getThemeValue('fontSizes.base', '16px'),
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    marginBottom: getThemeValue('spacing.2', '8px'),
  },
  jobDescription: {
    fontSize: getThemeValue('fontSizes.xs', '12px'),
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
    marginBottom: getThemeValue('spacing.2', '8px'),
  },
  jobMeta: {
    display: 'flex',
    gap: getThemeValue('spacing.2', '8px'),
    fontSize: getThemeValue('fontSizes.xs', '12px'),
    color: getThemeValue('colors.text.muted', '#64748b'),
    marginBottom: getThemeValue('spacing.3', '12px'),
  },
  applyButton: {
    width: '100%',
    background: getThemeValue('colors.primary', '#22c55e'),
    border: 'none',
    borderRadius: getThemeValue('borderRadius.md', '8px'),
    padding: getThemeValue('spacing.2', '8px'),
    color: getThemeValue('colors.background.main', '#020617'),
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    cursor: 'pointer',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: getThemeValue('fontSizes.sm', '14px'),
  },
  iconButton: {
    background: 'transparent',
    border: 'none',
    color: getThemeValue('colors.primary', '#22c55e'),
    cursor: 'pointer',
    padding: getThemeValue('spacing.1', '4px'),
  },
  warningCard: {
    display: 'flex',
    alignItems: 'center',
    gap: getThemeValue('spacing.3', '12px'),
    background: `${getThemeValue('colors.warning', '#f59e0b')}20`,
    border: `1px solid ${getThemeValue('colors.warning', '#f59e0b')}`,
    borderRadius: getThemeValue('borderRadius.lg', '12px'),
    padding: getThemeValue('spacing.4', '16px'),
    marginTop: getThemeValue('spacing.4', '16px'),
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
  },
  retryButton: {
    marginTop: getThemeValue('spacing.4', '16px'),
    padding: `${getThemeValue('spacing.2', '8px')} ${getThemeValue('spacing.4', '16px')}`,
    background: getThemeValue('colors.primary', '#22c55e'),
    border: 'none',
    borderRadius: getThemeValue('borderRadius.lg', '12px'),
    color: getThemeValue('colors.background.main', '#020617'),
    cursor: 'pointer',
  },
};