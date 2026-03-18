"use client"

import type { Vehicle } from "@/types/fleet"

export default function TwinHeader(props: {
  title: string
  vehicle: Vehicle
  onBack: () => void
  onMileageUpdate: (mileage: number) => void
}) {
  const { title, vehicle, onBack, onMileageUpdate } = props

  return (
    <div style={wrap}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={onBack} style={btn}>
          ← Vehicles
        </button>

        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{title}</h1>
          <div style={{ opacity: 0.7, marginTop: 4 }}>
            Status: <b>{vehicle.status ?? "active"}</b> • Mileage: <b>{vehicle.mileage ?? 0}</b>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="number"
          placeholder="Update mileage"
          style={input}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return
            const val = Number((e.target as HTMLInputElement).value)
            if (!Number.isFinite(val)) return
            onMileageUpdate(val)
            ;(e.target as HTMLInputElement).value = ""
          }}
        />

        <div style={pill}>
          Plate: <b style={{ marginLeft: 6 }}>{vehicle.plate}</b>
        </div>
      </div>
    </div>
  )
}

const wrap = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  padding: 16,
  borderRadius: 16,
  border: "1px solid #1e293b",
  background: "#020617",
} as const

const btn = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #1e293b",
  background: "#0b1220",
  color: "white",
  cursor: "pointer",
} as const

const input = {
  width: 160,
  padding: 10,
  borderRadius: 10,
  border: "1px solid #1e293b",
  background: "#0b1220",
  color: "white",
} as const

const pill = {
  padding: "10px 12px",
  borderRadius: 999,
  border: "1px solid #1e293b",
  background: "#0b1220",
  color: "white",
  whiteSpace: "nowrap",
} as const