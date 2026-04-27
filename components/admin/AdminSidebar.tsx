// components/admin/AdminSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Briefcase, Users, UserCog, LogOut, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

export default function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Jobs', href: '/admin/jobs', icon: Briefcase },
    { name: 'Mechanics', href: '/admin/mechanics', icon: Users },
    { name: 'Users', href: '/admin/users', icon: UserCog },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo}>
        <ShieldCheck size={24} color={theme.colors.primary} />
        <span>Admin Portal</span>
      </div>
      <nav style={styles.nav}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...styles.navLink,
                background: isActive ? `${theme.colors.primary}15` : 'transparent',
                color: isActive ? theme.colors.primary : theme.colors.text.secondary,
                borderLeft: isActive ? `3px solid ${theme.colors.primary}` : '3px solid transparent',
              }}
            >
              <item.icon size={18} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <button onClick={handleLogout} style={styles.logoutBtn}>
        <LogOut size={18} />
        <span>Sign Out</span>
      </button>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: '280px',
    background: theme.colors.background.card,
    borderRight: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    zIndex: 40,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '18px',
    fontWeight: 700,
    color: theme.colors.text.primary,
    marginBottom: '40px',
    paddingBottom: '20px',
    borderBottom: `1px solid ${theme.colors.border.light}`,
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    borderRadius: '8px',
    transition: 'all 0.2s',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: 'auto',
    padding: '10px 16px',
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: '8px',
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};