import { supabaseAdmin } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Users, Wrench, Briefcase, TrendingUp } from 'lucide-react'

export default async function AdminDashboardPage() {
  const [
    { count: usersCount },
    { count: mechanicsCount },
    { count: jobsCount },
  ] = await Promise.all([
    supabaseAdmin.from('auth.users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('mechanics').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('jobs').select('*', { count: 'exact', head: true }),
  ])

  const stats = {
    users: usersCount || 0,
    mechanics: mechanicsCount || 0,
    jobs: jobsCount || 0,
    revenue: 0, // placeholder
  }

  const cards = [
    { title: 'Total Users', value: stats.users, icon: Users, href: '/admin/users', color: '#3b82f6' },
    { title: 'Mechanics', value: stats.mechanics, icon: Wrench, href: '/admin/mechanics', color: '#22c55e' },
    { title: 'Jobs', value: stats.jobs, icon: Briefcase, href: '/admin/jobs', color: '#f59e0b' },
    { title: 'Revenue', value: `£${stats.revenue}`, icon: TrendingUp, href: '/admin/revenue', color: '#ef4444' },
  ]

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Admin Dashboard</h1>
      <div style={styles.grid}>
        {cards.map((card) => (
          <Link key={card.title} href={card.href} style={styles.card}>
            <div style={{ ...styles.icon, background: `${card.color}20` }}>
              <card.icon size={24} color={card.color} />
            </div>
            <div>
              <p style={styles.cardLabel}>{card.title}</p>
              <p style={{ ...styles.cardValue, color: card.color }}>{card.value}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

const styles = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9' },
  title: { fontSize: 32, fontWeight: 700, marginBottom: 32, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 },
  card: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none', color: 'inherit' },
  icon: { width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: 14, color: '#94a3b8', marginBottom: 4 },
  cardValue: { fontSize: 24, fontWeight: 700 },
} as const
