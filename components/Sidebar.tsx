// components/sidebar/Sidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Truck,
  ShoppingCart,
  Wrench,
  History,
  Settings,
  Briefcase,
  Menu,
  X,
  LogOut,
  ShieldCheck, // add this for admin icon
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

// ---------- User Role Hook (now includes admin) ----------
function useUserRole() {
  const [isMechanic, setIsMechanic] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
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

        // Check admin via profiles (use maybeSingle to avoid 406)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        setIsAdmin(profile?.role === 'admin');
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, []);

  return { isMechanic, isAdmin, loading };
}

// ---------- Safe theme access ----------
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
const textSecondary = getThemeValue('colors.text.secondary', '#94a3b8');
const bgCard = getThemeValue('colors.background.card', '#0f172a');
const borderLight = getThemeValue('colors.border.light', '#1e293b');
const borderMedium = getThemeValue('colors.border.medium', '#334155');
const activeBg = getThemeValue('colors.background.subtle', '#1e293b');

// ---------- Main Sidebar Component ----------
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isMechanic, isAdmin, loading } = useUserRole();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const publicPaths = ['/login', '/register', '/forgot-password', '/update-password'];
  if (publicPaths.includes(pathname)) return null;

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to sign out?')) return;
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Regular user menu items
  const mainMenuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
    { name: 'Fleet', href: '/fleet', icon: Truck, exact: true },
    { name: 'Marketplace', href: '/marketplace', icon: ShoppingCart, exact: false },
    { name: 'Diagnostics', href: '/diagnostics', icon: Wrench, exact: true },
    { name: 'Service History', href: '/service-history', icon: History, exact: true },
    { name: 'Control Center', href: '/control-center', icon: Settings, exact: true },
  ];

  const mechanicItems = [
    { name: 'Mechanic Dashboard', href: '/marketplace/mechanics/dashboard', icon: Briefcase, exact: false },
  ];

  // Admin item – only shown if user is admin
  const adminItem = { name: 'Admin Dashboard', href: '/admin', icon: ShieldCheck, exact: false };

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const renderNavItems = (items: typeof mainMenuItems) => (
    <>
      {items.map((item) => {
        const active = isActive(item.href, item.exact);
        return (
          <div key={item.href} style={{ position: 'relative' }}>
            <a onClick={() => router.push(item.href)} style={{ textDecoration: 'none', cursor: 'pointer' }}>
              <motion.div
                whileHover={{ x: 4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  ...styles.navItem,
                  background: active ? activeBg : 'transparent',
                  borderLeft: active ? `3px solid ${primaryColor}` : '3px solid transparent',
                }}
              >
                <item.icon size={20} color={active ? primaryColor : textSecondary} />
                {!isCollapsed && <span style={{ marginLeft: '12px' }}>{item.name}</span>}
              </motion.div>
            </a>
            {isCollapsed && hoveredItem === item.name && <div style={styles.tooltip}>{item.name}</div>}
          </div>
        );
      })}
    </>
  );

  const renderContent = () => (
    <>
      {renderNavItems(mainMenuItems)}
      {!loading && isMechanic && renderNavItems(mechanicItems)}
      {/* 🔥 Admin link – only shown when user is admin */}
      {!loading && isAdmin && (
        <div style={{ position: 'relative' }}>
          <a onClick={() => router.push(adminItem.href)} style={{ textDecoration: 'none', cursor: 'pointer' }}>
            <motion.div
              whileHover={{ x: 4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              onMouseEnter={() => setHoveredItem(adminItem.name)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                ...styles.navItem,
                background: isActive(adminItem.href, adminItem.exact) ? activeBg : 'transparent',
                borderLeft: isActive(adminItem.href, adminItem.exact) ? `3px solid ${primaryColor}` : '3px solid transparent',
              }}
            >
              <adminItem.icon size={20} color={isActive(adminItem.href, adminItem.exact) ? primaryColor : textSecondary} />
              {!isCollapsed && <span style={{ marginLeft: '12px' }}>{adminItem.name}</span>}
            </motion.div>
          </a>
          {isCollapsed && hoveredItem === adminItem.name && <div style={styles.tooltip}>{adminItem.name}</div>}
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleLogout}
        disabled={isLoggingOut}
        style={{
          ...styles.logoutButton,
          opacity: isLoggingOut ? 0.6 : 1,
          cursor: isLoggingOut ? 'not-allowed' : 'pointer',
        }}
      >
        <LogOut size={20} />
        {!isCollapsed && <span style={{ marginLeft: '12px' }}>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>}
      </motion.button>
    </>
  );

  const MobileDrawer = () => (
    <AnimatePresence>
      {isMobileOpen && (
        <motion.div
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          exit={{ x: -300 }}
          transition={{ type: 'spring', damping: 25 }}
          style={styles.mobileDrawer}
        >
          <div style={styles.drawerHeader}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsMobileOpen(false)}
              style={styles.closeButton}
            >
              <X size={24} />
            </motion.button>
          </div>
          <div style={styles.drawerContent}>{renderContent()}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {isMobile && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsMobileOpen(true)}
          style={styles.menuButton}
        >
          <Menu size={24} />
        </motion.button>
      )}
      <MobileDrawer />

      {!isMobile && (
        <motion.aside
          initial={{ x: -260 }}
          animate={{ x: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          style={{
            ...styles.desktopSidebar,
            width: isCollapsed ? 80 : 260,
          }}
        >
          <div style={styles.logoContainer}>
            <motion.h1
              whileHover={{ scale: 1.02 }}
              onClick={() => router.push('/dashboard')}
              style={styles.logoText}
            >
              {!isCollapsed ? 'Yogat' : 'Y'}
            </motion.h1>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsCollapsed(!isCollapsed)}
              style={styles.collapseButton}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? '→' : '←'}
            </motion.button>
          </div>
          <nav style={styles.nav}>{renderContent()}</nav>
        </motion.aside>
      )}

      {isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={styles.overlay}
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}

// ==================== Styles (unchanged, same as before) ====================
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
    transition: 'width 0.2s ease',
  },
  logoContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 16px',
    borderBottom: `1px solid ${borderLight}`,
  },
  logoText: {
    fontSize: '22px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #f8fafc 0%, #22c55e 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
    cursor: 'pointer',
    letterSpacing: '-0.5px',
  },
  collapseButton: {
    background: 'transparent',
    border: `1px solid ${borderMedium}`,
    color: textSecondary,
    cursor: 'pointer',
    fontSize: 18,
    padding: '4px 8px',
    borderRadius: '8px',
    marginLeft: '8px',
  },
  nav: {
    flex: 1,
    padding: '20px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background 0.2s, border-left 0.2s',
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    left: '100%',
    top: '50%',
    transform: 'translateY(-50%)',
    marginLeft: '12px',
    background: theme.colors.background.card,
    color: theme.colors.text.primary,
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    zIndex: 100,
    boxShadow: `0 4px 12px rgba(0,0,0,0.3)`,
    border: `1px solid ${borderLight}`,
    pointerEvents: 'none',
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    background: 'transparent',
    border: `1px solid ${borderMedium}`,
    borderRadius: '12px',
    padding: '10px 14px',
    color: textSecondary,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: 'auto',
    marginBottom: '20px',
    width: 'calc(100% - 24px)',
    marginLeft: '12px',
    marginRight: '12px',
  },
  menuButton: {
    position: 'fixed',
    top: '16px',
    left: '16px',
    background: bgCard,
    border: `1px solid ${borderLight}`,
    borderRadius: '12px',
    padding: '8px',
    cursor: 'pointer',
    zIndex: 40,
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
    background: 'rgba(0,0,0,0.6)',
    zIndex: 45,
  },
};