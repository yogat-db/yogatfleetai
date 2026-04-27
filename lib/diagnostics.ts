/**
 * Yogat Fleet AI — Elite Diagnostics Engine (2026)
 * A deterministic heuristic engine that simulates AI reasoning.
 * Optimized for high-speed, offline-first vehicle triage.
 */

export type Severity = "low" | "medium" | "high" | "critical";

export interface DiagnoseInput {
  obdCodes?: string[];
  symptoms?: string;
  vehicle?: {
    vin?: string;
    plate?: string;
    make?: string;
    model?: string;
    year?: number;
    fuel?: string;
    mileage?: number;
    engine?: string;
  };
  mot?: any;
  dvla?: any;
}

export interface DiagnoseFinding {
  code?: string;
  title: string;
  severity: Severity;
  confidence: number; 
  analysis: string;
  likelyCauses: string[];
  checklist: Array<{ label: string; steps: string[]; tools?: string[] }>;
  solutions: Array<{ 
    label: string; 
    parts?: string[]; 
    labourHours: { low: number; high: number } 
  }>;
  financials: { low: number; high: number; currency: "GBP" };
  timeframe: string;
  safety: { safe: boolean; urgency: string; notes: string[] };
}

export interface DiagnoseResult {
  summary: string;
  severity: Severity;
  healthScore: number; // 0..100
  topActions: string[];
  findings: DiagnoseFinding[];
  insights: {
    mot: string[];
    dvla: string[];
    fleet: string[];
  };
  meta: {
    engineVersion: string;
    generatedAt: string;
  };
}

// ---------------------------------------------------------
// Core Engine Constants & Utilities
// ---------------------------------------------------------

const ENGINE_VERSION = "YOGAT-CORE-2.1";
const INFLATION_2026 = 1.18; // 18% increase from baseline data

const rankSev = (s: Severity) => ({ critical: 4, high: 3, medium: 2, low: 1 }[s]);

const tokenize = (text: string) => new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/));

// ---------------------------------------------------------
// Fault Knowledge Base (The "Brain")
// ---------------------------------------------------------

const FAULT_DB: Record<string, any> = {
  P0171: {
    title: "System Too Lean (Bank 1)",
    baseSeverity: "medium",
    baseConfidence: 0.65,
    description: "The engine is receiving too much air or too little fuel. This disrupts combustion and reduces efficiency.",
    causes: ["Vacuum leak", "Dirty MAF Sensor", "Clogged Fuel Filter", "Failed Fuel Pump"],
    checks: [
      { label: "Visual Air-Intake Check", steps: ["Inspect rubber boots for cracks", "Check vacuum lines for hissing"], tools: ["Flashlight"] },
      { label: "MAF Sensor Test", steps: ["Check live data for erratic airflow readings"], tools: ["OBD Scanner"] }
    ],
    repairs: [
      { label: "Vacuum Leak Repair", labourHours: { low: 0.5, high: 1.5 }, parts: ["Replacement Hose", "Clamps"] },
      { label: "MAF Replacement", labourHours: { low: 0.5, high: 1.0 }, parts: ["Mass Airflow Sensor"] }
    ],
    costs: { low: 85, high: 420 },
    driveAdvice: (tokens: Set<string>) => tokens.has("stalls") || tokens.has("shaking") 
      ? { safe: false, urgency: "Immediate", notes: ["Engine stall risk is high."] }
      : { safe: true, urgency: "Moderate", notes: ["Drive gently. Avoid high RPMs."] }
  },
  P0420: {
    title: "Catalytic Efficiency Below Threshold",
    baseSeverity: "medium",
    baseConfidence: 0.60,
    description: "The catalytic converter is not cleaning exhaust gases effectively. Often caused by aging or prior misfires.",
    causes: ["Degraded Catalyst", "Exhaust Leak", "O2 Sensor Drift"],
    checks: [
      { label: "Exhaust Leak Scan", steps: ["Inspect manifold for soot marks", "Listen for 'ticking' sound"], tools: ["Flashlight"] }
    ],
    repairs: [
      { label: "Catalytic Converter Replacement", labourHours: { low: 2, high: 4 }, parts: ["Catalytic Converter", "Gaskets"] }
    ],
    costs: { low: 250, high: 1400 },
    driveAdvice: () => ({ safe: true, urgency: "Low", notes: ["Safe to drive, but will fail MOT emissions test."] })
  },
  P0300: {
    title: "Random/Multiple Cylinder Misfire",
    baseSeverity: "high",
    baseConfidence: 0.75,
    description: "One or more cylinders are failing to fire. This sends raw fuel into the exhaust, risking expensive damage.",
    causes: ["Worn Spark Plugs", "Failed Ignition Coils", "Injector Failure"],
    checks: [
      { label: "Ignition Coil Swap", steps: ["Move coil from misfiring cylinder to another", "See if code follows coil"], tools: ["Socket Set"] }
    ],
    repairs: [
      { label: "Ignition Service", labourHours: { low: 1, high: 2.5 }, parts: ["Spark Plugs", "Ignition Coils"] }
    ],
    costs: { low: 120, high: 850 },
    driveAdvice: (tokens: Set<string>) => tokens.has("flashing") 
      ? { safe: false, urgency: "Critical", notes: ["Flashing CEL indicates active catalyst damage. STOP DRIVING."] }
      : { safe: false, urgency: "High", notes: ["Significant engine damage risk."] }
  }
};

// ---------------------------------------------------------
// Engine Logic
// ---------------------------------------------------------

export function diagnose(input: DiagnoseInput): DiagnoseResult {
  const tokens = tokenize(input.symptoms || "");
  const findings: DiagnoseFinding[] = [];
  const codes = input.obdCodes || [];

  // 1. Process OBD Codes
  codes.forEach(code => {
    const fault = FAULT_DB[code.toUpperCase()];
    if (!fault) return;

    // Confidence Modifiers
    let confidence = fault.baseConfidence;
    if (input.vehicle?.mileage && input.vehicle.mileage > 100000) confidence += 0.05;
    if (tokens.size > 0) confidence += 0.10;

    const safety = fault.driveAdvice(tokens);

    findings.push({
      code,
      title: fault.title,
      severity: fault.baseSeverity,
      confidence: Math.min(confidence, 0.98),
      analysis: fault.description,
      likelyCauses: fault.causes,
      checklist: fault.checks,
      solutions: fault.repairs,
      financials: { 
        low: Math.round(fault.costs.low * INFLATION_2026), 
        high: Math.round(fault.costs.high * INFLATION_2026),
        currency: "GBP" 
      },
      timeframe: "2-4 Hours",
      safety
    });
  });

  // 2. Calculate Health Score
  let totalDeduction = 0;
  findings.forEach(f => {
    const impact = { critical: 40, high: 25, medium: 15, low: 5 }[f.severity];
    totalDeduction += impact * f.confidence;
  });
  const healthScore = Math.max(100 - Math.round(totalDeduction), 0);

  // 3. Generate Top Actions
  const topActions = findings
    .sort((a, b) => rankSev(b.severity) - rankSev(a.severity))
    .slice(0, 3)
    .map(f => f.safety.safe ? `Schedule ${f.title} repair` : `STOP DRIVING: ${f.title} detected`);

  if (topActions.length === 0) topActions.push("Connect OBD scanner for deeper analysis");

  return {
    summary: findings.length > 0 
      ? `Detected ${findings.length} primary fault(s). Health index at ${healthScore}%.` 
      : "No critical faults detected. Regular maintenance recommended.",
    severity: findings.length > 0 ? findings.sort((a, b) => rankSev(b.severity) - rankSev(a.severity))[0].severity : "low",
    healthScore,
    topActions,
    findings,
    insights: {
      mot: input.mot ? ["Previous MOT flagged suspension wear"] : [],
      dvla: input.dvla ? [`Vehicle: ${input.dvla.make} ${input.dvla.model}`] : [],
      fleet: input.vehicle?.mileage && input.vehicle.mileage > 80000 ? ["Approaching major service interval (90k)"] : []
    },
    meta: {
      engineVersion: ENGINE_VERSION,
      generatedAt: new Date().toISOString()
    }
  };
}