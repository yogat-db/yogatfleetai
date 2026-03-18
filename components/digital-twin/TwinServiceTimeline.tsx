"use client"

import { useState } from "react"
import type { ServiceEvent, Vehicle } from "@/types/fleet"

export default function TwinServiceTimeline(props: {
  vehicle: Vehicle
  events: ServiceEvent[]
  loading: boolean
  error: string | null
  onAddEvent: (payload: Omit<ServiceEvent, "id">) => Promise<void> | void
}) {
  const { vehicle, events, loading, error, onAddEvent } = props

  const [title, setTitle] = useState("")
  const [type, setType] = useState("service")
  const [cost, setCost] = useState<number | "">("")
  const [mileage, setMileage] = useState<number | "">("")
  const [notes, setNotes] = useState("")

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>

      <div style={card}>
        <h3 style={h3}>Service Timeline</h3>

        {loading && <div style={{ opacity: 0.7 }}>Loading events…</div>}
        {error && <div style={{ color: "salmon" }}>Error: {error}</div>}

        {!loading && events.length === 0 && (
          <div style={{ opacity: 0.7 }}>No service events yet.</div>
        )}

        <div style={{ marginTop: 12 }}>
          {events.map((e) => (
            <div key={e.id} style={eventRow}>
              <div style={{ opacity: 0.75, fontSize: 12 }}>{new Date(e.occurred_at).toLocaleDateString()}</div>
              <div style={{ fontWeight: 800 }}>{e.title}</div>
              <div style={{ opacity: 0.7, fontSize: 13 }}>
                {e.type} • {e.mileage ? `${e.mileage} mi` : "—"} • {typeof e.cost === "number" ? `£${e.cost}` : "—"}
              </div>
              {e.notes ? <div style={{ opacity: 0.8, marginTop: 6 }}>{e.notes}</div> : null}
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <h3 style={h3}>Add Service Event</h3>

        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Oil change)" style={input} />

        <select value={type} onChange={(e) => setType(e.target.value)} style={input}>
          <option value="service">Service</option>
          <option value="repair">Repair</option>
          <option value="inspection">Inspection</option>
          <option value="mot">MOT</option>
          <option value="tyres">Tyres</option>
          <option value="other">Other</option>
        </select>

        <input
          value={mileage}
          onChange={(e) => setMileage(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder="Mileage (optional)"
          type="number"
          style={input}
        />

        <input
          value={cost}
          onChange={(e) => setCost(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder="Cost (optional)"
          type="number"
          style={input}
        />

        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" style={textarea} />

        <button
          style={btn}
          onClick={async () => {
            if (!title.trim()) return

            await onAddEvent({
              vehicle_id: vehicle.id,
              title: title.trim(),
              type,
              notes: notes.trim() ? notes.trim() : null,
              cost: cost === "" ? null : Number(cost),
              mileage: mileage === "" ? null : Number(mileage),
              occurred_at: new Date().toISOString(),
            } as any)

            setTitle("")
            setType("service")
            setCost("")
            setMileage("")
            setNotes("")
          }}
        >
          + Add Event
        </button>

        <div style={{ opacity: 0.6, marginTop: 10, fontSize: 12 }}>
          This is **optimistic** — it appears instantly, then confirms with Supabase.
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

const h3 = { margin: 0, marginBottom: 12 } as const

const input = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid #1e293b",
  background: "#0b1220",
  color: "white",
  marginBottom: 10,
} as const

const textarea = {
  width: "100%",
  minHeight: 90,
  padding: 10,
  borderRadius: 10,
  border: "1px solid #1e293b",
  background: "#0b1220",
  color: "white",
  marginBottom: 10,
  resize: "vertical",
} as const

const btn = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #334155",
  background: "#111827",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
} as const

const eventRow = {
  padding: 14,
  borderRadius: 14,
  border: "1px solid #1e293b",
  background: "#0b1220",
  marginBottom: 10,
} as const