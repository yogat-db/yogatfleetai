import { ReactNode } from 'react'
import theme from '@/app/theme'

const MyComponent = () => (
  <div style={{ background: theme.colors.background.main, color: theme.colors.text.primary }}>
    <h1 style={{ background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
      Hello
    </h1>
  </div>
)
export default function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div style={styles.header}>
      <h1 style={styles.title}>{title}</h1>
      {action && <div>{action}</div>}
    </div>
  )
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 32, fontWeight: 700, color: '#f1f5f9', margin: 0 },
} as const
 
