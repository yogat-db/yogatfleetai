"use client"

export type TwinTabKey = "overview" | "service" | "diagnostics" | "ai"

export default function TwinTabs(props: {
  tab: TwinTabKey
  setTab: (t: TwinTabKey) => void
}) {
  const { tab, setTab } = props

  return (
    <div style={tabs}>
      <Tab active={tab === "overview"} onClick={() => setTab("overview")} label="Overview" />
      <Tab active={tab === "service"} onClick={() => setTab("service")} label="Service Timeline" />
      <Tab active={tab === "diagnostics"} onClick={() => setTab("diagnostics")} label="Diagnostics" />
      <Tab active={tab === "ai"} onClick={() => setTab("ai")} label="AI Insights" />
    </div>
  )
}

function Tab(props: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={props.onClick} style={{ ...tabStyle, ...(props.active ? tabActive : null) }}>
      {props.label}
    </button>
  )
}

const tabs = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
} as const

const tabStyle = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid #1e293b",
  background: "#0b1220",
  color: "white",
  cursor: "pointer",
  opacity: 0.85,
} as const

const tabActive = {
  opacity: 1,
  border: "1px solid #334155",
  background: "#111827",
} as const