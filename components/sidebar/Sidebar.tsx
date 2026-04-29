// components/sidebar/Sidebar.tsx - with mechanic & admin dashboards
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { 
  X, LayoutDashboard, Truck, ShoppingCart, Wrench, 
  History, Settings, LogOut, Briefcase, ShieldCheck 
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMechanic, setIsMechanic] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch user roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Check admin (from profiles table)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        setIsAdmin(profile?.role === 'admin');
        
        // Check mechanic (from mechanics table)
        const { data: mechanic } = await supabase
          .from('mechanics')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        setIsMechanic(!!mechanic);
      } catch (err) {
        console.error('Role fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isOpen) onClose();
  }, [pathname]);

  // Base navigation for all users
  const baseNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Fleet', href: '/fleet', icon: Truck },
    { name: 'Marketplace', href: '/marketplace', icon: ShoppingCart },
    { name: 'Diagnostics', href: '/diagnostics', icon: Wrench },
    { name: 'Service History', href: '/service-history', icon: History },
    { name: 'Control Center', href: '/control-center', icon: Settings },
  ];

  // Role-specific items
  const mechanicItem = { name: 'Mechanic Dashboard', href: '/marketplace/mechanics/dashboard', icon: Briefcase };
  const adminItem = { name: 'Admin Dashboard', href: '/admin', icon: ShieldCheck };

  // Build final nav items (only add if role is true and not loading)
  let navItems = [...baseNavItems];
  if (!loading && isMechanic) navItems.push(mechanicItem);
  if (!loading && isAdmin) navItems.push(adminItem);

  const handleNavigation = (href: string) => {
    router.push(href);
    onClose(); // close drawer after navigation
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 1000,
        }}
      />
      {/* Sidebar panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '280px',
          backgroundColor: '#0f172a',
          zIndex: 1001,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '2px 0 10px rgba(0,0,0,0.3)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            alignSelf: 'flex-end',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            marginBottom: '20px',
          }}
        >
          <X size={24} />
        </button>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '12px',
                  background: isActive ? '#1e293b' : 'transparent',
                  color: isActive ? '#22c55e' : '#cbd5e1',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <item.icon size={20} />
                {item.name}
              </button>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            borderRadius: '12px',
            background: 'transparent',
            border: '1px solid #334155',
            color: '#ef4444',
            cursor: 'pointer',
            marginTop: 'auto',
          }}
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </>
  );
}