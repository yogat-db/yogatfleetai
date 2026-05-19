'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  X,
  LayoutDashboard,
  Truck,
  ShoppingCart,
  Wrench,
  History,
  Settings,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

type NavItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  group: 'main' | 'workspace';
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsAdmin(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        setIsAdmin(profile?.role === 'admin');
      } catch (err) {
        console.error('Role fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchRoles();
  }, []);

  useEffect(() => {
    if (isOpen) onClose();
  }, [pathname]);

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        group: 'main',
      },
      {
        name: 'Fleet',
        href: '/fleet',
        icon: Truck,
        group: 'main',
      },
      {
        name: 'Marketplace',
        href: '/marketplace',
        icon: ShoppingCart,
        group: 'main',
      },
      {
        name: 'Diagnostics',
        href: '/diagnostics',
        icon: Wrench,
        group: 'workspace',
      },
      {
        name: 'Service History',
        href: '/service-history',
        icon: History,
        group: 'workspace',
      },
      {
        name: 'Control Center',
        href: '/control-center',
        icon: Settings,
        group: 'workspace',
      },
    ];

    if (!loading && isAdmin) {
      items.push({
        name: 'Admin Dashboard',
        href: '/admin',
        icon: ShieldCheck,
        group: 'workspace',
      });
    }

    return items;
  }, [isAdmin, loading]);

  const mainItems = navItems.filter((item) => item.group === 'main');
  const workspaceItems = navItems.filter((item) => item.group === 'workspace');

  const handleNavigation = (href: string) => {
    router.push(href);
    onClose();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const isActivePath = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={styles.backdrop}
      />

      <aside
        aria-label="Sidebar navigation"
        style={styles.sidebar}
      >
        <div style={styles.topRow}>
          <div style={styles.brandBlock}>
            <div style={styles.brandIcon}>
              <Truck size={18} />
            </div>
            <div>
              <div style={styles.brandEyebrow}>Yogat Fleet AI</div>
              <div style={styles.brandTitle}>Command Panel</div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close sidebar"
            style={styles.closeButton}
          >
            <X size={20} />
          </button>
        </div>

        <div style={styles.statusCard}>
          <div style={styles.statusHeader}>
            <Sparkles size={14} />
            <span style={styles.statusLabel}>System Status</span>
          </div>
          <p style={styles.statusText}>
            Navigation has been streamlined for faster fleet actions and cleaner marketplace access.
          </p>
        </div>

        <nav style={styles.nav}>
          <NavSection title="Main">
            {mainItems.map((item) => (
              <NavButton
                key={item.href}
                item={item}
                active={isActivePath(item.href)}
                onClick={() => handleNavigation(item.href)}
              />
            ))}
          </NavSection>

          <NavSection title="Workspace">
            {workspaceItems.map((item) => (
              <NavButton
                key={item.href}
                item={item}
                active={isActivePath(item.href)}
                onClick={() => handleNavigation(item.href)}
              />
            ))}
          </NavSection>
        </nav>

        <div style={styles.bottomArea}>
          <button
            onClick={handleLogout}
            style={styles.logoutButton}
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function NavSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      <div style={styles.sectionBody}>{children}</div>
    </section>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      style={{
        ...styles.navButton,
        ...(active ? styles.navButtonActive : {}),
      }}
      aria-current={active ? 'page' : undefined}
    >
      <div
        style={{
          ...styles.navIconWrap,
          ...(active ? styles.navIconWrapActive : {}),
        }}
      >
        <Icon size={18} />
      </div>

      <div style={styles.navTextWrap}>
        <span
          style={{
            ...styles.navLabel,
            ...(active ? styles.navLabelActive : {}),
          }}
        >
          {item.name}
        </span>
      </div>

      <ChevronRight
        size={16}
        style={{
          ...styles.chevron,
          ...(active ? styles.chevronActive : {}),
        }}
      />
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background:
      'linear-gradient(180deg, rgba(2,6,23,0.72) 0%, rgba(2,6,23,0.82) 100%)',
    backdropFilter: 'blur(6px)',
    zIndex: 1000,
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: '300px',
    background:
      'linear-gradient(180deg, #08111f 0%, #0b1526 48%, #0c172a 100%)',
    zIndex: 1001,
    padding: '20px 18px 18px',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid rgba(148,163,184,0.12)',
    boxShadow: '0 24px 60px rgba(2, 6, 23, 0.45)',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '18px',
  },
  brandBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  brandIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#d7f7e9',
    background: 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(16,185,129,0.12))',
    border: '1px solid rgba(52,211,153,0.25)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  brandEyebrow: {
    fontSize: '10px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    color: '#7dd3fc',
    marginBottom: '4px',
  },
  brandTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#f8fafc',
    letterSpacing: '-0.02em',
  },
  closeButton: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    border: '1px solid rgba(148,163,184,0.14)',
    background: 'rgba(15,23,42,0.75)',
    color: '#cbd5e1',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCard: {
    padding: '14px',
    borderRadius: '18px',
    background: 'rgba(15, 23, 42, 0.72)',
    border: '1px solid rgba(125, 211, 252, 0.14)',
    marginBottom: '20px',
  },
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#7dd3fc',
    marginBottom: '8px',
  },
  statusLabel: {
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  statusText: {
    margin: 0,
    fontSize: '13px',
    lineHeight: 1.6,
    color: '#94a3b8',
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    color: '#64748b',
    padding: '0 8px',
  },
  sectionBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  navButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '16px',
    border: '1px solid transparent',
    background: 'transparent',
    color: '#cbd5e1',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 180ms ease',
  },
  navButtonActive: {
    background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(34,197,94,0.10))',
    border: '1px solid rgba(34,197,94,0.24)',
    boxShadow: '0 10px 30px rgba(16,185,129,0.08)',
  },
  navIconWrap: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(148,163,184,0.08)',
    color: '#cbd5e1',
    flexShrink: 0,
  },
  navIconWrapActive: {
    background: 'rgba(34,197,94,0.16)',
    color: '#86efac',
  },
  navTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  navLabel: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#cbd5e1',
    letterSpacing: '-0.01em',
  },
  navLabelActive: {
    color: '#f8fafc',
  },
  chevron: {
    color: '#64748b',
    flexShrink: 0,
  },
  chevronActive: {
    color: '#86efac',
  },
  bottomArea: {
    marginTop: '18px',
    paddingTop: '18px',
    borderTop: '1px solid rgba(148,163,184,0.12)',
  },
  logoutButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '13px 14px',
    borderRadius: '16px',
    background: 'rgba(127, 29, 29, 0.14)',
    border: '1px solid rgba(248,113,113,0.16)',
    color: '#fca5a5',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 600,
  },
};