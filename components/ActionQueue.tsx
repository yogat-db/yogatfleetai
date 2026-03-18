// components/ActionQueue.tsx
"use client"

type ActionItem = {
  plate: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string
  dueInDays: number
  action: string
  why: string
}

export default function ActionQueue({
  title,
  items
}: {
  title?: string
  items: ActionItem[]
}) {
  return (
    <div>
      <div style={styles.head}>
        <div style={styles.title}>{title ?? "Action Queue"}</div>
        <div style={styles.count}>{items.length} items</div>
      </div>

      {items.length === 0 ? (
        <div style={styles.empty}>No actions right now.</div>
      ) : (
        <div style={styles.list}>
          {items.map((a, idx) => (
            <div key={`${a.plate}_${idx}`} style={styles.row}>
              <div style={styles.left}>
                <div style={styles.plate}>{a.plate}</div>
                <div style={styles.why}>{a.why}</div>
              </div>

              <div style={styles.right}>
                <span style={styles.pill}>{a.priority}</span>
                <span style={styles.meta}>
                  Due in <b>{a.dueInDays}</b>d
                </span>
                <span style={styles.action}>{a.action}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  title: { fontSize: 16, fontWeight: 800 },
  count: { opacity: 0.75, fontSize: 12 },
  empty: { opacity: 0.75, padding: "10px 0" },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)"
  },
  left: { display: "flex", flexDirection: "column", gap: 4 },
  plate: { fontWeight: 900, letterSpacing: 0.5 },
  why: { opacity: 0.8, fontSize: 13 },
  right: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },
  pill: {
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    fontSize: 12
  },
  meta: { opacity: 0.85, fontSize: 12 },
  action: { fontWeight: 700, fontSize: 13 }
}