import { ReactNode } from 'react'
import theme from '@/app/theme'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div style={styles.header}>
      <div style={styles.textStack}>
        <h1 style={styles.title}>{title}</h1>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>
      
      {action && (
        <div style={styles.actionWrapper}>
          {action}
        </div>
      )}
    </div>
  )
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end', // Aligns action button with the baseline of title
    marginBottom: theme.spacing[8],
    paddingBottom: theme.spacing[4],
    borderBottom: `1px solid ${theme.colors.border.light}`,
    // Subtle gradient fade at the bottom
    backgroundImage: `linear-gradient(to right, ${theme.colors.border.light} 0%, transparent 100%)`,
    backgroundSize: '100% 1px',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'bottom',
  },
  textStack: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: theme.spacing[1],
  },
  title: {
    fontSize: theme.fontSizes['4xl'],
    fontWeight: theme.fontWeights.bold,
    margin: 0,
    letterSpacing: '-0.02em',
    // Applying your theme's title gradient
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: theme.colors.text.primary, // Fallback
  },
  subtitle: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.fontWeights.medium,
    margin: 0,
  },
  actionWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
} as const