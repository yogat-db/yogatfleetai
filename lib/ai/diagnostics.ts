export interface DTCInfo {
  code: string
  description: string
  causes: string[]
  fix: string
  estimatedCost: number | null
  mechanicNeeded: boolean
}

// Extended DTC database (common codes)
const dtcDatabase: Record<string, Omit<DTCInfo, 'code'>> = {
  // Engine & Drivetrain
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
  },
  P0302: {
    description: 'Cylinder 2 Misfire Detected',
    causes: ['Similar to P0301 but for cylinder 2'],
    fix: 'Similar diagnostic procedure as P0301.',
    estimatedCost: 120,
    mechanicNeeded: true,
  },
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
  },
  P0430: {
    description: 'Catalyst System Efficiency Below Threshold (Bank 2)',
    causes: ['Similar to P0420 but for Bank 2'],
    fix: 'Similar diagnostic procedure as P0420.',
    estimatedCost: 800,
    mechanicNeeded: true,
  },
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
  },
  P0174: {
    description: 'System Too Lean (Bank 2)',
    causes: ['Similar to P0171 but for Bank 2'],
    fix: 'Similar diagnostic procedure as P0171.',
    estimatedCost: 200,
    mechanicNeeded: true,
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
  },
  P0175: {
    description: 'System Too Rich (Bank 2)',
    causes: ['Similar to P0172 but for Bank 2'],
    fix: 'Similar diagnostic procedure as P0172.',
    estimatedCost: 200,
    mechanicNeeded: true,
  },
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
  },
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
  },
  P0442: {
    description: 'Evaporative Emission Control System Leak Detected (small leak)',
    causes: ['Small EVAP leak', 'Loose gas cap', 'Cracked EVAP hose'],
    fix: 'Check gas cap. Perform smoke test to locate leak.',
    estimatedCost: 100,
    mechanicNeeded: true,
  },
  P0455: {
    description: 'Evaporative Emission Control System Leak Detected (gross leak)',
    causes: ['Large EVAP leak', 'Gas cap missing or very loose', 'EVAP hose disconnected'],
    fix: 'Inspect gas cap and EVAP system for obvious damage.',
    estimatedCost: 50,
    mechanicNeeded: false,
  },
  P0500: {
    description: 'Vehicle Speed Sensor (VSS) Malfunction',
    causes: ['Faulty speed sensor', 'Wiring issue', 'ABS module problem'],
    fix: 'Check sensor wiring and replace if necessary.',
    estimatedCost: 120,
    mechanicNeeded: true,
  },
  P0606: {
    description: 'ECM/PCM Processor Fault',
    causes: ['Internal ECM failure', 'Power or ground issue', 'Corrupted software'],
    fix: 'Check power and grounds. Reprogram or replace ECM.',
    estimatedCost: 600,
    mechanicNeeded: true,
  },
  P0700: {
    description: 'Transmission Control System (MIL Request)',
    causes: ['Transmission fault detected', 'TCM issue'],
    fix: 'Scan for transmission-specific codes (P0700 is generic).',
    estimatedCost: null,
    mechanicNeeded: true,
  },
  P1130: {
    description: 'Lack of HO2S Switch - Adaptive Fuel at Limit',
    causes: ['O2 sensor slow response', 'Fuel system issue'],
    fix: 'Diagnose O2 sensor operation and fuel trim data.',
    estimatedCost: 150,
    mechanicNeeded: true,
  },
}

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
  // Simple rule: some codes are DIY-friendly (e.g., P0455 gas cap)
  const diyCodes = ['P0455', 'P0442']
  return diyCodes.includes(normalized) || !info.mechanicNeeded
}