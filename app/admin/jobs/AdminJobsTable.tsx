'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Eye,
  DollarSign,
  Car,
  User,
  Search,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Ban,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import theme from '@/app/theme';
import DeleteJobButton from './DeleteJobButton';
import { cancelJob, deleteJob, releasePayment, reopenJob } from './actions';
import type { AdminJob } from './page';

type AdminJobsTableProps = {
  jobs: AdminJob[];
  userEmails: Record<string, string>;
};

function formatCurrency(amount: number | null) {
  if (!amount) return '—';

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

function RowActionButton({
  title,
  ariaLabel,
  onClick,
  disabled,
  tone = 'default',
  children,
}: {
  title: string;
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'success' | 'warning';
  children: React.ReactNode;
}) {
  const toneStyle =
    tone === 'success'
      ? styles.successIcon
      : tone === 'warning'
      ? styles.warningIcon
      : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      style={{
        ...styles.iconBtn,
        ...(toneStyle ?? {}),
        ...(disabled ? styles.iconBtnDisabled : {}),
      }}
    >
      {children}
    </button>
  );
}

function ReleasePaymentButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRelease = () => {
    const confirmed = window.confirm(
      'Release payment for this job? This should only be done once the work is complete.'
    );

    if (!confirmed || isPending) return;

    startTransition(async () => {
      try {
        const result = await releasePayment(jobId);

        if (!result.success) {
          throw new Error(result.error);
        }

        toast.success(result.message || 'Payment released successfully');
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to release payment'
        );
      }
    });
  };

  return (
    <RowActionButton
      title="Release funds"
      ariaLabel="Release payment"
      onClick={handleRelease}
      disabled={isPending}
      tone="success"
    >
      {isPending ? <Loader2 size={16} className="spin" /> : <DollarSign size={18} />}
    </RowActionButton>
  );
}

function CancelJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCancel = () => {
    const confirmed = window.confirm(
      'Cancel this job? This is safer than deleting and is recommended for outdated jobs.'
    );

    if (!confirmed || isPending) return;

    startTransition(async () => {
      try {
        const result = await cancelJob(jobId);

        if (!result.success) {
          throw new Error(result.error);
        }

        toast.success(result.message || 'Job cancelled');
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to cancel job');
      }
    });
  };

  return (
    <RowActionButton
      title="Cancel job"
      ariaLabel="Cancel job"
      onClick={handleCancel}
      disabled={isPending}
      tone="warning"
    >
      {isPending ? <Loader2 size={16} className="spin" /> : <Ban size={18} />}
    </RowActionButton>
  );
}

function ReopenJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleReopen = () => {
    const confirmed = window.confirm(
      'Reopen this job and return it to the marketplace?'
    );

    if (!confirmed || isPending) return;

    startTransition(async () => {
      try {
        const result = await reopenJob(jobId);

        if (!result.success) {
          throw new Error(result.error);
        }

        toast.success(result.message || 'Job reopened');
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to reopen job');
      }
    });
  };

  return (
    <RowActionButton
      title="Reopen job"
      ariaLabel="Reopen job"
      onClick={handleReopen}
      disabled={isPending}
    >
      {isPending ? <Loader2 size={16} className="spin" /> : <RotateCcw size={18} />}
    </RowActionButton>
  );
}

export default function AdminJobsTable({
  jobs,
  userEmails,
}: AdminJobsTableProps) {
  const [query, setQuery] = useState('');

  const filteredJobs = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) return jobs;

    return jobs.filter((job) => {
      const haystack = [
        job.id,
        job.title ?? '',
        job.status ?? '',
        job.payment_status ?? '',
        userEmails[job.user_id] ?? '',
        job.user_id,
        job.vehicles?.license_plate ?? '',
        job.vehicles?.make ?? '',
        job.vehicles?.model ?? '',
        String(job.applications_count ?? 0),
        job.is_stale ? 'stale outdated old' : '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [jobs, query, userEmails]);

  return (
    <div style={styles.tableWrapper}>
      <div style={styles.tableControls}>
        <div style={styles.searchBox}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Filter by ID, title, client email, vehicle, stale..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={styles.searchInput}
            aria-label="Filter jobs"
          />
        </div>
      </div>

      <div style={styles.tableResponsive}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>
                <Briefcase size={14} /> Description
              </th>
              <th style={styles.th}>Budget / Payment</th>
              <th style={styles.th}>Job Status</th>
              <th style={styles.th}>
                <User size={14} /> Client
              </th>
              <th style={styles.th}>
                <Car size={14} /> Vehicle
              </th>
              <th style={styles.th}>
                <Users size={14} /> Activity
              </th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => {
                const canCancel =
                  job.status === 'open' || job.status === 'assigned' || job.status === 'in_progress';
                const canReopen =
                  job.status === 'cancelled' || job.status === 'completed';
                const canReleasePayment = job.payment_status === 'pending';

                return (
                  <tr key={job.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.titleInfo}>
                        <span style={styles.uuid}>#{job.id.slice(0, 8)}</span>
                        <strong style={styles.jobName}>
                          {job.title || 'Untitled job'}
                        </strong>
                        <div style={styles.timestamp}>
                          <Clock size={10} />
                          <span>{new Date(job.created_at).toLocaleDateString()}</span>
                        </div>
                        {job.is_stale ? (
                          <div style={styles.staleBadge}>
                            <AlertTriangle size={12} />
                            <span>Stale job</span>
                          </div>
                        ) : null}
                      </div>
                    </td>

                    <td style={styles.td}>
                      <div style={styles.budgetCell}>
                        <span style={styles.amount}>{formatCurrency(job.budget)}</span>
                        <span
                          style={{
                            ...styles.payStatus,
                            ...(job.payment_status === 'pending'
                              ? styles.payStatusPending
                              : job.payment_status === 'released'
                              ? styles.payStatusReleased
                              : styles.payStatusUnpaid),
                          }}
                        >
                          {job.payment_status || 'unpaid'}
                        </span>
                      </div>
                    </td>

                    <td style={styles.td}>
                      <div
                        style={{
                          ...styles.statusBadge,
                          ...(job.status === 'open'
                            ? styles.statusOpen
                            : job.status === 'in_progress'
                            ? styles.statusInProgress
                            : job.status === 'completed'
                            ? styles.statusCompleted
                            : job.status === 'assigned'
                            ? styles.statusAssigned
                            : styles.statusCancelled),
                        }}
                      >
                        {job.status === 'completed' ? <CheckCircle2 size={12} /> : null}
                        <span>{job.status || 'unknown'}</span>
                      </div>
                    </td>

                    <td style={styles.td}>
                      <div style={styles.clientInfo}>
                        <span style={styles.email}>
                          {userEmails[job.user_id] || 'Unknown client'}
                        </span>
                        <span style={styles.userId}>UID: {job.user_id.slice(0, 6)}</span>
                      </div>
                    </td>

                    <td style={styles.td}>
                      {job.vehicles ? (
                        <div style={styles.assetBadge}>
                          <span style={styles.plate}>
                            {job.vehicles.license_plate || 'No plate'}
                          </span>
                          <span style={styles.makeModel}>
                            {[job.vehicles.make, job.vehicles.model].filter(Boolean).join(' ') ||
                              'Vehicle details unavailable'}
                          </span>
                        </div>
                      ) : (
                        <span style={styles.noAsset}>Internal / Misc</span>
                      )}
                    </td>

                    <td style={styles.td}>
                      <div style={styles.activityCell}>
                        <span style={styles.activityValue}>
                          {job.applications_count} application
                          {job.applications_count === 1 ? '' : 's'}
                        </span>
                        <span style={styles.activityHint}>
                          {job.is_stale && job.applications_count === 0
                            ? 'Old and inactive'
                            : job.is_stale
                            ? 'Needs review'
                            : 'Current'}
                        </span>
                      </div>
                    </td>

                    <td style={styles.td}>
                      <div style={styles.actionGrid}>
                        <Link
                          href={`/marketplace/jobs/${job.id}`}
                          style={styles.iconBtn}
                          title="View job"
                          aria-label="View job"
                        >
                          <Eye size={18} />
                        </Link>

                        {canReleasePayment ? <ReleasePaymentButton jobId={job.id} /> : null}
                        {canCancel ? <CancelJobButton jobId={job.id} /> : null}
                        {canReopen ? <ReopenJobButton jobId={job.id} /> : null}

                        <DeleteJobButton jobId={job.id} deleteAction={deleteJob} />
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={styles.emptyCell}>
                  <div style={styles.emptyState}>
                    <Briefcase size={18} />
                    <span>No jobs match your current filter.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .spin {
          animation: spin 0.9s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tableWrapper: {
    background: theme.colors.background.card,
    borderRadius: '20px',
    border: `1px solid ${theme.colors.border.light}`,
    overflow: 'hidden',
  },
  tableControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: `1px solid ${theme.colors.border.light}`,
    flexWrap: 'wrap',
    gap: '12px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: '40px',
    padding: '8px 16px',
    minWidth: '280px',
    flex: '1 1 320px',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: theme.colors.text.primary,
    fontSize: '14px',
    width: '100%',
  },
  tableResponsive: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1180px',
  },
  th: {
    textAlign: 'left',
    padding: '16px 20px',
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: theme.colors.text.muted,
    borderBottom: `1px solid ${theme.colors.border.light}`,
  },
  tr: {
    borderBottom: `1px solid ${theme.colors.border.light}`,
  },
  td: {
    padding: '16px 20px',
    verticalAlign: 'middle',
  },
  titleInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  uuid: {
    fontSize: '12px',
    fontFamily: theme.fontFamilies.mono,
    color: theme.colors.text.muted,
  },
  jobName: {
    fontWeight: 700,
    fontSize: '15px',
  },
  timestamp: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: theme.colors.text.muted,
  },
  staleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    width: 'fit-content',
    marginTop: '4px',
    padding: '4px 8px',
    borderRadius: '999px',
    background: `${theme.colors.status.warning}20`,
    color: theme.colors.status.warning,
    fontSize: '11px',
    fontWeight: 700,
  },
  budgetCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  amount: {
    fontSize: '16px',
    fontWeight: 800,
    color: theme.colors.text.primary,
  },
  payStatus: {
    fontSize: '10px',
    fontWeight: 800,
    textTransform: 'uppercase',
    padding: '3px 8px',
    borderRadius: '20px',
    width: 'fit-content',
  },
  payStatusPending: {
    background: `${theme.colors.status.warning}20`,
    color: theme.colors.status.warning,
  },
  payStatusReleased: {
    background: `${theme.colors.primary}20`,
    color: theme.colors.primary,
  },
  payStatusUnpaid: {
    background: `${theme.colors.status.critical}20`,
    color: theme.colors.status.critical,
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 700,
    width: 'fit-content',
    textTransform: 'capitalize',
  },
  statusOpen: {
    background: `${theme.colors.primary}20`,
    color: theme.colors.primary,
  },
  statusInProgress: {
    background: `${theme.colors.status.info}20`,
    color: theme.colors.status.info,
  },
  statusCompleted: {
    background: `${theme.colors.status.healthy}20`,
    color: theme.colors.status.healthy,
  },
  statusAssigned: {
    background: `${theme.colors.status.warning}20`,
    color: theme.colors.status.warning,
  },
  statusCancelled: {
    background: `${theme.colors.status.critical}20`,
    color: theme.colors.status.critical,
  },
  clientInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  email: {
    fontSize: '13px',
    fontWeight: 500,
  },
  userId: {
    fontSize: '10px',
    fontFamily: theme.fontFamilies.mono,
    color: theme.colors.text.muted,
  },
  assetBadge: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  plate: {
    fontWeight: 700,
    fontSize: '12px',
    fontFamily: theme.fontFamilies.mono,
  },
  makeModel: {
    fontSize: '11px',
    color: theme.colors.text.muted,
  },
  noAsset: {
    fontSize: '11px',
    color: theme.colors.text.muted,
    fontStyle: 'italic',
  },
  activityCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  activityValue: {
    fontSize: '13px',
    fontWeight: 700,
    color: theme.colors.text.primary,
  },
  activityHint: {
    fontSize: '11px',
    color: theme.colors.text.muted,
  },
  actionGrid: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  iconBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: '8px',
    padding: '6px',
    cursor: 'pointer',
    color: theme.colors.text.secondary,
    transition: 'all 0.2s ease',
  },
  successIcon: {
    color: theme.colors.primary,
    borderColor: `${theme.colors.primary}40`,
  },
  warningIcon: {
    color: theme.colors.status.warning,
    borderColor: `${theme.colors.status.warning}40`,
  },
  iconBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  emptyCell: {
    padding: '32px 20px',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    color: theme.colors.text.muted,
    fontSize: '14px',
  },
};