import theme from '@/app/theme'

const MyComponent = () => (
  <div style={{ background: theme.colors.background.main, color: theme.colors.text.primary }}>
    <h1 style={{ background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
      Hello
    </h1>
  </div>
)
export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <div style={{ fontSize: size, fontWeight: 800, color: '#22c55e', letterSpacing: '-0.5px' }}>
      Yogat
    </div>
  )
}
