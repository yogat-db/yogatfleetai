// app/admin/jobs/page.tsx
import { supabaseAdmin } from '@/lib/supabase/admin';
import Link from 'next/link';
import { 
  Briefcase, Eye, DollarSign, Calendar, Car, 
  User, ShieldCheck, Search, Filter, 
  AlertCircle, CheckCircle2, Clock, Loader2
} from 'lucide-react';
import { deleteJob, releasePayment } from './actions';
import DeleteJobButton from './DeleteJobButton';
import theme from '@/app/theme';

type Job = {
  id: string;
  title: string;
  budget: number | null;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  payment_status: 'unpaid' | 'pending' | 'released' | 'refunded';
  created_at: string;
  user_id: string;
  vehicle_id: string | null;
  vehicles?: { 
    license_plate: string; 
    make: string; 
    model: string 
  } | null;
};

export const metadata = {
  title: 'HQ | Global Operations Registry',
  description: 'Enterprise-grade administrative job management.',
};

// Helper to format currency
const formatCurrency = (amount: number | null) => {
  if (!amount) return '—';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
};

export default async function AdminJobsPage() {
  // 1. Fetch jobs with vehicle data
  const { data: jobs, error: jobsError } = await supabaseAdmin
    .from('jobs')
    .select(`*, vehicles (license_plate, make, model)`)
    .order('created_at', { ascending: false });

  if (jobsError) {
    return (
      <div style={styles.errorState}>
        <AlertCircle size={48} color={theme.colors.status.critical} />
        <h2>Data Link Interrupted</h2>
        <p>{jobsError.message}</p>
      </div>
    );
  }

  // 2. Get user emails (for display)
  const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
  const userEmails = (userData?.users || []).reduce((acc, u) => {
    acc[u.id] = u.email || 'System Account';
    return acc;
  }, {} as Record<string, string>);

  // 3. Financial summaries
  const totalInEscrow = jobs
    ?.filter(j => j.payment_status === 'pending')
    .reduce((sum, j) => sum + (j.budget || 0), 0) || 0;

  const criticalJobs = jobs?.filter(j => j.status === 'open' && j.payment_status === 'pending') || [];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.breadcrumb}>SYSTEM / MARKETPLACE / REGISTRY</div>
          <h1 style={styles.title}>Operations Control</h1>
        </div>
        <div style={styles.statsBar}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Funds in Escrow</span>
            <span style={styles.statValue}>{formatCurrency(totalInEscrow)}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Open Requests</span>
            <span style={styles.statValue}>{jobs?.filter(j => j.status === 'open').length}</span>
          </div>
        </div>
      </div>

      {/* Critical alerts */}
      {criticalJobs.length > 0 && (
        <section style={styles.alertSection}>
          <div style={styles.alertHeader}>
            <ShieldCheck size={18} />
            <span>High Priority: {criticalJobs.length} Payments Awaiting Release</span>
          </div>
        </section>
      )}

      {/* Table */}
      <div style={styles.tableWrapper}>
        <div style={styles.tableControls}>
          <div style={styles.searchBox}>
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Filter by ID, title, or client email..." 
              id="jobSearchInput"
              style={styles.searchInput}
            />
          </div>
          <button style={styles.filterBtn}>
            <Filter size={16} /> Advanced Filters
          </button>
        </div>

        <div style={styles.tableResponsive}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}><Briefcase size={14} /> Description</th>
                <th style={styles.th}>Budget / Status</th>
                <th style={styles.th}>System Status</th>
                <th style={styles.th}><User size={14} /> Client</th>
                <th style={styles.th}><Car size={14} /> Vehicle</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs?.map((job) => (
                <tr key={job.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.titleInfo}>
                      <span style={styles.uuid}>#{job.id.slice(0, 8)}</span>
                      <strong style={styles.jobName}>{job.title}</strong>
                      <div style={styles.timestamp}>
                        <Clock size={10} /> {new Date(job.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.budgetCell}>
                      <span style={styles.amount}>{formatCurrency(job.budget)}</span>
                      <span style={{
                        ...styles.payStatus,
                        ...(job.payment_status === 'pending' ? styles.payStatusPending :
                          job.payment_status === 'released' ? styles.payStatusReleased :
                          styles.payStatusUnpaid)
                      }}>
                        {job.payment_status || 'unpaid'}
                      </span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{
                      ...styles.statusBadge,
                      ...(job.status === 'open' ? styles.statusOpen :
                        job.status === 'in_progress' ? styles.statusInProgress :
                        job.status === 'completed' ? styles.statusCompleted :
                        styles.statusCancelled)
                    }}>
                      {job.status === 'completed' && <CheckCircle2 size={12} />}
                      {job.status}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.clientInfo}>
                      <span style={styles.email}>{userEmails[job.user_id]}</span>
                      <span style={styles.userId}>UID: {job.user_id.slice(0, 6)}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    {job.vehicles ? (
                      <div style={styles.assetBadge}>
                        <span style={styles.plate}>{job.vehicles.license_plate}</span>
                        <span style={styles.makeModel}>{job.vehicles.make} {job.vehicles.model}</span>
                      </div>
                    ) : (
                      <span style={styles.noAsset}>Internal/Misc</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionGrid}>
                      <Link href={`/marketplace/jobs/${job.id}`} style={styles.iconBtn} title="Audit">
                        <Eye size={18} />
                      </Link>
                      {job.payment_status === 'pending' && (
                        <form action={releasePayment.bind(null, job.id)}>
                          <button type="submit" style={{...styles.iconBtn, ...styles.successIcon}} title="Release Funds">
                            <DollarSign size={18} />
                          </button>
                        </form>
                      )}
                      <DeleteJobButton jobId={job.id} deleteAction={deleteJob} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simple client-side filter script (runs after hydration) */}
      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('DOMContentLoaded', function() {
          const searchInput = document.getElementById('jobSearchInput');
          if (!searchInput) return;
          const tableRows = document.querySelectorAll('tbody tr');
          searchInput.addEventListener('input', function(e) {
            const term = e.target.value.toLowerCase();
            tableRows.forEach(row => {
              const text = row.innerText.toLowerCase();
              row.style.display = text.includes(term) ? '' : 'none';
            });
          });
        });
      `}} />
    </div>
  );
}

// ==================== STYLES (inline, theme‑aware) ====================
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
    gap: '16px',
    minHeight: '60vh',
    textAlign: 'center',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: '24px',
    marginBottom: '32px',
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
  alertSection: {
    background: `${theme.colors.status.critical}15`,
    border: `1px solid ${theme.colors.status.critical}`,
    borderRadius: '16px',
    padding: '16px 24px',
    marginBottom: '32px',
  },
  alertHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontWeight: 700,
    color: theme.colors.status.critical,
  },
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
    padding: '6px 16px',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: theme.colors.text.primary,
    fontSize: '14px',
    minWidth: '240px',
  },
  filterBtn: {
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: '40px',
    padding: '6px 16px',
    color: theme.colors.text.secondary,
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  tableResponsive: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
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
    padding: '2px 8px',
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
  },
  statusOpen: { background: `${theme.colors.primary}20`, color: theme.colors.primary },
  statusInProgress: { background: `${theme.colors.status.info}20`, color: theme.colors.status.info },
  statusCompleted: { background: `${theme.colors.status.healthy}20`, color: theme.colors.status.healthy },
  statusCancelled: { background: `${theme.colors.status.critical}20`, color: theme.colors.status.critical },
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
  actionGrid: {
    display: 'flex',
    gap: '8px',
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
    transition: 'all 0.2s',
  },
  successIcon: {
    color: theme.colors.primary,
    borderColor: `${theme.colors.primary}40`,
  },
};