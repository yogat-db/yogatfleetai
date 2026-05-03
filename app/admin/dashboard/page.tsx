// app/admin/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ users: 0, mechanics: 0, vehicles: 0, jobs: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: mechanics } = await supabase.from('mechanics').select('*', { count: 'exact', head: true });
      const { count: vehicles } = await supabase.from('vehicles').select('*', { count: 'exact', head: true });
      const { count: jobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true });
      setStats({ users: users || 0, mechanics: mechanics || 0, vehicles: vehicles || 0, jobs: jobs || 0 });
    };
    fetchStats();
  }, []);

  return (
    // Force full width – no margins, no max-width
    <div style={{ width: '100%', padding: 0, margin: 0 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
      }}>
        <StatCard title="Total Users" value={stats.users} />
        <StatCard title="Mechanics" value={stats.mechanics} />
        <StatCard title="Vehicles" value={stats.vehicles} />
        <StatCard title="Jobs" value={stats.jobs} />
      </div>
      {/* You can add more widgets here later */}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div style={{
      background: theme.colors.background.card,
      border: `1px solid ${theme.colors.border.light}`,
      borderRadius: '1.5rem',
      padding: '1.5rem',
      transition: 'transform 0.2s',
    }}>
      <div style={{ fontSize: '0.875rem', color: theme.colors.text.secondary, marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ fontSize: '2.5rem', fontWeight: 800, color: theme.colors.text.primary }}>{value}</div>
    </div>
  );
}