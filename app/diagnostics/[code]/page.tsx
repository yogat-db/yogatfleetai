import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CircleAlert, Wrench } from 'lucide-react';
import { getDTCInfo, type DTCInfo } from '@/lib/ai/diagnostics';
import theme from '@/app/theme';

type DTCDetailPageProps = {
  params: Promise<{
    code: string;
  }>;
};

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

export default async function DTCDetailPage({ params }: DTCDetailPageProps) {
  const { code } = await params;
  const normalizedCode = normalizeCode(code);
  const dtc = getDTCInfo(normalizedCode) as DTCInfo | null;

  if (!dtc) {
    notFound();
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <Link href="/diagnostics" style={styles.backLink}>
          <ArrowLeft size={16} />
          Back to diagnostics
        </Link>

        <header style={styles.hero}>
          <div style={styles.badge}>Diagnostic trouble code</div>
          <h1 style={styles.code}>{dtc.code}</h1>
          <p style={styles.description}>{dtc.description}</p>
        </header>

        <div style={styles.grid}>
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <CircleAlert size={18} color={theme.colors.primary} />
              <h2 style={styles.cardTitle}>Possible causes</h2>
            </div>

            <ul style={styles.list}>
              {dtc.causes.map((cause, index) => (
                <li key={`${dtc.code}-cause-${index}`} style={styles.listItem}>
                  {cause}
                </li>
              ))}
            </ul>
          </section>

          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <Wrench size={18} color={theme.colors.primary} />
              <h2 style={styles.cardTitle}>Suggested fix</h2>
            </div>

            <p style={styles.fixText}>{dtc.fix}</p>

            {typeof dtc.estimatedCost === 'number' && (
              <div style={styles.costBox}>
                <span style={styles.costLabel}>Estimated cost</span>
                <span style={styles.costValue}>£{dtc.estimatedCost}</span>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: theme.colors.background.main,
    color: theme.colors.text.primary,
    fontFamily: theme.fontFamilies.sans,
    padding: '40px 24px',
  },
  container: {
    maxWidth: 960,
    margin: '0 auto',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    textDecoration: 'none',
    color: theme.colors.text.secondary,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: '10px',
    padding: '10px 14px',
    marginBottom: '24px',
  },
  hero: {
    marginBottom: '28px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: '999px',
    background: `${theme.colors.primary}18`,
    color: theme.colors.primary,
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '14px',
  },
  code: {
    margin: 0,
    fontSize: 'clamp(36px, 8vw, 56px)',
    lineHeight: 1,
    fontWeight: 800,
    color: theme.colors.primary,
  },
  description: {
    margin: '12px 0 0 0',
    fontSize: '18px',
    lineHeight: 1.6,
    color: theme.colors.text.secondary,
    maxWidth: '60ch',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  card: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: '18px',
    padding: '22px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '14px',
  },
  cardTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    color: theme.colors.text.primary,
  },
  list: {
    margin: 0,
    paddingLeft: '20px',
    color: theme.colors.text.secondary,
  },
  listItem: {
    marginBottom: '10px',
    lineHeight: 1.6,
  },
  fixText: {
    margin: 0,
    color: theme.colors.text.secondary,
    lineHeight: 1.7,
  },
  costBox: {
    marginTop: '18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '12px',
    background: `${theme.colors.primary}12`,
    border: `1px solid ${theme.colors.primary}30`,
  },
  costLabel: {
    color: theme.colors.text.secondary,
    fontSize: '14px',
    fontWeight: 600,
  },
  costValue: {
    color: theme.colors.primary,
    fontSize: '18px',
    fontWeight: 800,
  },
};