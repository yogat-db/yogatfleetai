'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import theme from '@/app/theme';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <Topbar />
        <div style={styles.content}>{children}</div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: theme.colors.background.main,
  },
  main: {
    flex: 1,
    marginLeft: '260px', // match your sidebar expanded width (as in Sidebar.tsx)
    transition: 'margin-left 0.2s ease',
    minHeight: '100vh',
  },
  content: {
    padding: theme.spacing[6],
  },
};