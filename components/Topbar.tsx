// components/Topbar.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Cpu,
  Search,
  ShieldCheck,
  Loader2,
  ChevronDown,
  User,
  Settings,
  Lock,
  Menu,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

async function checkAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return false;
  return data.role === 'admin';
}

type TopbarProps = {
  onMenuClick?: () => void;
};

export default function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<null | { id: string; email?: string | null }>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 40], [0, 0.96]);
  const borderOpacity = useTransform(scrollY, [0, 40], [0, 0.18]);
  const backdropBlur = useTransform(scrollY, [0, 40], [10, 20]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setUser(null);
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      setUser({ id: session.user.id, email: session.user.email });
      const admin = await checkAdmin(session.user.id);
      setIsAdmin(admin);
      setIsLoading(false);
    };

    void fetchUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (!confirm('Sign out?')) return;
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/login');
  };

  const publicPaths = [
    '/login',
    '/register',
    '/forgot-password',
    '/update-password',
    '/terms',
    '/privacy',
  ];

  if (publicPaths.includes(pathname)) return null;

  return (
    <motion.header
      style={{
        position: 'fixed',
        insetInline: 0,
        top: 0,
        zIndex: 120,
        backgroundColor: scrollY.get()
          ? `rgba(15,23,42,${bgOpacity.get()})`
          : 'rgba(15,23,42,0.86)',
        backdropFilter: `blur(${backdropBlur.get()}px)`,
        WebkitBackdropFilter: `blur(${backdropBlur.get()}px)`,
        borderBottom: `1px solid rgba(148,163,184,${borderOpacity.get()})`,
      }}
    >
      <div
        style={{
          height: 56,
          paddingInline: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <button
          onClick={onMenuClick}
          style={styles.hamburger}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>

        <Link
          href="/"
          style={styles.brandLink}
        >
          <div style={styles.brandIcon}>
            <Cpu size={16} color="#ecfdf5" />
          </div>
          {!isMobile && (
            <div style={styles.brandTextBlock}>
              <span style={styles.brandTitle}>Yogat Fleet AI</span>
              <span style={styles.brandSubtitle}>Fleet & Marketplace</span>
            </div>
          )}
        </Link>

        <div style={styles.rightCluster}>
          <button
            type="button"
            style={styles.iconButton}
            aria-label="Search"
          >
            <Search size={14} />
          </button>

          {!isLoading && isAdmin && (
            <div style={styles.adminPill}>
              <ShieldCheck size={11} color="#22c55e" />
              <span style={styles.adminLabel}>Root access</span>
            </div>
          )}

          {!isLoading && user ? (
            <div
              style={{ position: 'relative' }}
              ref={dropdownRef}
            >
              <button
                type="button"
                onClick={() => setIsUserDropdownOpen((open) => !open)}
                style={styles.userButton}
                aria-haspopup="menu"
                aria-expanded={isUserDropdownOpen}
              >
                <div style={styles.userAvatar}>
                  <User size={12} />
                </div>
                {!isMobile && (
                  <span style={styles.userEmail}>
                    {user.email ?? 'Account'}
                  </span>
                )}
                <ChevronDown size={11} />
              </button>

              {isUserDropdownOpen && (
                <div
                  style={styles.dropdown}
                  role="menu"
                >
                  <Link
                    href="/settings"
                    style={styles.dropdownItem}
                    role="menuitem"
                  >
                    <Settings size={14} />
                    <span>Settings</span>
                  </Link>

                  <Link
                    href="/privacy"
                    style={styles.dropdownItem}
                    role="menuitem"
                  >
                    <Lock size={14} />
                    <span>Privacy</span>
                  </Link>

                  <div style={styles.dropdownDivider} />

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    style={styles.logoutDropdown}
                    role="menuitem"
                  >
                    {isLoggingOut ? (
                      <Loader2 size={14} className="spin" />
                    ) : null}
                    <span>
                      {isLoggingOut ? 'Signing out…' : 'Sign out'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : !isLoading && !user ? (
            <Link
              href="/login"
              style={styles.loginLink}
            >
              Login
            </Link>
          ) : (
            <Loader2 size={16} className="spin" />
          )}
        </div>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </motion.header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hamburger: {
    background: 'rgba(15,23,42,0.85)',
    border: '1px solid rgba(148,163,184,0.45)',
    borderRadius: 10,
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#e2e8f0',
  },
  brandLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    textDecoration: 'none',
  },
  brandIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'linear-gradient(135deg, rgba(34,197,94,0.9), rgba(16,185,129,0.85))',
    boxShadow: '0 0 0 1px rgba(34,197,94,0.4), 0 8px 18px rgba(16,185,129,0.45)',
  },
  brandTextBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  brandTitle: {
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: '#f9fafb',
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#93c5fd',
  },
  rightCluster: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: '1px solid rgba(148,163,184,0.5)',
    background: 'rgba(15,23,42,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#cbd5e1',
  },
  adminPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 999,
    background: 'rgba(34,197,94,0.12)',
    border: '1px solid rgba(34,197,94,0.35)',
  },
  adminLabel: {
    fontSize: 10,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#bbf7d0',
  },
  userButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(15,23,42,0.8)',
    border: '1px solid rgba(148,163,184,0.55)',
    borderRadius: 999,
    padding: '2px 8px 2px 6px',
    cursor: 'pointer',
    color: '#e2e8f0',
    fontSize: 12,
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(34,197,94,0.2)',
    color: '#bbf7d0',
  },
  userEmail: {
    maxWidth: 160,
    fontSize: 11,
    color: '#e5e7eb',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: '#020617',
    border: '1px solid #1e293b',
    borderRadius: 12,
    minWidth: 180,
    zIndex: 200,
    boxShadow: '0 14px 40px rgba(15,23,42,0.65)',
    paddingBlock: 4,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    textDecoration: 'none',
    fontSize: 12,
    color: '#e5e7eb',
  },
  dropdownDivider: {
    height: 1,
    margin: '4px 0',
    background: '#1e293b',
  },
  logoutDropdown: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    fontSize: 12,
    color: '#f97373',
    cursor: 'pointer',
  },
  loginLink: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    color: '#22c55e',
    textDecoration: 'none',
    letterSpacing: '0.08em',
  },
};