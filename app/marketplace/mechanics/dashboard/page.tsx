'use client';

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

type SubscriptionStatus = 'active' | 'inactive' | 'trialing' | 'past_due' | 'cancelled';
type MechanicPlan = 'basic' | 'pro' | null;
type JobStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'completed';
type EarningStatus = 'pending' | 'paid';

interface MechanicProfile {
  id: string;
  business_name: string;
  phone: string | null;
  address: string | null;
  verified: boolean;
  subscription_status: SubscriptionStatus;
  plan: MechanicPlan;
  created_at: string;
  rating?: number | null;
}

interface VehiclePreview {
  make: string | null;
  model: string | null;
  license_plate: string | null;
}

interface Job {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  status: JobStatus;
  location: string | null;
  created_at: string;
  assigned_mechanic_id: string | null;
  vehicle?: VehiclePreview;
}

interface Application {
  id: string;
  job_id: string;
  bid_amount: number | null;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
  job?: Job;
}

interface Earning {
  id: string;
  amount: number;
  status: EarningStatus;
  description: string;
  created_at: string;
}

interface ApplicationQueryRow {
  id: string;
  job_id: string;
  bid_amount: number | null;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
  job?:
    | {
        id: string;
        title: string;
        description: string;
        budget: number | null;
        status: JobStatus;
        location: string | null;
        created_at: string;
        assigned_mechanic_id?: string | null;
        vehicle?: VehiclePreview | VehiclePreview[] | null;
      }
    | {
        id: string;
        title: string;
        description: string;
        budget: number | null;
        status: JobStatus;
        location: string | null;
        created_at: string;
        assigned_mechanic_id?: string | null;
        vehicle?: VehiclePreview | VehiclePreview[] | null;
      }[]
    | null;
}

interface JobQueryRow {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  status: JobStatus;
  location: string | null;
  created_at: string;
  assigned_mechanic_id?: string | null;
  vehicle?: VehiclePreview | VehiclePreview[] | null;
}

interface DashboardData {
  profile: MechanicProfile;
  applications: Application[];
  earnings: Earning[];
  assignedJobs: Job[];
  availableJobs: Job[];
}

type LoadState = 'initial' | 'ready' | 'error';

const getThemeValue = (path: string, fallback: string): string => {
  const parts = path.split('.');
  let current: unknown = theme;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return fallback;
    }
  }

  return typeof current === 'string' ? current : fallback;
};

const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return 'TBD';
  return `£${value.toFixed(0)}`;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const truncate = (value: string | null | undefined, length: number) => {
  if (!value) return '';
  return value.length > length ? `${value.slice(0, length)}…` : value;
};

const normalizeVehicle = (
  vehicle: VehiclePreview | VehiclePreview[] | null | undefined
): VehiclePreview | undefined => {
  if (!vehicle) return undefined;
  return Array.isArray(vehicle) ? vehicle[0] : vehicle;
};

const normalizeJob = (job: JobQueryRow | JobQueryRow[] | null | undefined): Job | undefined => {
  if (!job) return undefined;
  const row = Array.isArray(job) ? job[0] : job;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    budget: row.budget ?? null,
    status: row.status,
    location: row.location ?? null,
    created_at: row.created_at,
    assigned_mechanic_id: row.assigned_mechanic_id ?? null,
    vehicle: normalizeVehicle(row.vehicle),
  };
};

const getStatusMeta = (status: ApplicationStatus | JobStatus) => {
  if (status === 'accepted' || status === 'assigned') {
    return { bg: '#22c55e20', color: '#22c55e', label: status.replaceAll('_', ' ') };
  }
  if (status === 'pending' || status === 'in_progress' || status === 'open') {
    return { bg: '#f59e0b20', color: '#f59e0b', label: status.replaceAll('_', ' ') };
  }
  if (status === 'completed') {
    return { bg: '#3b82f620', color: '#60a5fa', label: 'completed' };
  }
  return { bg: '#64748b20', color: '#94a3b8', label: status.replaceAll('_', ' ') };
};

async function getDashboardData(router: ReturnType<typeof useRouter>): Promise<DashboardData | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const { data: mechanicProfile, error: profileError } = await supabase
    .from('mechanics')
    .select('id, business_name, phone, address, verified, subscription_status, plan, created_at, rating')
    .eq('user_id', user.id)
    .maybeSingle<MechanicProfile>();

  if (profileError) throw profileError;

  if (!mechanicProfile) {
    router.push('/marketplace/mechanics/register');
    return null;
  }

  const [appsResult, earningsResult, assignedJobsResult, jobsResult] = await Promise.all([
    supabase
      .from('applications')
      .select(`
        id,
        job_id,
        bid_amount,
        message,
        status,
        created_at,
        job:jobs (
          id,
          title,
          description,
          budget,
          status,
          location,
          created_at,
          assigned_mechanic_id,
          vehicle:vehicles (make, model, license_plate)
        )
      `)
      .eq('mechanic_id', mechanicProfile.id)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('earnings')
      .select('id, amount, status, created_at')
      .eq('mechanic_id', mechanicProfile.id)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('jobs')
      .select(`
        id,
        title,
        description,
        budget,
        status,
        location,
        created_at,
        assigned_mechanic_id,
        vehicle:vehicles (make, model, license_plate)
      `)
      .eq('assigned_mechanic_id', mechanicProfile.id)
      .in('status', ['assigned', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('jobs')
      .select(`
        id,
        title,
        description,
        budget,
        status,
        location,
        created_at,
        assigned_mechanic_id,
        vehicle:vehicles (make, model, license_plate)
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(6),
  ]);

  if (appsResult.error) throw appsResult.error;
  if (earningsResult.error) throw earningsResult.error;
  if (assignedJobsResult.error) throw assignedJobsResult.error;
  if (jobsResult.error) throw jobsResult.error;

  const applications: Application[] = ((appsResult.data as ApplicationQueryRow[] | null) ?? []).map((app) => ({
    id: app.id,
    job_id: app.job_id,
    bid_amount: app.bid_amount ?? null,
    message: app.message ?? null,
    status: app.status,
    created_at: app.created_at,
    job: normalizeJob(app.job as JobQueryRow | JobQueryRow[] | null | undefined),
  }));

  const assignedJobs: Job[] = ((assignedJobsResult.data as JobQueryRow[] | null) ?? []).map((job) => ({
    id: job.id,
    title: job.title,
    description: job.description,
    budget: job.budget ?? null,
    status: job.status,
    location: job.location ?? null,
    created_at: job.created_at,
    assigned_mechanic_id: job.assigned_mechanic_id ?? null,
    vehicle: normalizeVehicle(job.vehicle),
  }));

  const availableJobs: Job[] = ((jobsResult.data as JobQueryRow[] | null) ?? [])
    .filter((job) => job.assigned_mechanic_id == null)
    .map((job) => ({
      id: job.id,
      title: job.title,
      description: job.description,
      budget: job.budget ?? null,
      status: job.status,
      location: job.location ?? null,
      created_at: job.created_at,
      assigned_mechanic_id: job.assigned_mechanic_id ?? null,
      vehicle: normalizeVehicle(job.vehicle),
    }));

  return {
    profile: mechanicProfile,
    applications,
    earnings: ((earningsResult.data as Earning[] | null) ?? []).map((earning) => ({
      ...earning,
      amount: Number(earning.amount ?? 0),
    })),
    assignedJobs,
    availableJobs,
  };
}

export default function MechanicMarketplaceDashboard() {
  const router = useRouter();

  const [loadState, setLoadState] = useState<LoadState>('initial');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<MechanicProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [assignedJobs, setAssignedJobs] = useState<Job[]>([]);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);

  const fetchData = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      try {
        setError(null);

        if (mode === 'initial') {
          setLoadState('initial');
        } else {
          setRefreshing(true);
        }

        const data = await getDashboardData(router);
        if (!data) return;

        setProfile(data.profile);
        setApplications(data.applications);
        setEarnings(data.earnings);
        setAssignedJobs(data.assignedJobs);
        setAvailableJobs(data.availableJobs);
        setLoadState('ready');
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        setLoadState('error');
      } finally {
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void fetchData('initial');
  }, [fetchData]);

  const metrics = useMemo(() => {
    const totalApplications = applications.length;
    const acceptedApplications = applications.filter((a) => a.status === 'accepted').length;
    const pendingApplications = applications.filter((a) => a.status === 'pending').length;
    const rejectedApplications = applications.filter((a) => a.status === 'rejected').length;
    const totalPaidEarnings = earnings.reduce(
      (sum, earning) => sum + (earning.status === 'paid' ? earning.amount : 0),
      0
    );
    const acceptanceRate = totalApplications
      ? Math.round((acceptedApplications / totalApplications) * 100)
      : 0;

    return {
      totalApplications,
      acceptedApplications,
      pendingApplications,
      rejectedApplications,
      totalPaidEarnings,
      acceptanceRate,
    };
  }, [applications, earnings]);

  const isSubscribed =
    profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing';

  const profileComplete = Boolean(profile?.address && profile?.phone);

  const handleRefresh = () => {
    void fetchData('refresh');
  };

  if (loadState === 'initial') {
    return (
      <div style={styles.centered}>
        <Loader2 size={34} className="spin" />
        <p>Loading dashboard…</p>
        <style>{spinnerCss}</style>
      </div>
    );
  }

  if (loadState === 'error' && !profile) {
    return (
      <div style={styles.centered}>
        <p style={{ color: getThemeValue('colors.status.critical', '#ef4444') }}>
          {error || 'Failed to load dashboard'}
        </p>
        <button onClick={handleRefresh} style={styles.retryButton} type="button">
          Retry
        </button>
        <style>{spinnerCss}</style>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <div style={styles.heroCard}>
        <div style={styles.heroTextBlock}>
          <div style={styles.heroEyebrow}>Marketplace mechanic hub</div>
          <h1 style={styles.title}>Mechanic Dashboard</h1>

          <div style={styles.identityRow}>
            <span style={styles.businessName}>{profile?.business_name || 'Mechanic profile'}</span>

            {profile?.verified ? (
              <span style={styles.verifiedPill}>
                <ShieldCheck size={14} />
                Verified
              </span>
            ) : (
              <span style={styles.pendingPill}>
                <AlertCircle size={14} />
                Pending verification
              </span>
            )}

            <span style={styles.planPill}>
              <Sparkles size={14} />
              {profile?.plan || 'No plan'}
            </span>

            {profile?.rating != null && (
              <span style={styles.ratingPill}>
                <Star size={14} fill="#fbbf24" color="#fbbf24" />
                {profile.rating.toFixed(1)}
              </span>
            )}
          </div>

          <p style={styles.subtitle}>
            Track quote flow, active repair work, payout progress, and open marketplace jobs from one place.
          </p>
        </div>

        <div style={styles.heroActions}>
          {!isSubscribed && (
            <button
              onClick={() => router.push('/marketplace/mechanics/subscribe')}
              style={styles.primaryAction}
              type="button"
            >
              <CreditCard size={16} />
              Upgrade plan
            </button>
          )}

          <button
            onClick={handleRefresh}
            style={styles.secondaryAction}
            disabled={refreshing}
            type="button"
          >
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <StatCard
          icon={<Briefcase size={22} color="#60a5fa" />}
          value={String(metrics.totalApplications)}
          label="Quotes sent"
          sublabel="All submitted applications"
        />
        <StatCard
          icon={<CheckCircle2 size={22} color="#22c55e" />}
          value={String(metrics.acceptedApplications)}
          label="Accepted quotes"
          sublabel={`${metrics.acceptanceRate}% acceptance rate`}
        />
        <StatCard
          icon={<DollarSign size={22} color={getThemeValue('colors.primary', '#22c55e')} />}
          value={`£${metrics.totalPaidEarnings.toFixed(0)}`}
          label="Paid earnings"
          sublabel="Completed payouts only"
        />
        <StatCard
          icon={<Wrench size={22} color="#f59e0b" />}
          value={String(assignedJobs.length)}
          label="Active jobs"
          sublabel="Assigned or in progress"
        />
      </div>

      <div style={styles.twoColumn}>
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitleWrap}>
              <Briefcase size={18} color={getThemeValue('colors.primary', '#22c55e')} />
              <h2 style={styles.cardTitle}>Quote pipeline</h2>
            </div>
            <button
              onClick={() => router.push('/marketplace/jobs')}
              style={styles.linkButton}
              type="button"
            >
              Browse jobs <ArrowRight size={14} />
            </button>
          </div>

          {applications.length === 0 ? (
            <EmptyState
              text="You haven't submitted any quotes yet."
              actionLabel="Browse jobs"
              onClick={() => router.push('/marketplace/jobs')}
            />
          ) : (
            <div style={styles.stackList}>
              {applications.slice(0, 5).map((app) => {
                const statusMeta = getStatusMeta(app.status);

                return (
                  <div key={app.id} style={styles.listItemCard}>
                    <div style={styles.listItemTop}>
                      <strong style={styles.itemTitle}>{app.job?.title || 'Repair job'}</strong>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: statusMeta.bg,
                          color: statusMeta.color,
                        }}
                      >
                        {statusMeta.label}
                      </span>
                    </div>

                    <div style={styles.metaLine}>
                      {app.bid_amount != null && <span>Quote: {formatCurrency(app.bid_amount)}</span>}
                      <span>{formatDate(app.created_at)}</span>
                      {app.job?.location && <span>{app.job.location}</span>}
                    </div>

                    {app.message && (
                      <p style={styles.inlineDescription}>{truncate(app.message, 120)}</p>
                    )}

                    <button
                      onClick={() => router.push(`/marketplace/jobs/${app.job_id}`)}
                      style={styles.inlineButton}
                      type="button"
                    >
                      View job
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div style={styles.divider} />

          <div style={styles.miniStatsRow}>
            <MiniStat label="Pending" value={metrics.pendingApplications} />
            <MiniStat label="Accepted" value={metrics.acceptedApplications} />
            <MiniStat label="Rejected" value={metrics.rejectedApplications} />
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitleWrap}>
              <DollarSign size={18} color={getThemeValue('colors.primary', '#22c55e')} />
              <h2 style={styles.cardTitle}>Earnings & plan</h2>
            </div>
          </div>

          {earnings.length === 0 ? (
            <EmptyState text="No earnings yet. Completed jobs will appear here." />
          ) : (
            <div style={styles.stackList}>
              {earnings.map((earning) => {
                const paid = earning.status === 'paid';

                return (
                  <div key={earning.id} style={styles.listItemCard}>
                    <div style={styles.listItemTop}>
                      <strong style={styles.itemTitle}>{`£${earning.amount.toFixed(2)}`}</strong>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: paid ? '#22c55e20' : '#f59e0b20',
                          color: paid ? '#22c55e' : '#f59e0b',
                        }}
                      >
                        {earning.status}
                      </span>
                    </div>
                    <div style={styles.metaLine}>
                      <span>{earning.description}</span>
                      <span>{formatDate(earning.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={styles.divider} />

          <div style={styles.subscriptionPanel}>
            <div>
              <div style={styles.subtleLabel}>Current plan</div>
              <div style={styles.subscriptionValue}>{profile?.plan || 'None'}</div>
            </div>
            <div>
              <div style={styles.subtleLabel}>Subscription</div>
              <div
                style={{
                  ...styles.subscriptionStatus,
                  color: isSubscribed ? '#22c55e' : '#f59e0b',
                }}
              >
                {isSubscribed ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>

          {!isSubscribed && (
            <button
              onClick={() => router.push('/marketplace/mechanics/subscribe')}
              style={styles.primaryButton}
              type="button"
            >
              Upgrade to Professional
            </button>
          )}
        </section>
      </div>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardTitleWrap}>
            <TrendingUp size={18} color={getThemeValue('colors.primary', '#22c55e')} />
            <h2 style={styles.cardTitle}>Active assigned work</h2>
          </div>
        </div>

        {assignedJobs.length === 0 ? (
          <EmptyState text="No assigned jobs at the moment. Accepted quotes will appear here once owners confirm you." />
        ) : (
          <div style={styles.jobsGrid}>
            {assignedJobs.map((job) => {
              const statusMeta = getStatusMeta(job.status);

              return (
                <div key={job.id} style={styles.jobCard}>
                  <div style={styles.jobCardTop}>
                    <h3 style={styles.jobTitle}>{job.title}</h3>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: statusMeta.bg,
                        color: statusMeta.color,
                      }}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  <p style={styles.jobDescription}>
                    {truncate(job.description, 110) || 'No description available.'}
                  </p>

                  <div style={styles.jobMeta}>
                    <span style={styles.metaChip}>Budget: {formatCurrency(job.budget)}</span>
                    {job.location && (
                      <span style={styles.metaChip}>
                        <MapPin size={13} />
                        {job.location}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => router.push(`/marketplace/jobs/${job.id}`)}
                    style={styles.inlineButton}
                    type="button"
                  >
                    Open assigned job
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardTitleWrap}>
            <TrendingUp size={18} color={getThemeValue('colors.primary', '#22c55e')} />
            <h2 style={styles.cardTitle}>Open jobs to quote</h2>
          </div>
          <button
            onClick={() => router.push('/marketplace/jobs')}
            style={styles.linkButton}
            type="button"
          >
            View all <ArrowRight size={14} />
          </button>
        </div>

        {availableJobs.length === 0 ? (
          <EmptyState text="No open jobs at the moment. Check back soon." />
        ) : (
          <div style={styles.jobsGrid}>
            {availableJobs.map((job) => (
              <div key={job.id} style={styles.jobCard}>
                <div style={styles.jobCardTop}>
                  <h3 style={styles.jobTitle}>{job.title}</h3>
                  <span style={styles.jobBudget}>{formatCurrency(job.budget)}</span>
                </div>

                <p style={styles.jobDescription}>
                  {truncate(job.description, 100) || 'No description available.'}
                </p>

                <div style={styles.jobMeta}>
                  {job.location && (
                    <span style={styles.metaChip}>
                      <MapPin size={13} />
                      {job.location}
                    </span>
                  )}
                  {job.vehicle && (
                    <span style={styles.metaChip}>
                      {[job.vehicle.make, job.vehicle.model, job.vehicle.license_plate]
                        .filter(Boolean)
                        .join(' • ')}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => router.push(`/marketplace/jobs/${job.id}/apply`)}
                  style={styles.applyButton}
                  type="button"
                >
                  Review & quote
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {!profileComplete && (
        <div style={styles.warningCard}>
          <AlertCircle size={18} color={getThemeValue('colors.status.warning', '#f59e0b')} />
          <span style={{ flex: 1 }}>
            Your profile is incomplete. Add your phone number and address so owners see a more trustworthy mechanic profile.
          </span>
          <button
            onClick={() => router.push('/marketplace/mechanics/register')}
            style={styles.inlineWarnButton}
            type="button"
          >
            Update now
          </button>
        </div>
      )}

      {error && profile && (
        <div style={styles.warningCard}>
          <AlertCircle size={18} color={getThemeValue('colors.status.warning', '#f59e0b')} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={handleRefresh} style={styles.inlineWarnButton} type="button">
            Retry
          </button>
        </div>
      )}

      <style>{spinnerCss}</style>
    </motion.div>
  );
}

function StatCard({
  icon,
  value,
  label,
  sublabel,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  sublabel: string;
}) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIconWrap}>{icon}</div>
      <div>
        <div style={styles.statValue}>{value}</div>
        <div style={styles.statLabel}>{label}</div>
        <div style={styles.statSubLabel}>{sublabel}</div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.miniStat}>
      <div style={styles.miniStatValue}>{value}</div>
      <div style={styles.miniStatLabel}>{label}</div>
    </div>
  );
}

function EmptyState({
  text,
  actionLabel,
  onClick,
}: {
  text: string;
  actionLabel?: string;
  onClick?: () => void;
}) {
  return (
    <div style={styles.emptyState}>
      <p>{text}</p>
      {actionLabel && onClick && (
        <button onClick={onClick} style={styles.smallButton} type="button">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

const spinnerCss = `
  .spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const styles: Record<string, CSSProperties> = {
  page: {
    padding: 'clamp(16px, 4vw, 32px)',
    background: getThemeValue('colors.background.main', '#020617'),
    minHeight: '100vh',
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
    fontFamily: getThemeValue('fontFamilies.sans', 'Inter, sans-serif'),
  },
  heroCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px',
    flexWrap: 'wrap',
    background: getThemeValue('colors.background.card', '#0f172a'),
    border: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
    borderRadius: '24px',
    padding: '20px',
    marginBottom: '24px',
  },
  heroTextBlock: {
    flex: 1,
    minWidth: '260px',
  },
  heroEyebrow: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: getThemeValue('colors.text.muted', '#64748b'),
    marginBottom: '8px',
  },
  title: {
    fontSize: 'clamp(26px, 6vw, 34px)',
    fontWeight: 800,
    margin: '0 0 10px 0',
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
  },
  identityRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '10px',
  },
  businessName: {
    fontWeight: 700,
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
  },
  verifiedPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: '#22c55e20',
    color: '#22c55e',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 600,
  },
  pendingPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: '#f59e0b20',
    color: '#f59e0b',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 600,
  },
  planPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: getThemeValue('colors.background.subtle', '#1e293b'),
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 600,
  },
  ratingPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: '#fbbf2420',
    color: '#fbbf24',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
  },
  subtitle: {
    fontSize: '14px',
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
    maxWidth: '60ch',
    margin: 0,
    lineHeight: 1.6,
  },
  heroActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    alignItems: 'center',
  },
  primaryAction: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: getThemeValue('colors.primary', '#22c55e'),
    border: 'none',
    color: getThemeValue('colors.background.main', '#020617'),
    borderRadius: '14px',
    padding: '12px 14px',
    fontWeight: 700,
    cursor: 'pointer',
    minHeight: '44px',
  },
  secondaryAction: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: getThemeValue('colors.background.subtle', '#1e293b'),
    border: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
    borderRadius: '14px',
    padding: '12px 14px',
    fontWeight: 600,
    cursor: 'pointer',
    minHeight: '44px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '14px',
    marginBottom: '24px',
  },
  statCard: {
    background: getThemeValue('colors.background.card', '#0f172a'),
    border: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
    borderRadius: '18px',
    padding: '16px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    minHeight: '110px',
  },
  statIconWrap: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: getThemeValue('colors.background.subtle', '#1e293b'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 800,
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
    marginTop: '4px',
  },
  statSubLabel: {
    fontSize: '12px',
    color: getThemeValue('colors.text.muted', '#64748b'),
    marginTop: '4px',
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  card: {
    background: getThemeValue('colors.background.card', '#0f172a'),
    border: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
    borderRadius: '22px',
    padding: '18px',
    marginBottom: '24px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
  cardTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 700,
    margin: 0,
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
  },
  linkButton: {
    background: 'transparent',
    border: 'none',
    color: getThemeValue('colors.primary', '#22c55e'),
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  stackList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  listItemCard: {
    background: getThemeValue('colors.background.subtle', '#1e293b'),
    border: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
    borderRadius: '16px',
    padding: '14px',
  },
  listItemTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  itemTitle: {
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
  },
  metaLine: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    fontSize: '12px',
    color: getThemeValue('colors.text.muted', '#64748b'),
  },
  inlineDescription: {
    fontSize: '13px',
    lineHeight: 1.55,
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
    margin: '10px 0 0 0',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'capitalize',
    whiteSpace: 'nowrap',
  },
  inlineButton: {
    marginTop: '10px',
    background: 'transparent',
    border: `1px solid ${getThemeValue('colors.primary', '#22c55e')}`,
    borderRadius: '10px',
    padding: '8px 12px',
    color: getThemeValue('colors.primary', '#22c55e'),
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  subtleLabel: {
    fontSize: '12px',
    color: getThemeValue('colors.text.muted', '#64748b'),
    marginBottom: '4px',
  },
  subscriptionPanel: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
  },
  subscriptionValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
  },
  subscriptionStatus: {
    fontSize: '15px',
    fontWeight: 700,
  },
  divider: {
    margin: '16px 0',
    borderTop: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
  },
  miniStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '10px',
  },
  miniStat: {
    background: getThemeValue('colors.background.subtle', '#1e293b'),
    border: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
    borderRadius: '14px',
    padding: '12px',
    textAlign: 'center',
  },
  miniStatValue: {
    fontSize: '18px',
    fontWeight: 800,
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
  },
  miniStatLabel: {
    fontSize: '11px',
    color: getThemeValue('colors.text.muted', '#64748b'),
    marginTop: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  jobsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '14px',
  },
  jobCard: {
    background: getThemeValue('colors.background.subtle', '#1e293b'),
    borderRadius: '18px',
    padding: '16px',
    border: `1px solid ${getThemeValue('colors.border.light', '#1e293b')}`,
  },
  jobCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '10px',
  },
  jobTitle: {
    fontSize: '15px',
    fontWeight: 700,
    margin: 0,
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
  },
  jobBudget: {
    color: getThemeValue('colors.primary', '#22c55e'),
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  jobDescription: {
    fontSize: '13px',
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
    marginBottom: '12px',
    lineHeight: 1.5,
  },
  jobMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '14px',
  },
  metaChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: getThemeValue('colors.background.card', '#0f172a'),
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
  },
  applyButton: {
    width: '100%',
    minHeight: '44px',
    background: getThemeValue('colors.primary', '#22c55e'),
    border: 'none',
    borderRadius: '12px',
    padding: '10px 12px',
    color: getThemeValue('colors.background.main', '#020617'),
    fontWeight: 800,
    cursor: 'pointer',
  },
  warningCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    background: `${getThemeValue('colors.status.warning', '#f59e0b')}20`,
    border: `1px solid ${getThemeValue('colors.status.warning', '#f59e0b')}`,
    borderRadius: '16px',
    padding: '16px',
    marginTop: '8px',
  },
  inlineWarnButton: {
    background: getThemeValue('colors.status.warning', '#f59e0b'),
    border: 'none',
    color: '#111827',
    borderRadius: '10px',
    padding: '10px 12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  smallButton: {
    marginTop: '10px',
    padding: '10px 12px',
    background: getThemeValue('colors.primary', '#22c55e'),
    border: 'none',
    borderRadius: '10px',
    color: getThemeValue('colors.background.main', '#020617'),
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  primaryButton: {
    marginTop: '14px',
    padding: '12px 14px',
    background: getThemeValue('colors.primary', '#22c55e'),
    border: 'none',
    borderRadius: '12px',
    color: getThemeValue('colors.background.main', '#020617'),
    fontWeight: 800,
    cursor: 'pointer',
    width: '100%',
  },
  emptyState: {
    textAlign: 'center',
    padding: '24px 12px',
    color: getThemeValue('colors.text.muted', '#64748b'),
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: getThemeValue('colors.text.secondary', '#94a3b8'),
    gap: '12px',
  },
  retryButton: {
    marginTop: '16px',
    padding: '10px 14px',
    background: getThemeValue('colors.primary', '#22c55e'),
    border: 'none',
    borderRadius: '12px',
    color: getThemeValue('colors.background.main', '#020617'),
    cursor: 'pointer',
    fontWeight: 700,
  },
};