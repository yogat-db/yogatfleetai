"use client"

export default function OpsMap() {
  return (
    <div style={container}>
      <h2 style={title}>Fleet Operations Map</h2>

      <div style={map}>
        Live fleet tracking will appear here
      </div>
    </div>
  )
}

const container = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "20px"
}

const title = {
  fontSize: "22px",
  fontWeight: 600
}

const map = {
  height: "420px",
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#94a3b8"
}