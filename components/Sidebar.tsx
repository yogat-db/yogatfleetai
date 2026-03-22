'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Truck,
  ShoppingCart,
  Wrench,
  History,
  Settings,
  Users,
  Briefcase,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

// ---------- Custom Hook for User Role ----------
function useUserRole() {
  const [isMechanic, setIsMechanic] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check mechanic
      const { data: mechanic } = await supabase
        .from('mechanics')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsMechanic(!!mechanic);

      // Check admin – assumes an 'admins' table
      const { data: admin } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsAdmin(!!admin);

      setLoading(false);
    };
    fetchRoles();
  }, []);

  return { isMechanic, isAdmin, loading };
}
// ---------- End Hook ----------

// Constants
const primaryColor = '#22c55e';
const textSecondary = '#94a3b8';
const bgCard = '#0f172a';
const borderLight = '#1e293b';
const borderMedium = '#334155';
const errorColor = '#ef4444';
const activeBg = '#1e293b';

export default function Sidebar() {
  const pathname = usePathname();
  const { isMechanic, isAdmin, loading } = useUserRole();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Fleet', href: '/fleet', icon: Truck },
    { name: 'Marketplace', href: '/marketplace', icon: ShoppingCart },
    { name: 'Diagnostics', href: '/diagnostics', icon: Wrench },
    { name: 'Service History', href: '/service-history', icon: History },
    { name: 'Control Center', href: '/control-center', icon: Settings },
  ];

  const mechanicItems = [
    { name: 'Mechanic Dashboard', href: '/marketplace/mechanics/dashboard', icon: Briefcase },
  ];

  const adminItems = [
    { name: 'Admin Jobs', href: '/admin/jobs', icon: Briefcase },
    { name: 'Admin Mechanics', href: '/admin/mechanics', icon: Users },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const renderNavItems = (items: typeof menuItems) => (
    <>
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <motion.div
              whileHover={{ x: 4 }}
              style={{
                ...styles.navItem,
                background: active ? activeBg : 'transparent',
                borderLeft: active ? `3px solid ${primaryColor}` : '3px solid transparent',
              }}
            >
              <item.icon size={20} color={active ? primaryColor : textSecondary} />
              {!isCollapsed && <span style={{ marginLeft: '12px' }}>{item.name}</span>}
            </motion.div>
          </Link>
        );
      })}
    </>
  );

  const renderContent = () => (
    <>
      {renderNavItems(menuItems)}
      {!loading && isMechanic && renderNavItems(mechanicItems)}
      {!loading && isAdmin && renderNavItems(adminItems)}
      <button onClick={handleLogout} style={styles.logoutButton}>
        <LogOut size={20} />
        {!isCollapsed && <span style={{ marginLeft: '12px' }}>Sign Out</span>}
      </button>
    </>
  );

  // Mobile drawer
  const MobileDrawer = () => (
    <AnimatePresence>
      {isMobileOpen && (
        <motion.div
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          exit={{ x: -300 }}
          style={styles.mobileDrawer}
        >
          <div style={styles.drawerHeader}>
            <button onClick={() => setIsMobileOpen(false)} style={styles.closeButton}>
              <X size={24} />
            </button>
          </div>
          <div style={styles.drawerContent}>{renderContent()}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button onClick={() => setIsMobileOpen(true)} style={styles.menuButton}>
        <Menu size={24} />
      </button>
      <MobileDrawer />

      {/* Desktop sidebar */}
      <aside
        style={{
          ...styles.desktopSidebar,
          width: isCollapsed ? 80 : 260,
          transition: 'all 0.2s ease',
        }}
      >
        <div style={styles.logoContainer}>
          <h1 style={styles.logoText}>Yogat</h1>
          <button onClick={() => setIsCollapsed(!isCollapsed)} style={styles.collapseButton}>
            {isCollapsed ? '→' : '←'}
          </button>
        </div>
        <nav style={styles.nav}>{renderContent()}</nav>
      </aside>

      {/* Overlay for mobile */}
      {isMobileOpen && <div style={styles.overlay} onClick={() => setIsMobileOpen(false)} />}
    </>
  );
}

// ---------- Styles ----------
const styles: Record<string, React.CSSProperties> = {
  desktopSidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    background: bgCard,
    borderRight: `1px solid ${borderLight}`,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 30,
    overflowY: 'auto',
  },
  logoContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: `1px solid ${borderLight}`,
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  collapseButton: {
    background: 'transparent',
    border: 'none',
    color: textSecondary,
    cursor: 'pointer',
    fontSize: 18,
    padding: '4px',
  },
  nav: {
    flex: 1,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#f1f5f9',
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    background: 'transparent',
    border: `1px solid ${borderMedium}`,
    borderRadius: '8px',
    padding: '8px 12px',
    color: textSecondary,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: 'auto',
    width: '100%',
  },
  // Mobile styles
  menuButton: {
    position: 'fixed',
    top: '16px',
    left: '16px',
    background: bgCard,
    border: `1px solid ${borderLight}`,
    borderRadius: '8px',
    padding: '8px',
    cursor: 'pointer',
    zIndex: 40,
    display: 'none', // hidden on desktop by default
  },
  mobileDrawer: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    background: bgCard,
    borderRight: `1px solid ${borderLight}`,
    zIndex: 50,
    overflowY: 'auto',
  },
  drawerHeader: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '16px',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: textSecondary,
    cursor: 'pointer',
  },
  drawerContent: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 45,
  },
};
