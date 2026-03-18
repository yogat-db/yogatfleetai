"use client"

// 1. We define the type locally to fix the red line on line 3
type Vehicle = {
  plate: string;
  mileage?: number | null;
  // add other fields as needed
}

export default function TwinDiagnostics({ vehicle }: { vehicle: Vehicle }) {
  // 2. Define the missing style variables to fix the errors in the return block
  const grid = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    marginBottom: "20px"
  };

  const card = {
    background: "#111",
    padding: "20px",
    borderRadius: "10px",
    border: "1px solid #222",
    color: "#fff"
  };

  const v = vehicle;

  return (
    <div style={grid}>
      <Card title="Engine" status="Healthy" color="#10b981" />
      <Card title="Battery" status="Low" color="#f59e0b" />
      <Card title="Transmission" status="Normal" color="#3b82f6" />

      <div style={{ gridColumn: "1 / -1", marginTop: "10px" }}>
        <div style={card}>
          <h3 style={{ margin: 0 }}>Active Fault Codes</h3>
          <div style={{ opacity: 0.75, marginTop: 10 }}>
            P0301 - Engine cylinder misfire <br />
            P0171 - Fuel system lean
          </div>
          <div style={{ opacity: 0.6, marginTop: 10, fontSize: 12 }}>
            (Later we'll wire this to real DVLA/OBD inputs + alerts.)
          </div>
        </div>
      </div>

      <div style={{ gridColumn: "1 / -1", marginTop: "10px" }}>
        <div style={card}>
          <h3 style={{ margin: 0 }}>Quick Facts</h3>
          <div style={{ opacity: 0.75, marginTop: 10 }}>
            Plate: <b>{v.plate}</b> • Mileage: <b>{v.mileage ?? 0}</b>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper component for the top cards
function Card({ title, status, color }: { title: string, status: string, color: string }) {
  return (
    <div style={{ 
      background: "#111", 
      padding: "15px", 
      borderRadius: "10px", 
      border: "1px solid #222",
      borderLeft: `4px solid ${color}` 
    }}>
      <div style={{ opacity: 0.7, fontSize: 12 }}>{title}</div>
      <div style={{ fontWeight: "bold", marginTop: 5 }}>{status}</div>
    </div>
  );
}