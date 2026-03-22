import VehicleCardPremium from './VehicleCardPremium'
import theme from '@/app/theme'

const MyComponent = () => (
  <div style={{ background: theme.colors.background.main, color: theme.colors.text.primary }}>
    <h1 style={{ background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
      Hello
    </h1>
  </div>
)
interface VehicleGridProps {
  vehicles: any[]
  onVehicleClick?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export default function VehicleGrid({ vehicles, onVehicleClick, onEdit, onDelete }: VehicleGridProps) {
  return (
    <div style={styles.grid}>
      {vehicles.map(v => (
        <VehicleCardPremium
          key={v.id}
          vehicle={v}
          onClick={() => onVehicleClick?.(v.id)}
          onEdit={() => onEdit?.(v.id)}
          onDelete={() => onDelete?.(v.id)}
        />
      ))}
    </div>
  )
}

const styles = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 },
} as const
