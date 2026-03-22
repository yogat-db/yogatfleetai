// lib/ai/diagnostics.ts

export interface DTCInfo {
  code: string
  description: string
  causes: string[]
  fix: string
  estimatedCost: number | null
  mechanicNeeded: boolean
  severity?: 'low' | 'medium' | 'high' | 'critical'
  system?: string // e.g., 'Engine', 'Transmission', 'Emissions'
}

// Extended DTC database (common codes)
const dtcDatabase: Record<string, Omit<DTCInfo, 'code'>> = {
  // ===== Engine =====
  P0300: {
    description: 'Random/Multiple Cylinder Misfire Detected',
    causes: [
      'Faulty spark plugs or wires',
      'Ignition coil failure',
      'Vacuum leak',
      'Fuel injector issues',
      'Low fuel pressure',
    ],
    fix: 'Start with spark plugs and ignition coils. Check for vacuum leaks. Perform compression test if misfire persists.',
    estimatedCost: 150,
    mechanicNeeded: true,
    severity: 'high',
    system: 'Engine',
  },
  P0301: {
    description: 'Cylinder 1 Misfire Detected',
    causes: [
      'Faulty spark plug or wire on cylinder 1',
      'Ignition coil on cylinder 1',
      'Fuel injector on cylinder 1',
      'Low compression on cylinder 1',
    ],
    fix: 'Swap ignition coil with another cylinder to see if misfire moves. Inspect spark plug and wire. Check injector pulse.',
    estimatedCost: 120,
    mechanicNeeded: true,
    severity: 'high',
    system: 'Engine',
  },
  P0302: {
    description: 'Cylinder 2 Misfire Detected',
    causes: ['Similar to P0301 but for cylinder 2'],
    fix: 'Similar diagnostic procedure as P0301.',
    estimatedCost: 120,
    mechanicNeeded: true,
    severity: 'high',
    system: 'Engine',
  },
  P0303: {
    description: 'Cylinder 3 Misfire Detected',
    causes: ['Similar to P0301 but for cylinder 3'],
    fix: 'Similar diagnostic procedure as P0301.',
    estimatedCost: 120,
    mechanicNeeded: true,
    severity: 'high',
    system: 'Engine',
  },
  P0304: {
    description: 'Cylinder 4 Misfire Detected',
    causes: ['Similar to P0301 but for cylinder 4'],
    fix: 'Similar diagnostic procedure as P0301.',
    estimatedCost: 120,
    mechanicNeeded: true,
    severity: 'high',
    system: 'Engine',
  },
  P0305: {
    description: 'Cylinder 5 Misfire Detected',
    causes: ['Similar to P0301 but for cylinder 5'],
    fix: 'Similar diagnostic procedure as P0301.',
    estimatedCost: 120,
    mechanicNeeded: true,
    severity: 'high',
    system: 'Engine',
  },
  P0306: {
    description: 'Cylinder 6 Misfire Detected',
    causes: ['Similar to P0301 but for cylinder 6'],
    fix: 'Similar diagnostic procedure as P0301.',
    estimatedCost: 120,
    mechanicNeeded: true,
    severity: 'high',
    system: 'Engine',
  },
  P0307: {
    description: 'Cylinder 7 Misfire Detected',
    causes: ['Similar to P0301 but for cylinder 7'],
    fix: 'Similar diagnostic procedure as P0301.',
    estimatedCost: 120,
    mechanicNeeded: true,
    severity: 'high',
    system: 'Engine',
  },
  P0308: {
    description: 'Cylinder 8 Misfire Detected',
    causes: ['Similar to P0301 but for cylinder 8'],
    fix: 'Similar diagnostic procedure as P0301.',
    estimatedCost: 120,
    mechanicNeeded: true,
    severity: 'high',
    system: 'Engine',
  },

  // ===== Emissions =====
  P0420: {
    description: 'Catalyst System Efficiency Below Threshold (Bank 1)',
    causes: [
      'Failing catalytic converter',
      'O2 sensor issues (upstream or downstream)',
      'Exhaust leak',
      'Engine misfire causing unburnt fuel',
    ],
    fix: 'Check for exhaust leaks. Replace O2 sensors if faulty. If catalyst is bad, replacement is required.',
    estimatedCost: 800,
    mechanicNeeded: true,
    severity: 'medium',
    system: 'Emissions',
  },
  P0430: {
    description: 'Catalyst System Efficiency Below Threshold (Bank 2)',
    causes: ['Similar to P0420 but for Bank 2'],
    fix: 'Similar diagnostic procedure as P0420.',
    estimatedCost: 800,
    mechanicNeeded: true,
    severity: 'medium',
    system: 'Emissions',
  },

  // ===== Fuel System =====
  P0171: {
    description: 'System Too Lean (Bank 1)',
    causes: [
      'Vacuum leak',
      'Mass air flow (MAF) sensor dirty',
      'Fuel pressure regulator',
      'Clogged fuel filter',
      'O2 sensor',
    ],
    fix: 'Check for vacuum leaks with smoke test. Clean MAF sensor. Check fuel pressure.',
    estimatedCost: 200,
    mechanicNeeded: true,
    severity: 'medium',
    system: 'Fuel',
  },
  P0174: {
    description: 'System Too Lean (Bank 2)',
    causes: ['Similar to P0171 but for Bank 2'],
    fix: 'Similar diagnostic procedure as P0171.',
    estimatedCost: 200,
    mechanicNeeded: true,
    severity: 'medium',
    system: 'Fuel',
  },
  P0172: {
    description: 'System Too Rich (Bank 1)',
    causes: [
      'Faulty MAF sensor',
      'Fuel pressure too high',
      'Leaking fuel injectors',
      'EVAP system issues',
    ],
    fix: 'Check MAF sensor readings. Test fuel pressure. Inspect injectors for leaks.',
    estimatedCost: 200,
    mechanicNeeded: true,
    severity: 'medium',
    system: 'Fuel',
  },
  P0175: {
    description: 'System Too Rich (Bank 2)',
    causes: ['Similar to P0172 but for Bank 2'],
    fix: 'Similar diagnostic procedure as P0172.',
    estimatedCost: 200,
    mechanicNeeded: true,
    severity: 'medium',
    system: 'Fuel',
  },

  // ===== EGR =====
  P0401: {
    description: 'Exhaust Gas Recirculation (EGR) Flow Insufficient',
    causes: [
      'Clogged EGR passages',
      'Faulty EGR valve',
      'EGR solenoid issue',
      'Vacuum leak to EGR',
    ],
    fix: 'Clean EGR passages and valve. Test EGR operation. Replace if necessary.',
    estimatedCost: 250,
    mechanicNeeded: true,
    severity: 'medium',
    system: 'Emissions',
  },

  // ===== EVAP =====
  P0440: {
    description: 'Evaporative Emission Control System Malfunction',
    causes: [
      'Loose or faulty gas cap',
      'EVAP hose leak',
      'Purge valve stuck open',
      'Vent valve stuck closed',
    ],
    fix: 'Tighten gas cap first. If code returns, smoke test EVAP system.',
    estimatedCost: 100,
    mechanicNeeded: true,
    severity: 'low',
    system: 'EVAP',
  },
  P0442: {
    description: 'Evaporative Emission Control System Leak Detected (small leak)',
    causes: ['Small EVAP leak', 'Loose gas cap', 'Cracked EVAP hose'],
    fix: 'Check gas cap. Perform smoke test to locate leak.',
    estimatedCost: 100,
    mechanicNeeded: true,
    severity: 'low',
    system: 'EVAP',
  },
  P0455: {
    description: 'Evaporative Emission Control System Leak Detected (gross leak)',
    causes: ['Large EVAP leak', 'Gas cap missing or very loose', 'EVAP hose disconnected'],
    fix: 'Inspect gas cap and EVAP system for obvious damage.',
    estimatedCost: 50,
    mechanicNeeded: false,
    severity: 'low',
    system: 'EVAP',
  },

  // ===== Vehicle Speed =====
  P0500: {
    description: 'Vehicle Speed Sensor (VSS) Malfunction',
    causes: ['Faulty speed sensor', 'Wiring issue', 'ABS module problem'],
    fix: 'Check sensor wiring and replace if necessary.',
    estimatedCost: 120,
    mechanicNeeded: true,
    severity: 'medium',
    system: 'Drivetrain',
  },

  // ===== ECM =====
  P0606: {
    description: 'ECM/PCM Processor Fault',
    causes: ['Internal ECM failure', 'Power or ground issue', 'Corrupted software'],
    fix: 'Check power and grounds. Reprogram or replace ECM.',
    estimatedCost: 600,
    mechanicNeeded: true,
    severity: 'critical',
    system: 'Engine',
  },

  // ===== Transmission =====
  P0700: {
    description: 'Transmission Control System (MIL Request)',
    causes: ['Transmission fault detected', 'TCM issue'],
    fix: 'Scan for transmission-specific codes (P0700 is generic).',
    estimatedCost: null,
    mechanicNeeded: true,
    severity: 'medium',
    system: 'Transmission',
  },

  // ===== Additional =====
  P1130: {
    description: 'Lack of HO2S Switch - Adaptive Fuel at Limit',
    causes: ['O2 sensor slow response', 'Fuel system issue'],
    fix: 'Diagnose O2 sensor operation and fuel trim data.',
    estimatedCost: 150,
    mechanicNeeded: true,
    severity: 'medium',
    system: 'Fuel',
  },
}

// DIY-friendly codes (owner can attempt fix with basic tools)
const diyFriendlyCodes = new Set(['P0455', 'P0442'])

/**
 * Look up DTC information.
 */
export function getDTCInfo(code: string): DTCInfo | null {
  const normalized = code.toUpperCase().trim()
  const data = dtcDatabase[normalized]
  if (!data) return null
  return { code: normalized, ...data }
}

/**
 * Determine if a DTC can be fixed by a DIY owner.
 */
export function isDIYFriendly(code: string): boolean {
  const normalized = code.toUpperCase().trim()
  const info = getDTCInfo(normalized)
  if (!info) return false
  // Use explicit list or fallback to the mechanicNeeded flag (inverted)
  return diyFriendlyCodes.has(normalized) || !info.mechanicNeeded
}

/**
 * Generate a simple fix suggestion based on DTC and vehicle context.
 * This can be enhanced with AI later.
 */
export function getDTCFix(code: string, vehicle?: { make?: string; model?: string; year?: number }): string {
  const info = getDTCInfo(code)
  if (!info) return 'Consult a professional mechanic for diagnosis.'

  let fix = info.fix

  if (vehicle) {
    fix += ` For your ${vehicle.make} ${vehicle.model}, check for known recalls or technical service bulletins.`
  }

  return fix
}

/**
 * Enrich DTC information with vehicle-specific notes.
 */
export function enrichDTCWithVehicle(
  code: string,
  vehicle: { make?: string; model?: string; year?: number }
): DTCInfo & { personalizedFix: string } {
  const base = getDTCInfo(code) || {
    code: code.toUpperCase(),
    description: 'Unknown DTC',
    causes: ['Code not found in database'],
    fix: 'Please consult a mechanic.',
    estimatedCost: null,
    mechanicNeeded: true,
  }

  const personalizedFix = getDTCFix(code, vehicle)

  return {
    ...base,
    personalizedFix,
  }
}

/**
 * Get all DTC codes by system.
 */
export function getDTCsBySystem(system: string): DTCInfo[] {
  return Object.entries(dtcDatabase)
    .filter(([_, data]) => data.system === system)
    .map(([code, data]) => ({ code, ...data }))
}

/**
 * Get all systems.
 */
export function getAllSystems(): string[] {
  const systems = new Set<string>()
  Object.values(dtcDatabase).forEach(data => {
    if (data.system) systems.add(data.system)
  })
  return Array.from(systems)
}