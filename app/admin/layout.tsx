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

  return (
    <div style={styles.container}>
      {isMobile && (
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={styles.menuButton}>
          <Menu size={24} />
        </button>
      )}
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
      {isMobile && sidebarOpen && <div style={styles.overlay} onClick={() => setSidebarOpen(false)} />}
      <main style={{ ...styles.main, marginLeft: isMobile ? 0 : '280px' }}>
        <div style={styles.header}>
          <h1 style={styles.title}>Admin Dashboard</h1>
        </div>
        <div style={styles.content}>{children}</div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', minHeight: '100vh', background: theme.colors.background.main, position: 'relative' },
  sidebarWrapper: { transition: 'transform 0.25s ease', boxShadow: '2px 0 15px rgba(0,0,0,0.2)', zIndex: 100, width: '280px' },
  menuButton: { position: 'fixed', top: '16px', left: '16px', background: theme.colors.background.card, border: `1px solid ${theme.colors.border.light}`, borderRadius: '12px', padding: '8px', zIndex: 101, cursor: 'pointer', color: theme.colors.text.primary },
  main: { flex: 1, padding: '24px 20px', transition: 'margin-left 0.25s ease', overflowX: 'auto', width: '100%' },
  header: { marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: 800, background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px', margin: 0 },
  content: { width: '100%' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 },
};