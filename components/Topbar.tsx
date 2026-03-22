'use client'
import theme from '@/app/theme'

const MyComponent = () => (
  <div style={{ background: theme.colors.background.main, color: theme.colors.text.primary }}>
    <h1 style={{ background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
      Hello
    </h1>
  </div>
)
import { useRouter } from 'next/navigation'
import NotificationBell from './NotificationBell'

export default function Topbar() {
  const router = useRouter()
  return (
    <div style={styles.topbar}>
      <div style={styles.left}>
        <button onClick={() => router.back()} style={styles.backButton}>←</button>
      </div>
      <div style={styles.right}>
        <NotificationBell />
      </div>
    </div>
  )
}

const styles = {
  topbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#0f172a', borderBottom: '1px solid #1e293b' },
  backButton: { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '4px 12px', borderRadius: 6, cursor: 'pointer' },
  left: { flex: 1 },
  right: { display: 'flex', alignItems: 'center', gap: 16 },
} as const