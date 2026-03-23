// components/NotificationBell.tsx
'use client';

import { Bell } from 'lucide-react';
import theme from '@/app/theme';

export default function NotificationBell() {
  return (
    <button style={styles.button}>
      <Bell size={18} color={theme.colors.text.secondary} />
    </button>
  );
}

const styles = {
  button: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: theme.borderRadius.lg,
    transition: theme.transitions.default,
    ':hover': {
      background: theme.colors.background.elevated,
    },
  },
} as const;