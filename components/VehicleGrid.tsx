"use client"

import Link from "next/link"
import type { VehicleRow } from "@/app/dashboard/hooks/useVehicles"

export default function VehicleGrid({ vehicles }: { vehicles: VehicleRow[] }) {
  if (!vehicles.length) return <div style={{ opacity: 0.8 }}>No vehicles found</div>

  return (
    <div style={grid}>
      {vehicles.map((v) => (
        <Link key={v.id} href={`/vehicles/${v.id}`} style={card as any}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 800 }}>{v.plate}</div>
            <div style={pill}>{v.status ?? "active"}</div>
          </div>

          <div style={{ marginTop: 8, opacity: 0.85 }}>
            {(v.make ?? "Unknown")} {(v.model ?? "")}
          </div>

          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
            {v.year ?? "—"} • {v.mileage ?? "—"} miles
          </div>
        </Link>
      ))}
    </div>
  )
}

const grid: any = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 12
}

const card: any = {
  display: "block",
  textDecoration: "none",
  color: "white",
  border: "1px solid #1e293b",
  background: "#020617",
  borderRadius: 12,
  padding: 14
}

const pill: any = {
  fontSize: 12,
  padding: "4px 8px",
  borderRadius: 999,
  border: "1px solid #1e293b",
  opacity: 0.9
}