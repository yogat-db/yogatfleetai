// lib/diagnostics.ts
// GarageAI — Upgraded Diagnostics Engine (≈400 lines)
// Purpose: Turn OBD codes + symptoms (+ optional DVLA/MOT context) into
//          a structured, premium “AI” diagnostic report with actions, costs, safety guidance.
//
// Usage (client):
//   import { diagnose } from "@/lib/diagnostics"
//   const res = diagnose({ obdCodes:["P0171"], symptoms:"rough idle + hesitation", vehicle:{...}, mot, dvla })
//
// IMPORTANT:
// - This is a deterministic “AI-like” engine (rules + scoring). It’s safe, fast, works offline.
// - It always returns stable arrays (topActions/findings), so your UI won't crash on map().

export type Severity = "low" | "medium" | "high" | "critical"

export type DiagnoseInput = {
  obdCodes?: string[] // e.g. ["P0171","P0420"]
  symptoms?: string // free text from user
  vehicle?: {
    vin?: string
    plate?: string
    make?: string
    model?: string
    year?: number
    fuel?: string
    mileage?: number
    transmission?: string
    engine?: string
  }
  mot?: any // optional raw MOT response
  dvla?: any // optional raw DVLA response
}

export type DiagnoseFinding = {
  code?: string
  title: string
  severity: Severity
  confidence: number // 0..1
  whyThisHappens: string
  likelyCauses: string[]
  checksYouCanDo: Array<{
    label: string
    steps: string[]
    tools?: string[]
  }>
  recommendedRepairs: Array<{
    label: string
    steps: string[]
    parts?: string[]
    labourHours?: { low: number; high: number }
  }>
  estimatedCostGBP: { low: number; high: number }
  timeToFix: string
  driveAdvice: {
    safeToDrive: boolean
    notes: string[]
  }
  tags?: string[]
}

export type DiagnoseResult = {
  summary: string
  severity: Severity
  healthScore: number // 0..100
  topActions: string[]
  findings: DiagnoseFinding[]
  motInsights: string[]
  dvlaInsights: string[]
  meta: {
    input: DiagnoseInput
    generatedAt: string
    engineVersion: string
  }
}

type FaultProfile = {
  title: string
  description: string
  severity: Severity
  confidenceBase: number
  estimatedCostGBP: { low: number; high: number }
  likelyCauses: string[]
  checks: Array<{ label: string; steps: string[]; tools?: string[] }>
  repairs: Array<{ label: string; steps: string[]; parts?: string[]; labourHours?: { low: number; high: number } }>
  timeToFix: string
  safeToDriveRule: (ctx: Ctx) => { safe: boolean; notes: string[] }
  tags?: string[]
  related?: string[]
}

type Ctx = {
  codes: string[]
  symptomsText: string
  tokens: Set<string>
  vehicle: DiagnoseInput["vehicle"]
  mot?: any
  dvla?: any
  mileage: number | null
  fuel: string | null
  year: number | null
}

const ENGINE_VERSION = "2026.02.28-1"

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr))
const norm = (s: string) => (s || "").toLowerCase().trim()

function normalizeCode(code: string) {
  return norm(code).toUpperCase().replace(/\s+/g, "")
}

function tokenize(text: string): Set<string> {
  const t = norm(text)
    .replace(/[^a-z0-9\s\-\+]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!t) return new Set()
  return new Set(t.split(" "))
}

function severityRank(s: Severity) {
  return s === "critical" ? 4 : s === "high" ? 3 : s === "medium" ? 2 : 1
}

function mergeSeverity(a: Severity, b: Severity): Severity {
  return severityRank(a) >= severityRank(b) ? a : b
}

function costBand(low: number, high: number, inflation2026 = 1.0) {
  return { low: Math.round(low * inflation2026), high: Math.round(high * inflation2026) }
}

function mileageBoost(mileage: number | null) {
  if (!mileage) return 0
  if (mileage > 140_000) return 0.12
  if (mileage > 90_000) return 0.08
  if (mileage > 60_000) return 0.05
  return 0
}

function yearBoost(year: number | null) {
  if (!year) return 0
  const age = new Date().getFullYear() - year
  if (age >= 12) return 0.10
  if (age >= 8) return 0.06
  if (age >= 5) return 0.03
  return 0
}

function symptomBoost(tokens: Set<string>, keywords: string[]) {
  // up to +0.18 confidence
  let hits = 0
  for (const k of keywords) if (tokens.has(k)) hits++
  return clamp(hits * 0.04, 0, 0.18)
}

function safeDriveDefault(sev: Severity) {
  if (sev === "critical") return { safe: false, notes: ["Do not drive unless necessary. Tow/garage recommended."] }
  if (sev === "high") return { safe: true, notes: ["Drive gently and avoid long trips until checked."] }
  return { safe: true, notes: ["Generally safe to drive, but monitor symptoms."] }
}

// -------------------------------
// Fault Knowledge Base (OBD + common conditions)
// -------------------------------
const FAULTS: Record<string, FaultProfile> = {
  P0171: {
    title: "System Too Lean (Bank 1)",
    description: "Air/fuel mixture is too lean. Often vacuum leak, MAF issue, or fuel delivery problem.",
    severity: "medium",
    confidenceBase: 0.62,
    estimatedCostGBP: costBand(90, 450),
    likelyCauses: [
      "Vacuum leak (hoses, intake boots, PCV system)",
      "Dirty or faulty MAF sensor",
      "Weak fuel pump / low fuel pressure",
      "Clogged fuel filter (where applicable)",
      "Air leak after MAF / loose clamps",
      "Exhaust leak upstream of O2 sensor",
      "Aging upstream O2 sensor",
    ],
    checks: [
      {
        label: "Quick intake leak check",
        steps: [
          "Inspect intake hose clamps and rubber boots for cracks.",
          "Check PCV hose connections and brittle lines.",
          "Listen for hissing around intake at idle.",
        ],
        tools: ["Torch/flashlight"],
      },
      {
        label: "MAF sensor sanity check",
        steps: [
          "If safe, unplug MAF briefly at idle (some cars will stall—reconnect immediately).",
          "If engine runs noticeably better/worse, MAF may be contributing.",
          "Consider cleaning MAF with proper MAF cleaner only (no contact).",
        ],
      },
      {
        label: "Fuel delivery check (basic)",
        steps: [
          "Note if symptoms worsen under load or at high speed.",
          "Check recent fuel filter replacement history.",
          "If possible, scan fuel trims (STFT/LTFT) with OBD scanner.",
        ],
        tools: ["OBD scanner (optional)"],
      },
    ],
    repairs: [
      {
        label: "Fix vacuum leak / replace cracked hoses",
        steps: ["Replace split vacuum lines or intake boot.", "Re-seat clamps and ensure airtight fit."],
        parts: ["Vacuum hose / intake boot", "Clamps"],
        labourHours: { low: 0.5, high: 2.0 },
      },
      {
        label: "Clean or replace MAF sensor",
        steps: ["Clean with MAF cleaner, allow to dry fully.", "Replace if readings remain unstable."],
        parts: ["MAF cleaner", "MAF sensor (if needed)"],
        labourHours: { low: 0.3, high: 1.0 },
      },
      {
        label: "Fuel system diagnosis",
        steps: ["Test fuel pressure.", "Inspect pump, regulator, filter (model dependent)."],
        parts: ["Fuel filter (if applicable)"],
        labourHours: { low: 1.0, high: 3.0 },
      },
    ],
    timeToFix: "1–3 hours",
    safeToDriveRule: (ctx) => {
      const t = ctx.tokens
      if (t.has("stall") || t.has("stalls") || t.has("misfire") || t.has("shaking")) {
        return { safe: false, notes: ["Risk of stalling or misfire. Avoid driving; diagnose promptly."] }
      }
      return safeDriveDefault("medium")
    },
    tags: ["fuel-trim", "vacuum", "maf", "fuel-delivery"],
    related: ["P0174"],
  },

  P0420: {
    title: "Catalyst System Efficiency Below Threshold (Bank 1)",
    description: "Catalytic converter efficiency appears low. Could be catalyst aging, O2 sensor, exhaust leaks, or misfire history.",
    severity: "medium",
    confidenceBase: 0.58,
    estimatedCostGBP: costBand(180, 1200),
    likelyCauses: [
      "Catalytic converter aging/failure",
      "Exhaust leak (pre-cat or near O2 sensor)",
      "Downstream O2 sensor drifting",
      "Upstream O2 sensor issues causing incorrect fueling",
      "Long-term misfires damaging catalyst",
      "Oil consumption / coolant contamination",
    ],
    checks: [
      {
        label: "Check for exhaust leaks",
        steps: ["Listen for ticking around manifold and downpipe.", "Look for soot marks near joints."],
        tools: ["Torch/flashlight"],
      },
      {
        label: "Rule out misfire/fueling problems first",
        steps: [
          "If you have any misfire codes, fix them before replacing the catalyst.",
          "Confirm no rich/lean codes persist (P0171/P0172 etc).",
        ],
      },
    ],
    repairs: [
      {
        label: "Fix exhaust leak / gasket",
        steps: ["Replace failed gasket or repair cracked section.", "Re-test code after repair."],
        parts: ["Exhaust gasket / clamps"],
        labourHours: { low: 1.0, high: 3.0 },
      },
      {
        label: "Replace downstream O2 sensor (if confirmed)",
        steps: ["Replace sensor with OEM-grade part.", "Clear code and drive cycle to verify."],
        parts: ["O2 sensor"],
        labourHours: { low: 0.7, high: 1.5 },
      },
      {
        label: "Replace catalytic converter (if confirmed)",
        steps: ["Confirm with live data / proper testing.", "Replace converter and clear codes."],
        parts: ["Catalytic converter"],
        labourHours: { low: 1.5, high: 4.0 },
      },
    ],
    timeToFix: "1–4 hours",
    safeToDriveRule: (ctx) => {
      const t = ctx.tokens
      if (t.has("misfire") || t.has("shaking") || ctx.codes.includes("P0300")) {
        return { safe: false, notes: ["Possible misfire can overheat/damage catalyst. Diagnose before driving."] }
      }
      return safeDriveDefault("medium")
    },
    tags: ["emissions", "catalyst", "o2-sensor"],
  },

  P0300: {
    title: "Random/Multiple Cylinder Misfire Detected",
    description: "Engine misfire detected. Could be ignition, fueling, air leaks, or mechanical issues.",
    severity: "high",
    confidenceBase: 0.70,
    estimatedCostGBP: costBand(120, 900),
    likelyCauses: [
      "Worn spark plugs",
      "Failing ignition coils",
      "Vacuum leak / lean condition",
      "Injector issues",
      "Low fuel pressure",
      "Compression loss (less common but serious)",
    ],
    checks: [
      {
        label: "Immediate safety check",
        steps: [
          "If engine is shaking heavily, avoid driving.",
          "Check if Check Engine Light is flashing (urgent).",
        ],
      },
      {
        label: "Ignition inspection",
        steps: [
          "Check service history: plugs/coils due?",
          "Inspect coil connectors for looseness/corrosion.",
        ],
        tools: ["Basic hand tools"],
      },
    ],
    repairs: [
      {
        label: "Replace spark plugs (and coils if required)",
        steps: ["Replace plugs with correct spec.", "Replace coils if confirmed faulty or aged set."],
        parts: ["Spark plugs", "Ignition coil(s)"],
        labourHours: { low: 0.8, high: 2.5 },
      },
      {
        label: "Fuel/injector diagnosis",
        steps: ["Check fuel pressure.", "Injector balance test if available."],
        labourHours: { low: 1.5, high: 4.0 },
      },
    ],
    timeToFix: "1–4 hours",
    safeToDriveRule: (ctx) => {
      const t = ctx.tokens
      const flashing = t.has("flashing") && t.has("light")
      if (flashing || t.has("shaking") || t.has("stall") || t.has("stalls")) {
        return { safe: false, notes: ["High risk of catalytic damage or stalling. Stop driving and diagnose."] }
      }
      return { safe: true, notes: ["Avoid hard acceleration. Diagnose soon to prevent catalyst damage."] }
    },
    tags: ["misfire", "ignition", "fuel"],
  },

  P0128: {
    title: "Coolant Temperature Below Thermostat Regulating Temperature",
    description: "Engine may not be reaching operating temp (stuck-open thermostat or sensor issues).",
    severity: "low",
    confidenceBase: 0.62,
    estimatedCostGBP: costBand(80, 320),
    likelyCauses: ["Stuck-open thermostat", "Coolant temp sensor reporting low", "Low coolant"],
    checks: [
      {
        label: "Temperature behavior",
        steps: [
          "Observe temp gauge: does it stay low after 10–15 minutes driving?",
          "Check cabin heat performance.",
          "Check coolant level (engine cold).",
        ],
      },
    ],
    repairs: [
      {
        label: "Replace thermostat (common fix)",
        steps: ["Drain coolant as required.", "Replace thermostat/housing.", "Refill and bleed system."],
        parts: ["Thermostat", "Coolant"],
        labourHours: { low: 1.0, high: 2.5 },
      },
    ],
    timeToFix: "1–3 hours",
    safeToDriveRule: () => safeDriveDefault("low"),
    tags: ["cooling", "thermostat"],
  },
}

// Symptom-only “virtual” faults (no code required)
const SYMPTOM_PROFILES: Array<{
  id: string
  title: string
  severity: Severity
  keywords: string[]
  confidenceBase: number
  build: (ctx: Ctx) => FaultProfile
}> = [
  {
    id: "OVERHEAT",
    title: "Overheating / Cooling System Risk",
    severity: "critical",
    keywords: ["overheat", "overheating", "hot", "steam", "coolant", "temp", "temperature"],
    confidenceBase: 0.60,
    build: () => ({
      title: "Overheating / Cooling System Risk",
      description: "Symptoms suggest the engine may be overheating. This can cause severe engine damage quickly.",
      severity: "critical",
      confidenceBase: 0.72,
      estimatedCostGBP: costBand(120, 1200),
      likelyCauses: ["Low coolant / leaks", "Failed radiator fan", "Thermostat stuck closed", "Water pump issues", "Blocked radiator"],
      checks: [
        {
          label: "Immediate steps (safety)",
          steps: [
            "If temperature is high, stop safely and turn engine off.",
            "Do NOT open coolant cap while hot.",
            "After cooling, check coolant level and visible leaks.",
          ],
        },
      ],
      repairs: [
        {
          label: "Cooling system diagnosis",
          steps: ["Pressure test system", "Inspect thermostat, fan operation, pump flow", "Repair leaks and bleed system"],
          labourHours: { low: 1.0, high: 4.0 },
        },
      ],
      timeToFix: "Same day",
      safeToDriveRule: () => ({ safe: false, notes: ["Do not drive while overheating. Tow if needed."] }),
      tags: ["cooling", "overheat", "critical"],
    }),
  },
  {
    id: "BRAKING",
    title: "Braking Performance Concern",
    severity: "high",
    keywords: ["brake", "brakes", "grinding", "squeal", "squealing", "pedal", "spongy", "pulling"],
    confidenceBase: 0.52,
    build: () => ({
      title: "Braking Performance Concern",
      description: "Symptoms suggest potential brake wear or hydraulic issues. Brakes are safety-critical.",
      severity: "high",
      confidenceBase: 0.62,
      estimatedCostGBP: costBand(140, 800),
      likelyCauses: ["Worn brake pads/discs", "Sticking caliper", "Air in brake lines", "Brake fluid old/low", "ABS sensor issue"],
      checks: [
        { label: "Visual check", steps: ["Look through wheels for pad thickness.", "Check brake fluid level.", "Listen for metal-on-metal grinding."] },
      ],
      repairs: [
        { label: "Replace pads/discs if worn", steps: ["Inspect, then replace in axle pairs.", "Bed-in pads correctly."], parts: ["Pads", "Discs"] },
        { label: "Brake fluid service", steps: ["Bleed/flush brake fluid if old or spongy."], parts: ["Brake fluid"] },
      ],
      timeToFix: "1–3 hours",
      safeToDriveRule: () => ({ safe: false, notes: ["Avoid driving if braking is compromised or grinding heavily."] }),
      tags: ["brakes", "safety"],
    }),
  },
]

// -------------------------------
// MOT & DVLA Insight Helpers
// -------------------------------
function buildMotInsights(mot: any): string[] {
  if (!mot) return []
  const insights: string[] = []
  // This is intentionally defensive; MOT payloads vary depending on your source.
  const tests = Array.isArray(mot?.motTests) ? mot.motTests : Array.isArray(mot?.tests) ? mot.tests : []
  if (tests.length) {
    const latest = tests[0]
    const result = latest?.testResult || latest?.result
    if (result) insights.push(`Latest MOT result: ${String(result)}`)
    const expiry = latest?.expiryDate || mot?.motExpiryDate || mot?.expiryDate
    if (expiry) insights.push(`MOT expiry: ${String(expiry)}`)
    const defects = latest?.rfrAndComments || latest?.defects || []
    if (Array.isArray(defects) && defects.length) {
      const majors = defects.filter((d: any) => /major|dangerous/i.test(String(d?.type || d?.dangerous || d?.severity || "")))
      if (majors.length) insights.push(`MOT flagged major/dangerous items previously — prioritise safety checks.`)
      insights.push(`MOT noted ${defects.length} item(s) in latest test.`)
    }
  }
  return insights
}

function buildDvlaInsights(dvla: any): string[] {
  if (!dvla) return []
  const insights: string[] = []
  const make = dvla?.make || dvla?.vehicleMake
  const colour = dvla?.colour || dvla?.colourOfVehicle
  const fuel = dvla?.fuelType || dvla?.fuel
  const taxStatus = dvla?.taxStatus
  const motStatus = dvla?.motStatus
  if (make) insights.push(`DVLA: Make = ${String(make)}`)
  if (colour) insights.push(`DVLA: Colour = ${String(colour)}`)
  if (fuel) insights.push(`DVLA: Fuel = ${String(fuel)}`)
  if (taxStatus) insights.push(`DVLA: Tax status = ${String(taxStatus)}`)
  if (motStatus) insights.push(`DVLA: MOT status = ${String(motStatus)}`)
  return insights
}

// -------------------------------
// Core Engine
// -------------------------------
function buildCtx(input: DiagnoseInput): Ctx {
  const codes = (input.obdCodes || []).map(normalizeCode).filter(Boolean)
  const symptomsText = input.symptoms || ""
  const tokens = tokenize(symptomsText)
  const mileage = input.vehicle?.mileage ?? null
  const fuel = input.vehicle?.fuel ? String(input.vehicle.fuel) : null
  const year = input.vehicle?.year ?? null
  return { codes, symptomsText, tokens, vehicle: input.vehicle, mot: input.mot, dvla: input.dvla, mileage, fuel, year }
}

function expandCodes(codes: string[]): string[] {
  // Related codes expansion (if present in knowledge base)
  const expanded = [...codes]
  for (const c of codes) {
    const prof = FAULTS[c]
    if (prof?.related?.length) expanded.push(...prof.related)
  }
  return uniq(expanded)
}

function scoreFaultFromProfile(code: string | undefined, prof: FaultProfile, ctx: Ctx): DiagnoseFinding {
  const mBoost = mileageBoost(ctx.mileage)
  const yBoost = yearBoost(ctx.year)

  // symptom keywords per fault (light heuristic)
  const keywordMap: Record<string, string[]> = {
    P0171: ["idle", "rough", "hesitation", "stall", "stalls", "shaking", "misfire", "power", "slow"],
    P0420: ["smell", "emissions", "rattle", "power", "slow"],
    P0300: ["shaking", "misfire", "stall", "stalls", "rough", "flashing"],
    P0128: ["cold", "heat", "heater", "temp", "temperature"],
  }
  const kBoost = symptomBoost(ctx.tokens, keywordMap[code || ""] || [])

  let confidence = clamp(prof.confidenceBase + mBoost + yBoost + kBoost, 0.25, 0.95)

  // Co-occurrence rules raise confidence
  if (code === "P0420" && (ctx.codes.includes("P0300") || ctx.tokens.has("misfire"))) confidence = clamp(confidence + 0.10, 0, 0.95)
  if (code === "P0171" && (ctx.tokens.has("hissing") || ctx.tokens.has("vacuum"))) confidence = clamp(confidence + 0.08, 0, 0.95)

  // Determine safe to drive
  const drive = prof.safeToDriveRule(ctx)

  const why = prof.description

  return {
    code,
    title: code ? `${code} — ${prof.title}` : prof.title,
    severity: prof.severity,
    confidence,
    whyThisHappens: why,
    likelyCauses: prof.likelyCauses,
    checksYouCanDo: prof.checks.map((c) => ({ label: c.label, steps: c.steps, tools: c.tools })),
    recommendedRepairs: prof.repairs.map((r) => ({
      label: r.label,
      steps: r.steps,
      parts: r.parts,
      labourHours: r.labourHours,
    })),
    estimatedCostGBP: prof.estimatedCostGBP,
    timeToFix: prof.timeToFix,
    driveAdvice: { safeToDrive: drive.safe, notes: drive.notes },
    tags: prof.tags,
  }
}

function buildSymptomFindings(ctx: Ctx): DiagnoseFinding[] {
  const findings: DiagnoseFinding[] = []
  for (const sp of SYMPTOM_PROFILES) {
    const hitBoost = symptomBoost(ctx.tokens, sp.keywords)
    if (hitBoost <= 0) continue

    const prof = sp.build(ctx)
    const confidence = clamp(sp.confidenceBase + hitBoost + mileageBoost(ctx.mileage) + yearBoost(ctx.year), 0.30, 0.95)

    const drive = prof.safeToDriveRule(ctx)
    findings.push({
      code: undefined,
      title: prof.title,
      severity: prof.severity,
      confidence,
      whyThisHappens: prof.description,
      likelyCauses: prof.likelyCauses,
      checksYouCanDo: prof.checks.map((c) => ({ label: c.label, steps: c.steps, tools: c.tools })),
      recommendedRepairs: prof.repairs.map((r) => ({
        label: r.label,
        steps: r.steps,
        parts: r.parts,
        labourHours: r.labourHours,
      })),
      estimatedCostGBP: prof.estimatedCostGBP,
      timeToFix: prof.timeToFix,
      driveAdvice: { safeToDrive: drive.safe, notes: drive.notes },
      tags: prof.tags,
    })
  }
  return findings
}

function summarize(findings: DiagnoseFinding[], motInsights: string[], dvlaInsights: string[]): { summary: string; severity: Severity; healthScore: number } {
  if (!findings.length) {
    return {
      summary: "No faults identified from the provided info. Add an OBD code or describe symptoms for a deeper check.",
      severity: "low",
      healthScore: 92,
    }
  }

  let sev: Severity = "low"
  let risk = 0

  for (const f of findings) {
    sev = mergeSeverity(sev, f.severity)
    const sevWeight = f.severity === "critical" ? 32 : f.severity === "high" ? 22 : f.severity === "medium" ? 12 : 6
    risk += sevWeight * f.confidence
  }

  // Add small weights if MOT/DVLA indicate issues
  if (motInsights.some((x) => /major|dangerous/i.test(x))) risk += 10
  if (dvlaInsights.some((x) => /MOT status = Not valid/i.test(x))) risk += 8

  const healthScore = clamp(Math.round(100 - risk), 0, 100)

  const top = findings
    .slice()
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.confidence - a.confidence)[0]

  const summary = [
    `Top issue: ${top.title} (${Math.round(top.confidence * 100)}% confidence).`,
    `Overall severity: ${sev.toUpperCase()}.`,
    `Health score: ${healthScore}/100.`,
  ].join(" ")

  return { summary, severity: sev, healthScore }
}

function buildTopActions(findings: DiagnoseFinding[]): string[] {
  // Premium top actions: concise + ordered. Always returns array.
  if (!findings.length) return ["Add an OBD fault code or describe symptoms to run diagnostics."]

  const ordered = findings
    .slice()
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.confidence - a.confidence)
    .slice(0, 4)

  const actions: string[] = []

  for (const f of ordered) {
    // Safety first
    if (!f.driveAdvice.safeToDrive) actions.push(`Stop driving and arrange inspection: ${f.title}`)
    // Quick checks
    const firstCheck = f.checksYouCanDo?.[0]
    if (firstCheck) actions.push(`Do now: ${firstCheck.label}`)
    // Repair suggestion
    const firstRepair = f.recommendedRepairs?.[0]
    if (firstRepair) actions.push(`Plan repair: ${firstRepair.label}`)
  }

  // Deduplicate & cap
  return uniq(actions).slice(0, 8)
}

function dedupeFindings(findings: DiagnoseFinding[]): DiagnoseFinding[] {
  // If both symptom profile and code represent same domain, keep both but avoid near-duplicates.
  const seen = new Set<string>()
  const out: DiagnoseFinding[] = []
  for (const f of findings) {
    const key = `${f.code || "SYM"}::${norm(f.title)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(f)
  }
  return out
}

// -------------------------------
// Public API
// -------------------------------
export function diagnose(input: DiagnoseInput): DiagnoseResult {
  const ctx = buildCtx(input)

  const motInsights = buildMotInsights(input.mot)
  const dvlaInsights = buildDvlaInsights(input.dvla)

  // Build findings from codes
  const codes = expandCodes(ctx.codes)
  const codeFindings: DiagnoseFinding[] = []

  for (const code of codes) {
    const prof = FAULTS[code]
    if (!prof) continue
    codeFindings.push(scoreFaultFromProfile(code, prof, ctx))
  }

  // Add symptom-only findings
  const symptomFindings = buildSymptomFindings(ctx)

  // If no codes but symptoms exist, still produce results
  let findings = dedupeFindings([...codeFindings, ...symptomFindings])

  // Sort findings by severity then confidence
  findings = findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.confidence - a.confidence)

  const { summary, severity, healthScore } = summarize(findings, motInsights, dvlaInsights)
  const topActions = buildTopActions(findings)

  return {
    summary,
    severity,
    healthScore,
    topActions,
    findings,
    motInsights,
    dvlaInsights,
    meta: {
      input,
      generatedAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION,
    },
  }
}

/**
 * Optional helper: a tiny demo “AI response” for quick testing in console.
 * (Not required — but useful while wiring UI.)
 */
export function demoDiagnose() {
  return diagnose({
    obdCodes: ["P0171", "P0420"],
    symptoms: "rough idle and hesitation, slight power loss",
    vehicle: { make: "BMW", model: "320d", year: 2019, mileage: 86000, fuel: "Diesel" },
  })
}