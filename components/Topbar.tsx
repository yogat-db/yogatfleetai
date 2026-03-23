// components/Topbar.tsx
'use client';

import { useRouter } from 'next/navigation';
import NotificationBell from './NotificationBell'; // default import works now
import theme from '@/app/theme';

export default function Topbar() {
  const router = useRouter();

  return (
    <div style={styles.topbar}>
      <div style={styles.left}>
        <button onClick={() => router.back()} style={styles.backButton}>
          ← Back
        </button>
      </div>
      <div style={styles.right}>
        <NotificationBell />
      </div>
    </div>
  );
}

const styles = {
  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    background: theme.colors.background.card,
    borderBottom: `1px solid ${theme.colors.border.light}`,
  },
  backButton: {
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    color: theme.colors.text.secondary,
    padding: '4px 12px',
    borderRadius: theme.borderRadius.lg,
    cursor: 'pointer',
  },
  left: { flex: 1 },
  right: { display: 'flex', alignItems: 'center', gap: 16 },
} as const;