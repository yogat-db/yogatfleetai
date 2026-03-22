'use client'

import type { Vehicle } from '@/app/types/fleet'
import theme from '@/app/theme'

const MyComponent = () => (
  <div style={{ background: theme.colors.background.main, color: theme.colors.text.primary }}>
    <h1 style={{ background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
      Hello
    </h1>
  </div>
)
interface VehiclePickerProps {
  vehicles: Vehicle[]
  activeId: string | null
  onChange: (id: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function VehiclePicker({
  vehicles,
  activeId,
  onChange,
  placeholder = 'Select a vehicle...',
  disabled = false,
}: VehiclePickerProps) {
  return (
    <select
      value={activeId || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || vehicles.length === 0}
      style={{
        ...styles.select,
        opacity: disabled || vehicles.length === 0 ? 0.5 : 1,
        cursor: disabled || vehicles.length === 0 ? 'not-allowed' : 'pointer',
      }}
    >
      <option value="" disabled>
        {vehicles.length === 0 ? 'No vehicles available' : placeholder}
      </option>
      {vehicles.map((vehicle) => (
        <option key={vehicle.id} value={vehicle.id} style={styles.option}>
          {vehicle.make} {vehicle.model} – {vehicle.license_plate}
          {vehicle.year ? ` (${vehicle.year})` : ''}
        </option>
      ))}
    </select>
  )
}

const styles = {
  select: {
    width: '100%',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#f1f5f9',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
  },
  option: {
    background: '#1e293b',
    color: '#f1f5f9',
  },
} as const