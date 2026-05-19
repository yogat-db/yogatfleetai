// app/admin/mechanics/page.tsx
import type { CSSProperties } from 'react';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  MapPin,
  Phone,
  ShieldCheck,
  Trash2,
  Wrench,
  BadgeCheck,
  Clock3,
} from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import theme from '@/app/theme';

export const metadata = {
  title: 'Mechanic Verification | Admin Console',
};

type MechanicRecord = {
  id: string;
  business_name: string | null;
  address: string | null;
  phone: string | null;
  verified: boolean | null;
  subscription_status: string | null;
  created_at?: string | null;
};

async function assertAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error || profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return user;
}

async function verifyMechanic(formData: FormData) {
  'use server';

  await assertAdmin();

  const id = formData.get('id');

  if (typeof id !== 'string' || !id) {
    throw new Error('Mechanic ID is required');
  }

  const { error } = await supabaseAdmin
    .from('mechanics')
    .update({
      verified: true,
    })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin/mechanics');
  redirect('/admin/mechanics');
}

async function removeMechanic(formData: FormData) {
  'use server';

  await assertAdmin();

  const id = formData.get('id');

  if (typeof id !== 'string' || !id) {
    throw new Error('Mechanic ID is required');
  }

  const { error } = await supabaseAdmin
    .from('mechanics')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin/mechanics');
  redirect('/admin/mechanics');
}

function formatSubscriptionStatus(status: string | null) {
  if (!status) return 'Inactive';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function AdminMechanicsPage() {
  await assertAdmin();

  const { data, error } = await supabaseAdmin
    .from('mechanics')
    .select('id, business_name, address, phone, verified, subscription_status, created_at')
    .order('created_at', { ascending: false });

  const mechanics: MechanicRecord[] = data ?? [];
  const verifiedCount = mechanics.filter((mech) => mech.verified).length;
  const pendingCount = mechanics.filter((mech) => !mech.verified).length;

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <AlertCircle size={48} color={theme.colors.status.critical} />
        <h2 style={styles.errorTitle}>Error loading mechanics</h2>
        <p style={styles.errorText}>{error.message}</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <div style={styles.kicker}>Admin Console</div>
          <h1 style={styles.title}>Partner Management</h1>
          <p style={styles.subtitle}>
            Verify mechanic shops, review subscription status, and remove invalid registrations.
          </p>
        </div>

        <div style={styles.summaryRow}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>
              <Wrench size={18} color={theme.colors.primary} />
            </div>
            <div>
              <div style={styles.summaryValue}>{mechanics.length}</div>
              <div style={styles.summaryLabel}>Total shops</div>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>
              <BadgeCheck size={18} color={theme.colors.status.healthy} />
            </div>
            <div>
              <div style={styles.summaryValue}>{verifiedCount}</div>
              <div style={styles.summaryLabel}>Verified</div>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>
              <Clock3 size={18} color={theme.colors.status.warning} />
            </div>
            <div>
              <div style={styles.summaryValue}>{pendingCount}</div>
              <div style={styles.summaryLabel}>Pending review</div>
            </div>
          </div>
        </div>
      </header>

      <section style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.tableHeader}>Business Profile</th>
              <th style={styles.tableHeader}>Contact Details</th>
              <th style={styles.tableHeader}>Status</th>
              <th style={styles.tableHeader}>Subscription</th>
              <th style={styles.tableHeader}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {mechanics.map((mech) => (
              <tr key={mech.id} style={styles.tableRow}>
                <td style={styles.tableCell}>
                  <div style={styles.businessCol}>
                    <span style={styles.businessName}>
                      {mech.business_name || 'Unnamed business'}
                    </span>
                    <div style={styles.subDetail}>
                      <MapPin size={12} />
                      {mech.address || 'No address provided'}
                    </div>
                  </div>
                </td>

                <td style={styles.tableCell}>
                  <div style={styles.subDetail}>
                    <Phone size={12} />
                    {mech.phone || 'No phone number'}
                  </div>
                </td>

                <td style={styles.tableCell}>
                  {mech.verified ? (
                    <div
                      style={{
                        ...styles.pill,
                        color: theme.colors.status.healthy,
                        background: `${theme.colors.status.healthy}15`,
                        border: `1px solid ${theme.colors.status.healthy}30`,
                      }}
                    >
                      <CheckCircle2 size={14} />
                      Verified
                    </div>
                  ) : (
                    <div
                      style={{
                        ...styles.pill,
                        color: theme.colors.status.warning,
                        background: `${theme.colors.status.warning}15`,
                        border: `1px solid ${theme.colors.status.warning}30`,
                      }}
                    >
                      <ShieldCheck size={14} />
                      Pending
                    </div>
                  )}
                </td>

                <td style={styles.tableCell}>
                  <span style={styles.subStatus}>
                    {formatSubscriptionStatus(mech.subscription_status)}
                  </span>
                </td>

                <td style={styles.tableCell}>
                  <div style={styles.actions}>
                    {!mech.verified && (
                      <form action={verifyMechanic}>
                        <input type="hidden" name="id" value={mech.id} />
                        <button type="submit" style={styles.verifyButton}>
                          Verify shop
                        </button>
                      </form>
                    )}

                    <form
                      action={removeMechanic}
                      onSubmit={undefined}
                    >
                      <input type="hidden" name="id" value={mech.id} />
                      <button
                        type="submit"
                        style={styles.removeButton}
                        aria-label={`Delete ${mech.business_name || 'mechanic record'}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {mechanics.length === 0 && (
          <div style={styles.emptyState}>No mechanic registrations found.</div>
        )}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '32px',
    background: '#020617',
    minHeight: '100vh',
    fontFamily: theme.fontFamilies.sans,
    color: '#f8fafc',
  },
  header: {
    marginBottom: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  kicker: {
    fontSize: '11px',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    color: theme.colors.primary,
    marginBottom: '8px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 800,
    background: 'linear-gradient(to right, #ffffff, #64748b)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-1px',
    margin: 0,
  },
  subtitle: {
    color: '#64748b',
    fontSize: '14px',
    marginTop: '8px',
    maxWidth: '620px',
    lineHeight: 1.6,
  },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  summaryCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid #1e293b',
    borderRadius: '18px',
    padding: '16px',
  },
  summaryIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid #334155',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  summaryValue: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#f8fafc',
    lineHeight: 1.1,
  },
  summaryLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '4px',
  },
  tableWrapper: {
    background: '#0f172a',
    borderRadius: '20px',
    overflowX: 'auto',
    border: '1px solid #1e293b',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '980px',
  },
  tableHeaderRow: {
    background: '#1e293b50',
    borderBottom: '1px solid #1e293b',
  },
  tableHeader: {
    padding: '16px 24px',
    textAlign: 'left',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#64748b',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  tableRow: {
    borderBottom: '1px solid #1e293b',
  },
  tableCell: {
    padding: '16px 24px',
    verticalAlign: 'middle',
  },
  businessCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  businessName: {
    color: '#f8fafc',
    fontWeight: 700,
    fontSize: '15px',
  },
  subDetail: {
    color: '#64748b',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    lineHeight: 1.5,
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
    width: 'fit-content',
  },
  subStatus: {
    fontSize: '13px',
    color: '#94a3b8',
    textTransform: 'capitalize',
    fontFamily: theme.fontFamilies.mono,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  verifyButton: {
    background: theme.colors.primary,
    border: 'none',
    padding: '8px 16px',
    borderRadius: '10px',
    color: '#020617',
    fontWeight: 700,
    fontSize: '12px',
    cursor: 'pointer',
  },
  removeButton: {
    background: '#ef444415',
    border: '1px solid #ef444430',
    padding: '8px',
    borderRadius: '10px',
    color: '#ef4444',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    color: '#fff',
    gap: '16px',
    textAlign: 'center',
    padding: '24px',
  },
  errorTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 800,
  },
  errorText: {
    margin: 0,
    color: '#94a3b8',
    fontSize: '14px',
    maxWidth: '480px',
  },
  emptyState: {
    padding: '48px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '14px',
  },
};