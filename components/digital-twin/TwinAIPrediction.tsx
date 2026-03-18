"use client"

import { runTwinSimulation } from "@/lib/twinSimulation"
import type { ServiceEvent, Vehicle } from "@/app/api/fleet/types/fleets"

export default function TwinAIPrediction(props: { vehicle: Vehicle; events: ServiceEvent[] }) {
  const { vehicle, events } = props
  const ai = runTwinSimulation(vehicle, events)

  const lastService = events[0]
  const lastServiceText = lastService
    ? `${lastService.title} • ${new Date(lastService.occurred_at).toLocaleDateString()}`
    : "No service history yet"

  const riskColor =
    ai.risk === "high" ? "salmon" :
    ai.risk === "medium" ? "orange" :
    ai.risk === "low" ? "#22c55e" :
    "#60a5fa"

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={card}>
        <h3 style={{ margin: 0 }}>AI Failure Prediction</h3>
        <div style={{ marginTop: 10 }}>
          Risk: <b style={{ color: riskColor }}>{ai.risk.toUpperCase()}</b>
        </div>
        <div style={{ opacity: 0.8, marginTop: 10 }}>{ai.message}</div>
        <div style={{ opacity: 0.6, marginTop: 10, fontSize: 12 }}>
          Based on mileage + service patterns (we’ll upgrade this into a proper model later).
        </div>
      </div>

      <div style={card}>
        <h3 style={{ margin: 0 }}>Recent Service Signal</h3>
        <div style={{ opacity: 0.85, marginTop: 10 }}>{lastServiceText}</div>
        <div style={{ opacity: 0.6, marginTop: 10, fontSize: 12 }}>
          Next step: compute intervals + reminders + alerts.
        </div>
      </div>
<div style={{ marginTop: 12 }}>
 Days until failure: <b>{ai.daysToFailure ?? "-"}</b>
</div>

<div style={{ marginTop: 6 }}>
 Estimated repair cost: <b>£{ai.estimatedRepairCost ?? "-"}</b>
</div>
      <div style={{ gridColumn: "1 / -1" }}>
        <div style={card}>
          <h3 style={{ margin: 0 }}>AI Recommendations</h3>
          <ul style={{ marginTop: 10, opacity: 0.85 }}>
            <li>Auto-create a reminder when mileage passes threshold</li>
            <li>Trigger alert if risk becomes HIGH</li>
            <li>Show cost trend chart per month (Recharts)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

const card = {
  padding: 18,
  borderRadius: 16,
  border: "1px solid #1e293b",
  background: "#020617",
} as const