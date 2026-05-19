import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle, Archive, Clock3, ShieldCheck } from 'lucide-react';
import theme from '@/app/theme';
import { supabaseAdmin } from '@/lib/supabase/admin';
import AdminJobsTable from './AdminJobsTable';

export const metadata: Metadata = {
  title: 'Admin Jobs | Yogat Fleet AI',
  description: 'Administrative job moderation and cleanup.',
};

type SearchParams = Promise<{
  status?: string;
  filter?: string;
}>;

type JobStatus =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'unknown'
  | null;

type PaymentStatus = 'pending' | 'released' | 'unpaid' | null;

export type AdminJob = {
  id: string;
  title: string | null;
  created_at: string;
  budget: number | null;
  status: JobStatus;
  payment_status: PaymentStatus;
  user_id: string;
  assigned_mechanic_id: string | null;
  applications_count: number;
  is_stale: boolean;
  vehicles: {
    license_plate: string | null;
    make: string | null;
    model: string | null;
  } | null;
};

const STALE_DAYS = 14;

const formatCurrency = (amount: number | null) => {
  if (!amount) return '—';

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
};

function getStaleBeforeIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function getApplicationsCount(applications: unknown): number {
  if (!Array.isArray(applications) || applications.length === 0) return 0;

  const first = applications[0] as { count?: number | string | null } | undefined;
  const raw = first?.count;

  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') return Number(raw) || 0;
  return 0;
}

export default async function AdminJobsPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const statusFilter = searchParams?.status?.trim() || '';
  const specialFilter = searchParams?.filter?.trim() || '';
  const staleBefore = getStaleBeforeIso(STALE_DAYS);

  let jobsQuery = supabaseAdmin
    .from('jobs')
    .select(
      `
        id,
        title,
        created_at,
        budget,
        status,
        payment_status,
        user_id,
        assigned_mechanic_id,
        vehicles (license_plate, make, model),
        applications(count)
      `
    )
    .order('created_at', { ascending: false });

  if (statusFilter) {
    jobsQuery = jobsQuery.eq('status', statusFilter);
  }

  if (specialFilter === 'stale') {
    jobsQuery = jobsQuery.eq('status', 'open').lt('created_at', staleBefore);
  }

  const { data: jobs, error: jobsError } = await jobsQuery;

  if (jobsError) {
    return (
      <div style={styles.errorState}>
        <AlertCircle size={48} color={theme.colors.status.critical} />
        <h2 style={styles.errorTitle}>Data Link Interrupted</h2>
        <p style={styles.errorText}>{jobsError.message}</p>
      </div>
    );
  }

  const safeJobs: AdminJob[] = (jobs ?? []).map((job: any) => ({
    id: job.id,
    title: job.title ?? 'Untitled job',
    created_at: job.created_at,
    budget: job.budget ?? null,
    status: job.status ?? 'unknown',
    payment_status: job.payment_status ?? 'unpaid',
    user_id: job.user_id,
    assigned_mechanic_id: job.assigned_mechanic_id ?? null,
    applications_count: getApplicationsCount(job.applications),
    is_stale:
      job.status === 'open' &&
      Boolean(job.created_at) &&
      new Date(job.created_at).getTime() < new Date(staleBefore).getTime(),
    vehicles: job.vehicles
      ? {
          license_plate: job.vehicles.license_plate ?? null,
          make: job.vehicles.make ?? null,
          model: job.vehicles.model ?? null,
        }
      : null,
  }));

  const { data: userData, error: usersError } =
    await supabaseAdmin.auth.admin.listUsers();

  const userEmails = (userData?.users || []).reduce((acc, user) => {
    acc[user.id] = user.email || 'System Account';
    return acc;
  }, {} as Record<string, string>);

  const totalInEscrow = safeJobs
    .filter((job) => job.payment_status === 'pending')
    .reduce((sum, job) => sum + (job.budget || 0), 0);

  const openRequests = safeJobs.filter((job) => job.status === 'open').length;
  const staleJobs = safeJobs.filter((job) => job.is_stale).length;
  const assignedJobs = safeJobs.filter((job) => job.status === 'assigned').length;

  const criticalJobs = safeJobs.filter(
    (job) => job.status === 'open' && job.payment_status === 'pending'
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.breadcrumb}>SYSTEM / MARKETPLACE / JOBS</div>
          <h1 style={styles.title}>Job Moderation</h1>
        </div>

        <div style={styles.statsBar}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Funds in Escrow</span>
            <span style={styles.statValue}>{formatCurrency(totalInEscrow)}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Open Requests</span>
            <span style={styles.statValue}>{openRequests}</span>
          </div>
          <div style={styles.statItem}>
            <span style={{ ...styles.statLabel, color: theme.colors.status.warning }}>
              Stale Open Jobs
            </span>
            <span style={{ ...styles.statValue, color: theme.colors.status.warning }}>
              {staleJobs}
            </span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Assigned</span>
            <span style={styles.statValue}>{assignedJobs}</span>
          </div>
        </div>
      </div>

      <div style={styles.filterBar}>
        <Link href="/admin/jobs" style={styles.filterLink}>All</Link>
        <Link href="/admin/jobs?status=open" style={styles.filterLink}>Open</Link>
        <Link href="/admin/jobs?status=assigned" style={styles.filterLink}>Assigned</Link>
        <Link href="/admin/jobs?status=cancelled" style={styles.filterLink}>Cancelled</Link>
        <Link href="/admin/jobs?filter=stale" style={styles.filterLink}>Stale</Link>
      </div>

      {usersError ? (
        <section style={styles.infoSection}>
          <div style={styles.infoHeader}>
            <AlertCircle size={18} />
            <span>
              User directory is temporarily unavailable. Jobs are loaded, but client
              email mapping may be incomplete.
            </span>
          </div>
        </section>
      ) : null}

      {criticalJobs.length > 0 && (
        <section style={styles.alertSection}>
          <div style={styles.alertHeader}>
            <ShieldCheck size={18} />
            <span>
              High Priority: {criticalJobs.length} open jobs still show pending payment state
            </span>
          </div>
        </section>
      )}

      {staleJobs > 0 && (
        <section style={styles.warningSection}>
          <div style={styles.warningHeader}>
            <Clock3 size={18} />
            <span>
              {staleJobs} open jobs are older than {STALE_DAYS} days and should be reviewed.
            </span>
          </div>
        </section>
      )}

      {safeJobs.length === 0 && (
        <section style={styles.emptySection}>
          <Archive size={18} />
          <span>No jobs matched the selected admin filter.</span>
        </section>
      )}

      <AdminJobsTable jobs={safeJobs} userEmails={userEmails} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '40px',
    background: theme.colors.background.main,
    minHeight: '100vh',
    fontFamily: theme.fontFamilies.sans,
    color: theme.colors.text.primary,
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    minHeight: '60vh',
    textAlign: 'center',
  },
  errorTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 800,
  },
  errorText: {
    margin: 0,
    color: theme.colors.text.muted,
    maxWidth: '560px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: '24px',
    marginBottom: '24px',
  },
  breadcrumb: {
    fontSize: '10px',
    fontWeight: 900,
    letterSpacing: '0.4em',
    color: theme.colors.primary,
    marginBottom: '8px',
  },
  title: {
    fontSize: 'clamp(28px, 5vw, 42px)',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    margin: 0,
  },
  statsBar: {
    display: 'flex',
    gap: '32px',
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: '24px',
    padding: '16px 24px',
    flexWrap: 'wrap',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statLabel: {
    fontSize: '10px',
    fontWeight: 800,
    textTransform: 'uppercase',
    color: theme.colors.text.muted,
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 800,
    color: theme.colors.primary,
  },
  filterBar: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '24px',
  },
  filterLink: {
    textDecoration: 'none',
    padding: '10px 14px',
    borderRadius: '999px',
    border: `1px solid ${theme.colors.border.light}`,
    color: theme.colors.text.secondary,
    background: theme.colors.background.card,
    fontSize: '13px',
    fontWeight: 700,
  },
  alertSection: {
    background: `${theme.colors.status.critical}15`,
    border: `1px solid ${theme.colors.status.critical}`,
    borderRadius: '16px',
    padding: '16px 24px',
    marginBottom: '16px',
  },
  alertHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontWeight: 700,
    color: theme.colors.status.critical,
  },
  warningSection: {
    background: `${theme.colors.status.warning}15`,
    border: `1px solid ${theme.colors.status.warning}`,
    borderRadius: '16px',
    padding: '16px 24px',
    marginBottom: '16px',
  },
  warningHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontWeight: 700,
    color: theme.colors.status.warning,
  },
  infoSection: {
    background: `${theme.colors.status.info}12`,
    border: `1px solid ${theme.colors.status.info}50`,
    borderRadius: '16px',
    padding: '16px 24px',
    marginBottom: '16px',
  },
  infoHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontWeight: 600,
    color: theme.colors.status.info,
  },
  emptySection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderRadius: '16px',
    padding: '16px 24px',
    marginBottom: '16px',
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    color: theme.colors.text.secondary,
  },
};