// app/admin/users/page.tsx
import type { CSSProperties } from 'react';
import { AlertTriangle, ShieldCheck, Users } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin-auth';
import { UsersTableClient } from './UsersTableClient';
import theme from '@/app/theme';

export const metadata = {
  title: 'User Management | Admin Console',
};

type UserProfile = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  created_at?: string | null;
  location?: string | null;
  phone?: string | null;
};

export default async function AdminUsersPage() {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div style={styles.page}>
        <section style={styles.errorCard}>
          <AlertTriangle size={20} color={theme.colors.status.critical} />
          <div>
            <h1 style={styles.errorTitle}>Error loading users</h1>
            <p style={styles.errorText}>{error.message}</p>
          </div>
        </section>
      </div>
    );
  }

  const profiles: UserProfile[] = data ?? [];
  const adminCount = profiles.filter((user) => user.role === 'admin').length;
  const mechanicCount = profiles.filter((user) => user.role === 'mechanic').length;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.kicker}>Admin Console</div>
          <h1 style={styles.title}>User Management</h1>
          <p style={styles.subtitle}>
            Review platform users, roles, and account records across the system.
          </p>
        </div>

        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>
              <Users size={18} color={theme.colors.primary} />
            </div>
            <div>
              <div style={styles.summaryValue}>{profiles.length}</div>
              <div style={styles.summaryLabel}>Total users</div>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>
              <ShieldCheck size={18} color={theme.colors.status.healthy} />
            </div>
            <div>
              <div style={styles.summaryValue}>{adminCount}</div>
              <div style={styles.summaryLabel}>Admins</div>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>
              <Users size={18} color="#38bdf8" />
            </div>
            <div>
              <div style={styles.summaryValue}>{mechanicCount}</div>
              <div style={styles.summaryLabel}>Mechanics</div>
            </div>
          </div>
        </div>
      </header>

      <section style={styles.tableSection}>
        <UsersTableClient initialUsers={profiles} />
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: theme.colors.background.main,
    padding: '24px',
    color: theme.colors.text.primary,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '20px',
    flexWrap: 'wrap',
    marginBottom: '24px',
  },
  kicker: {
    fontSize: '11px',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    color: theme.colors.primary,
    marginBottom: '8px',
  },
  title: {
    margin: 0,
    fontSize: '32px',
    fontWeight: 800,
    letterSpacing: '-0.03em',
  },
  subtitle: {
    margin: '10px 0 0',
    fontSize: '14px',
    color: theme.colors.text.secondary,
    maxWidth: '620px',
    lineHeight: 1.6,
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px',
    minWidth: 'min(100%, 540px)',
  },
  summaryCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(15, 23, 42, 0.72)',
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: '18px',
    padding: '16px',
  },
  summaryIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${theme.colors.border.medium}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  summaryValue: {
    fontSize: '22px',
    fontWeight: 800,
    lineHeight: 1.1,
    color: theme.colors.text.primary,
  },
  summaryLabel: {
    marginTop: '4px',
    fontSize: '12px',
    color: theme.colors.text.muted,
  },
  tableSection: {
    background: 'transparent',
  },
  errorCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '18px',
    borderRadius: '18px',
    background: `${theme.colors.status.critical}12`,
    border: `1px solid ${theme.colors.status.critical}`,
    maxWidth: '720px',
  },
  errorTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 800,
    color: theme.colors.text.primary,
  },
  errorText: {
    margin: '6px 0 0',
    fontSize: '14px',
    color: theme.colors.text.secondary,
    lineHeight: 1.5,
  },
};