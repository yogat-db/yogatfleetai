"use client"

import type { Vehicle } from "@/types/fleet"

export default function TwinOverview(props: {
  vehicle: Vehicle
  onUpdate: (patch: Partial<Vehicle>) => void
}) {
  const { vehicle, onUpdate } = props

  return (
    <div style={grid}>
      <div style={card}>
        <h3 style={h3}>Identity</h3>

        <Row label="Plate" value={vehicle.plate} />
        <Row label="Make" value={vehicle.make ?? "—"} />
        <Row label="Model" value={vehicle.model ?? "—"} />
        <Row label="Year" value={vehicle.year ?? "—"} />

        <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
          <input
            placeholder="Make"
            style={input}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return
              onUpdate({ make: (e.target as HTMLInputElement).value })
              ;(e.target as HTMLInputElement).value = ""
            }}
          />
          <input
            placeholder="Model"
            style={input}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return
              onUpdate({ model: (e.target as HTMLInputElement).value })
              ;(e.target as HTMLInputElement).value = ""
            }}
          />
        </div>
      </div>

      <div style={card}>
        <h3 style={h3}>Health Snapshot</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Mini label="Mileage" value={`${vehicle.mileage ?? 0}`} />
          <Mini label="Status" value={`${vehicle.status ?? "active"}`} />
          <Mini label="Next Service" value="~ 1,200 miles" />
          <Mini label="Risk" value="Medium" />
        </div>
      </div>
    </div>
  )
}

function Row(props: { label: string; value: any }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
      <span style={{ opacity: 0.7 }}>{props.label}</span>
      <b>{String(props.value)}</b>
    </div>
  )
}

function Mini(props: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid #1e293b", borderRadius: 12, padding: 14, background: "#0b1220" }}>
      <div style={{ opacity: 0.7, fontSize: 12 }}>{props.label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>{props.value}</div>
    </div>
  )
}

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
} as const

const card = {
  padding: 18,
  borderRadius: 16,
  border: "1px solid #1e293b",
  background: "#020617",
} as const

const h3 = { margin: 0, marginBottom: 12 } as const

const input = {
  flex: 1,
  padding: 10,
  borderRadius: 10,
  border: "1px solid #1e293b",
  background: "#0b1220",
  color: "white",
} as const