// components/Topbar.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Cpu, Search, ShieldCheck, Loader2, ChevronDown, User, Settings, Lock, Menu } from 'lucide-react';
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

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 40], [0, 0.95]);
  const backdropBlur = useTransform(scrollY, [0, 40], [0, 16]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setUser(null);
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }
      setUser(session.user);
      const admin = await checkAdmin(session.user.id);
      setIsAdmin(admin);
      setIsLoading(false);
    };
    fetchUser();
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
    if (!confirm('Sign out?')) return;
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const publicPaths = ['/login', '/register', '/forgot-password', '/update-password', '/terms', '/privacy'];
  if (publicPaths.includes(pathname)) return null;

  return (
    <motion.header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: `rgba(2, 6, 23, ${bgOpacity.get()})`,
        backdropFilter: `blur(${backdropBlur.get()}px)`,
        padding: '0 12px',
      }}
    >
      <div style={{ height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        {/* Hamburger button */}
        <button onClick={onMenuClick} style={styles.hamburger} aria-label="Menu">
          <Menu size={20} />
        </button>

        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '28px', height: '28px', background: '#22c55e', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu size={16} color="#fff" />
          </div>
          {!isMobile && <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '0.2em', color: '#fff' }}>Yogat</span>}
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button style={styles.iconButton}><Search size={14} /></button>
          {!isLoading && isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '20px', background: '#22c55e20', border: '1px solid #22c55e30' }}>
              <ShieldCheck size={10} color="#22c55e" />
              <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#22c55e' }}>Root</span>
            </div>
          )}
          {!isLoading && user ? (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)} style={styles.userButton}>
                <div style={{ width: '24px', height: '24px', background: '#22c55e20', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={12} />
                </div>
                <ChevronDown size={10} />
              </button>
              {isUserDropdownOpen && (
                <div style={styles.dropdown}>
                  <Link href="/settings" style={styles.dropdownItem}><Settings size={14} /> Settings</Link>
                  <Link href="/privacy" style={styles.dropdownItem}><Lock size={14} /> Privacy</Link>
                  <div style={{ height: '1px', background: '#1e293b', margin: '4px 0' }} />
                  <button onClick={handleLogout} disabled={isLoggingOut} style={styles.logoutDropdown}>
                    {isLoggingOut ? <Loader2 size={14} className="spin" /> : <></>}
                    {isLoggingOut ? ' Signing out...' : ' Sign out'}
                  </button>
                </div>
              )}
            </div>
          ) : !isLoading && !user ? (
            <Link href="/login" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#22c55e', textDecoration: 'none' }}>Login</Link>
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
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid #334155',
    borderRadius: '10px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#fff',
  },
  iconButton: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    border: '1px solid #334155',
    background: 'rgba(255,255,255,0.02)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#94a3b8',
  },
  userButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid #334155',
    borderRadius: '30px',
    padding: '2px 8px 2px 6px',
    cursor: 'pointer',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    minWidth: '160px',
    zIndex: 200,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    textDecoration: 'none',
    fontSize: '12px',
    color: '#f8fafc',
  },
  logoutDropdown: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    fontSize: '12px',
    color: '#ef4444',
    cursor: 'pointer',
  },
};