'use client'

import type { Vehicle } from '@/app/types/fleet'

interface Props {
  vehicles: Vehicle[]
  activeId: string | null
  onChange: (id: string) => void
}

export default function VehiclePicker({ vehicles, activeId, onChange }: Props) {
  return (
    <select
      value={activeId || ''}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '10px',
        color: '#f1f5f9',
        fontSize: '14px',
      }}
    >
      <option value="" disabled>Select a vehicle...</option>
      {vehicles.map((v) => (
        <option key={v.id} value={v.id}>
          {v.make} {v.model} – {v.license_plate}
        </option>
      ))}
    </select>
  )
}