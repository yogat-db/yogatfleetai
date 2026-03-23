import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import theme from '@/app/theme';

export const metadata = {
  title: 'Manage Mechanics | Admin',
};

async function verifyMechanic(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  await supabaseAdmin.from('mechanics').update({ verified: true }).eq('id', id);
  revalidatePath('/admin/mechanics');
  redirect('/admin/mechanics');
}

async function removeMechanic(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  await supabaseAdmin.from('mechanics').delete().eq('id', id);
  revalidatePath('/admin/mechanics');
  redirect('/admin/mechanics');
}

export default async function AdminMechanicsPage() {
  const { data: mechanics, error } = await supabaseAdmin
    .from('mechanics')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Manage Mechanics</h1>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableRow}>
              <th style={styles.tableHeader}>Business Name</th>
              <th style={styles.tableHeader}>Phone</th>
              <th style={styles.tableHeader}>Address</th>
              <th style={styles.tableHeader}>Verified</th>
              <th style={styles.tableHeader}>Subscription</th>
              <th style={styles.tableHeader}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mechanics?.map(mech => (
              <tr key={mech.id} style={styles.tableRow}>
                <td style={styles.tableCell}>{mech.business_name}</td>
                <td style={styles.tableCell}>{mech.phone || '—'}</td>
                <td style={styles.tableCell}>{mech.address || '—'}</td>
                <td style={styles.tableCell}>{mech.verified ? '✓' : '✗'}</td>
                <td style={styles.tableCell}>{mech.subscription_status || 'inactive'}</td>
                <td style={styles.tableCell}>
                  <div style={styles.actions}>
                    {!mech.verified && (
                      <form action={verifyMechanic}>
                        <input type="hidden" name="id" value={mech.id} />
                        <button type="submit" style={styles.verifyButton}>
                          Verify
                        </button>
                      </form>
                    )}
                    <form action={removeMechanic}>
                      <input type="hidden" name="id" value={mech.id} />
                      <button type="submit" style={styles.removeButton}>
                        Remove
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Inline styles – no CSS module, no :hover pseudo-classes
const styles: Record<string, React.CSSProperties> = {
  container: {
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
  tableHeader: {
    padding: theme.spacing[3],
    textAlign: 'left',
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.text.secondary,
  },
  tableCell: {
    padding: theme.spacing[3],
    color: theme.colors.text.primary,
  },
  actions: {
    display: 'flex',
    gap: theme.spacing[2],
  },
  verifyButton: {
    background: theme.colors.primary,
    border: 'none',
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    borderRadius: theme.borderRadius.lg,
    color: theme.colors.background.main,
    fontWeight: theme.fontWeights.medium,
    cursor: 'pointer',
    transition: 'background 0.2s ease', // transition but no :hover
  },
  removeButton: {
    background: theme.colors.error,
    border: 'none',
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    borderRadius: theme.borderRadius.lg,
    color: '#fff',
    fontWeight: theme.fontWeights.medium,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
};