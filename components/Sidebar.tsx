// components/sidebar/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  UserCog,
  Menu,
  X,
  LogOut,
  FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

// ---------- Custom Hook for User Role (with loading) ----------
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

        // Admin check – hardcoded for teebaxy@gmail.com (update as needed)
        if (user.email === 'teebaxy@gmail.com') {
          setIsAdmin(true);
        } else {
          const { data: admin } = await supabase
            .from('admins')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          setIsAdmin(!!admin);
        }
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

// ---------- Helper: safe theme access ----------
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
const activeBg = getThemeValue('colors.background.elevated', '#1e293b');

// ---------- Main Component ----------
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isMechanic, isAdmin, loading } = useUserRole();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size (client-side only)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Public pages where sidebar should be hidden
  const publicPaths = ['/login', '/register', '/forgot-password', '/update-password'];
  if (publicPaths.includes(pathname)) {
    return null;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
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
    { name: 'Admin Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Admin Jobs', href: '/admin/jobs', icon: Briefcase },
    { name: 'Admin Mechanics', href: '/admin/mechanics', icon: Users },
    { name: 'Admin Users', href: '/admin/users', icon: UserCog },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const renderNavItems = (items: typeof menuItems) => (
    <>
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <a
            key={item.href}
            onClick={() => router.push(item.href)}
            style={{ textDecoration: 'none', cursor: 'pointer' }}
          >
            <motion.div
              whileHover={{ x: 4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
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
        );
      })}
    </>
  );

  // Render main content (with Privacy Policy link before logout)
  const renderContent = () => (
    <>
      {renderNavItems(menuItems)}
      {!loading && isMechanic && renderNavItems(mechanicItems)}
      {!loading && isAdmin && renderNavItems(adminItems)}

      {/* Privacy Policy link */}
      <a
        onClick={() => router.push('/privacy')}
        style={{ textDecoration: 'none', cursor: 'pointer' }}
      >
        <motion.div
          whileHover={{ x: 4 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={styles.navItem}
        >
          <FileText size={20} color={textSecondary} />
          {!isCollapsed && <span style={{ marginLeft: '12px' }}>Privacy Policy</span>}
        </motion.div>
      </a>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleLogout}
        style={styles.logoutButton}
      >
        <LogOut size={20} />
        {!isCollapsed && <span style={{ marginLeft: '12px' }}>Sign Out</span>}
      </motion.button>
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
      {/* Mobile menu button (only shown on small screens) */}
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

      {/* Desktop sidebar (hidden on mobile) */}
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
            <motion.h1 whileHover={{ scale: 1.02 }} style={styles.logoText}>
              {!isCollapsed ? 'Yogat' : 'Y'}
            </motion.h1>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsCollapsed(!isCollapsed)}
              style={styles.collapseButton}
            >
              {isCollapsed ? '→' : '←'}
            </motion.button>
          </div>
          <nav style={styles.nav}>{renderContent()}</nav>
        </motion.aside>
      )}

      {/* Overlay for mobile drawer */}
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

// ==================== STYLES ====================
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
    cursor: 'pointer',
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
    transition: 'background 0.2s, border-left 0.2s',
    color: getThemeValue('colors.text.primary', '#f1f5f9'),
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