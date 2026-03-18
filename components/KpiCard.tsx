"use client";

export function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="enterprise-card glow-hover" style={{ padding: 18 }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-number">{value}</div>
      {hint ? (
        <div style={{ marginTop: 8, opacity: 0.75, fontSize: 13 }}>{hint}</div>
      ) : null}
    </div>
  );
}