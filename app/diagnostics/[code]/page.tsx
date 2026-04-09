// app/diagnostics/[code]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getDTCInfo, type DTCInfo } from '@/lib/ai/diagnostics';
import theme from '@/app/theme';

export default function DTCDetailPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [dtc, setDtc] = useState<DTCInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const info = getDTCInfo(code);
      if (!info) {
        setError(`DTC code "${code}" not found in our database.`);
      } else {
        setDtc(info);
      }
    } catch (err) {
      setError('An error occurred while fetching DTC information.');
    } finally {
      setLoading(false);
    }
  }, [code]);

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading diagnostic data...</p>
        <style jsx>{`
          .spinner {
            border: 3px solid ${theme.colors.border.medium};
            border-top: 3px solid ${theme.colors.primary};
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <p style={{ color: theme.colors.error }}>{error}</p>
        <button onClick={() => router.back()} style={styles.backButton}>← Go Back</button>
      </div>
    );
  }

  if (!dtc) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>← Back</button>
      <h1 style={styles.code}>{dtc.code}</h1>
      <p style={styles.description}>{dtc.description}</p>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Possible Causes</h3>
        <ul style={styles.list}>
          {dtc.causes.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Suggested Fix</h3>
        <p style={styles.fixText}>{dtc.fix}</p>
        {dtc.estimatedCost && (
          <p><strong>Estimated Cost:</strong> £{dtc.estimatedCost}</p>
        )}
      </div>
    </motion.div>
  );
}

// ==================== STYLES ====================
const getThemeValue = (path: string, fallback: any) => {
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

const primaryColor = getThemeValue('colors.primary', '#22c55e');
const errorColor = getThemeValue('colors.error', '#ef4444');
const bgCard = getThemeValue('colors.background.card', '#0f172a');
const borderLight = getThemeValue('colors.border.light', '#1e293b');
const borderMedium = getThemeValue('colors.border.medium', '#334155');
const textPrimary = getThemeValue('colors.text.primary', '#f1f5f9');
const textSecondary = getThemeValue('colors.text.secondary', '#94a3b8');

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: getThemeValue('spacing.10', '40px'),
    background: getThemeValue('colors.background.main', '#020617'),
    minHeight: '100vh',
    color: textPrimary,
    fontFamily: getThemeValue('fontFamilies.sans', 'Inter, sans-serif'),
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: textSecondary,
  },
  backButton: {
    background: 'transparent',
    border: `1px solid ${borderMedium}`,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: `${getThemeValue('spacing.2', '8px')} ${getThemeValue('spacing.4', '16px')}`,
    color: textSecondary,
    cursor: 'pointer',
    marginBottom: getThemeValue('spacing.6', '24px'),
  },
  code: {
    fontSize: getThemeValue('fontSizes.4xl', '48px'),
    fontWeight: getThemeValue('fontWeights.bold', '700'),
    color: primaryColor,
    marginBottom: getThemeValue('spacing.2', '8px'),
  },
  description: {
    fontSize: getThemeValue('fontSizes.lg', '18px'),
    color: textSecondary,
    marginBottom: getThemeValue('spacing.6', '24px'),
  },
  card: {
    background: bgCard,
    padding: getThemeValue('spacing.5', '20px'),
    borderRadius: getThemeValue('borderRadius.xl', '16px'),
    border: `1px solid ${borderLight}`,
    marginBottom: getThemeValue('spacing.5', '20px'),
  },
  cardTitle: {
    fontSize: getThemeValue('fontSizes.xl', '20px'),
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    marginBottom: getThemeValue('spacing.3', '12px'),
    color: textPrimary,
  },
  list: {
    listStyleType: 'disc',
    paddingLeft: getThemeValue('spacing.5', '20px'),
    color: textSecondary,
  },
  fixText: {
    color: textSecondary,
    lineHeight: 1.6,
  },
};