import type { CSSProperties, ReactNode } from 'react';
import type { Metadata } from 'next';
import { ChevronRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import theme from '@/app/theme';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Yogat Fleet AI',
  description: 'Restricted admin workspace for platform operations.',
};

type AdminLayoutProps = {
  children: ReactNode;
};

type AdminProfile = {
  full_name: string | null;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const user = await requireAdmin();

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .limit(1)
    .maybeSingle<AdminProfile>();

  const displayName =
    profile?.full_name?.trim() ||
    user.email?.split('@')[0] ||
    'Administrator';

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.brandBlock}>
            <div style={styles.kickerRow}>
              <span style={styles.kicker}>Control / Admin</span>

              <span style={styles.roleBadge}>
                <ShieldCheck size={12} />
                Admin access
              </span>
            </div>

            <h1 style={styles.title}>Admin dashboard</h1>

            <div style={styles.metaRow}>
              <span style={styles.metaItem}>
                <LockKeyhole size={13} />
                Restricted workspace
              </span>

              <span style={styles.metaDivider}>
                <ChevronRight size={12} />
              </span>

              <span style={styles.metaItem}>{displayName}</span>
            </div>
          </div>
        </div>
      </header>

      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: theme.colors.text.primary,
    fontFamily: theme.fontFamilies.sans,
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    padding: '20px 24px',
    borderBottom: `1px solid ${theme.colors.border.light}`,
    background: `${theme.colors.background.card}F2`,
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  brandBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minWidth: 0,
  },
  kickerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  kicker: {
    margin: 0,
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.24em',
    color: theme.colors.primary,
    textTransform: 'uppercase',
  },
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 700,
    color: theme.colors.primary,
    background: `${theme.colors.primary}14`,
    border: `1px solid ${theme.colors.primary}2E`,
    width: 'fit-content',
    whiteSpace: 'nowrap',
  },
  title: {
    fontSize: 'clamp(24px, 4vw, 32px)',
    fontWeight: 800,
    letterSpacing: '-0.03em',
    margin: 0,
    color: theme.colors.text.primary,
    lineHeight: 1.05,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    color: theme.colors.text.muted,
  },
  metaItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 500,
  },
  metaDivider: {
    display: 'inline-flex',
    alignItems: 'center',
    color: theme.colors.text.muted,
    opacity: 0.6,
  },
  main: {
    padding: '24px',
    width: '100%',
    boxSizing: 'border-box',
  },
};