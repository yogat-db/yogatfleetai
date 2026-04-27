// components/Topbar.tsx
'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Cpu, Power, Search, ShieldCheck, Loader2, ChevronDown, User, Settings, Lock, Bell } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { NAV_GROUPS } from '@/lib/navigation';
import theme from '@/app/theme';

async function checkAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return false;
  return data.role === 'admin';
}

export default function Topbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMechanic, setIsMechanic] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 40], [0, 0.9]);
  const backdropBlur = useTransform(scrollY, [0, 40], [0, 12]);
  const borderOpacity = useTransform(scrollY, [0, 40], [0, 1]);

  useEffect(() => {
    const fetchUserAndRoles = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setUser(null);
        setIsAdmin(false);
        setIsMechanic(false);
        setIsLoading(false);
        return;
      }
      setUser(session.user);
      const admin = await checkAdmin(session.user.id);
      setIsAdmin(admin);
      const { data: mech } = await supabase
        .from('mechanics')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      setIsMechanic(!!mech);
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('read', false);
      setUnreadCount(count || 0);
      setIsLoading(false);
    };
    fetchUserAndRoles();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to sign out?')) return;
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navLinks = useMemo(() => {
    const groups = NAV_GROUPS(isMechanic, isAdmin);
    return groups.flatMap(g => g.links).filter(l => l.show !== false);
  }, [isMechanic, isAdmin]);

  const publicPaths = ['/login', '/register', '/forgot-password', '/update-password'];
  if (publicPaths.includes(pathname)) return null;

  return (
    <motion.header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        borderBottom: `1px solid rgba(51, 65, 85, ${borderOpacity.get()})`,
        backgroundColor: `rgba(2, 6, 23, ${bgOpacity.get()})`,
        backdropFilter: `blur(${backdropBlur.get()}px)`,
        transition: 'all 0.2s ease',
        padding: '0 24px',
      }}
    >
      <div style={styles.container}>
        {/* Brand */}
        <Link href="/" style={styles.brandLink}>
          <div style={styles.logoIcon}>
            <Cpu size={18} color={theme.colors.background.main} />
          </div>
          <span className="brand-text" style={styles.brandText}>
            Yogat
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="desktop-nav" style={styles.desktopNav}>
          {navLinks.slice(0, 4).map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  ...styles.navLink,
                  color: isActive ? theme.colors.primary : theme.colors.text.secondary,
                }}
              >
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="top-nav-indicator"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '9999px',
                      background: `${theme.colors.primary}15`,
                      border: `1px solid ${theme.colors.primary}30`,
                      zIndex: -1,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div style={styles.rightActions}>
          <button style={styles.iconButton} aria-label="Search">
            <Search size={16} />
          </button>
          <button style={styles.iconButton} aria-label="Notifications">
            <div style={{ position: 'relative' }}>
              <Bell size={16} />
              {unreadCount > 0 && (
                <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </div>
          </button>

          {!isLoading && isAdmin && (
            <div style={styles.adminBadge}>
              <ShieldCheck size={12} color={theme.colors.primary} />
              <span style={styles.adminBadgeText}>Root</span>
            </div>
          )}

          {!isLoading && user ? (
            <div style={styles.dropdownContainer} ref={dropdownRef}>
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                style={styles.userButton}
                aria-label="User menu"
              >
                <div style={styles.avatar}>
                  <User size={14} />
                </div>
                <ChevronDown size={12} />
              </button>
              <AnimatePresence>
                {isUserDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={styles.dropdown}
                  >
                    <Link href="/settings" style={styles.dropdownItem} onClick={() => setIsUserDropdownOpen(false)}>
                      <Settings size={14} /> Settings
                    </Link>
                    <Link href="/privacy" style={styles.dropdownItem} onClick={() => setIsUserDropdownOpen(false)}>
                      <Lock size={14} /> Privacy
                    </Link>
                    <div style={styles.dropdownDivider} />
                    <button onClick={handleLogout} disabled={isLoggingOut} style={styles.logoutDropdown}>
                      {isLoggingOut ? <Loader2 size={14} className="spin" /> : <Power size={14} />}
                      {isLoggingOut ? ' Signing out...' : ' Sign out'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : !isLoading && !user ? (
            <Link href="/login" style={styles.loginLink}>Init Session</Link>
          ) : (
            <div style={styles.loaderPlaceholder}>
              <Loader2 size={16} className="spin" />
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* Responsive classes */
        @media (min-width: 480px) {
          .brand-text {
            display: block !important;
          }
        }
        @media (max-width: 479px) {
          .brand-text {
            display: none !important;
          }
        }
        @media (max-width: 1023px) {
          .desktop-nav {
            display: none !important;
          }
        }
        @media (min-width: 1024px) {
          .desktop-nav {
            display: flex !important;
          }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        button {
          transition: all 0.2s ease;
        }
        button:hover {
          transform: translateY(-1px);
        }
      `}</style>
    </motion.header>
  );
}

// ==================== Styles (no inline @media) ====================
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1440px',
    margin: '0 auto',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textDecoration: 'none',
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    background: theme.colors.primary,
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 12px ${theme.colors.primary}40`,
  },
  brandText: {
    fontSize: '14px',
    fontWeight: 800,
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
    color: '#fff',
    // display is handled by CSS class and media queries
  },
  desktopNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  navLink: {
    position: 'relative',
    padding: '8px 18px',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    textDecoration: 'none',
    borderRadius: '40px',
    transition: 'color 0.2s',
  },
  rightActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: `1px solid ${theme.colors.border.medium}`,
    background: 'rgba(255,255,255,0.02)',
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  badge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    background: theme.colors.status.critical,
    color: '#fff',
    fontSize: '9px',
    fontWeight: 'bold',
    borderRadius: '10px',
    minWidth: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    lineHeight: 1,
  },
  adminBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '40px',
    backgroundColor: `${theme.colors.primary}15`,
    border: `1px solid ${theme.colors.primary}30`,
    whiteSpace: 'nowrap',
  },
  adminBadgeText: {
    fontSize: '9px',
    fontWeight: 900,
    textTransform: 'uppercase',
    color: theme.colors.primary,
  },
  dropdownContainer: {
    position: 'relative',
  },
  userButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.02)',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: '40px',
    padding: '4px 12px 4px 8px',
    cursor: 'pointer',
    color: theme.colors.text.primary,
    transition: 'all 0.2s',
  },
  avatar: {
    width: '28px',
    height: '28px',
    background: `${theme.colors.primary}20`,
    borderRadius: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: '16px',
    boxShadow: theme.shadows.lg,
    minWidth: '180px',
    zIndex: 200,
    overflow: 'hidden',
    backdropFilter: 'blur(8px)',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 16px',
    textDecoration: 'none',
    fontSize: '13px',
    color: theme.colors.text.primary,
    transition: 'background 0.2s',
  },
  dropdownDivider: {
    height: '1px',
    background: theme.colors.border.light,
    margin: '4px 0',
  },
  logoutDropdown: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    fontSize: '13px',
    color: theme.colors.status.critical,
    cursor: 'pointer',
    textAlign: 'left',
  },
  loginLink: {
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: theme.colors.primary,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  loaderPlaceholder: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};