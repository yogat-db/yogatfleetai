// app/admin/AdminLayoutClient.tsx
'use client';

import { useState, useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import theme from '@/app/theme';
import { Menu } from 'lucide-react';

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // On mobile, the sidebar is shown as an overlay when open.
  // On desktop, it's always visible.
  const showSidebar = !isMobile || sidebarOpen;

  return (
    <div style={styles.container}>
      {/* Mobile menu button */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={styles.menuButton}
          aria-label="Toggle menu"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Sidebar – conditionally shown on mobile */}
      <div
        style={{
          ...styles.sidebarWrapper,
          transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
          position: isMobile ? 'fixed' : 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 100,
        }}
      >
        <AdminSidebar />
      </div>

      {/* Overlay when mobile sidebar is open */}
      {isMobile && sidebarOpen && (
        <div
          style={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>Admin Dashboard</h1>
        </div>
        <div style={styles.content}>
          {children}
        </div>
      </main>

      <style>{`
        @media (min-width: 768px) {
          .admin-main {
            margin-left: 280px;
          }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: theme.colors.background.main,
    position: 'relative',
  },
  sidebarWrapper: {
    transition: 'transform 0.2s ease',
    boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
  },
  menuButton: {
    position: 'fixed',
    top: '16px',
    left: '16px',
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: '12px',
    padding: '8px',
    zIndex: 101,
    cursor: 'pointer',
    color: theme.colors.text.primary,
  },
  main: {
    flex: 1,
    width: '100%',
    padding: '24px 20px',
    overflowX: 'auto',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px',
  },
  content: {
    width: '100%',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 99,
  },
};