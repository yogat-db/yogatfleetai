import type { Vehicle, VehicleAI, RiskLevel } from '@/app/types/fleet'

// --- Constants & Config ---

const CONFIG = {
  WEIGHTS: {
    AGE: 2.5,          // Penalty per year
    MILEAGE: 0.0002,   // Penalty per mile (100k miles = -20 points)
    INACTIVE: 15,      // Penalty for non-operational units
  },
  PREMIUM_BRANDS: ['BMW', 'AUDI', 'MERCEDES', 'PORSCHE', 'TESLA', 'LAND ROVER'],
  THRESHOLDS: {
    LOW: 75,
    MEDIUM: 45,
  }
}

// --- Helper Functions ---

/**
 * Calculates vehicle age with a fallback to the average fleet age
 */
function getVehicleAge(year: number | null): number {
  const currentYear = new Date().getFullYear();
  if (!year || year > currentYear) return 6; // Fleet average fallback
  return currentYear - year;
}

/**
 * Determines if a vehicle belongs to a luxury/premium segment
 */
const isPremiumBrand = (make: string | null) => 
  make ? CONFIG.PREMIUM_BRANDS.includes(make.toUpperCase()) : false;

// --- Core Logic ---

function calculateHealthScore(vehicle: Vehicle): number {
  let score = 100;
  
  // 1. Age Impact
  const age = getVehicleAge(vehicle.year);
  score -= age * CONFIG.WEIGHTS.AGE;

  // 2. Mileage Impact (Exponential decay is more realistic than linear)
  if (vehicle.mileage) {
    const mileageImpact = vehicle.mileage * CONFIG.WEIGHTS.MILEAGE;
    score -= Math.min(mileageImpact, 45); // Cap mileage penalty
  }

  // 3. Status Impact
  if (vehicle.status === 'in_service') score -= 5;
  if (vehicle.status === 'parked') score -= 15;
  if (vehicle.status === 'decommissioned') score = 0;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function determineRisk(score: number): RiskLevel {
  if (score >= CONFIG.THRESHOLDS.LOW) return 'low';
  if (score >= CONFIG.THRESHOLDS.MEDIUM) return 'medium';
  return score > 15 ? 'high' : 'critical';
}

function estimateRepairCost(risk: RiskLevel, make: string | null): number | null {
  if (risk === 'low') return null;

  const isPremium = isPremiumBrand(make);
  const baseRate = isPremium ? 1800 : 750;

  const multipliers: Record<RiskLevel, number> = {
    low: 0,
    medium: 1,
    high: 2.5,
    critical: 4.5
  };

  return baseRate * multipliers[risk];
}

// --- Main Enrichment ---

function enrichVehicle(vehicle: Vehicle): VehicleAI {
  const health = calculateHealthScore(vehicle);
  const risk = determineRisk(health);
  
  // Predict failure date based on health trend
  let predictedFailureDate: string | null = null;
  let daysToFailure: number | null = null;

  if (risk !== 'low') {
    // Logic: Lower health = closer failure. 
    // health 0 = today, health 75 = ~180 days
    const days = Math.floor((health / 75) * 180);
    daysToFailure = Math.max(7, days); // Minimum 1 week warning
    predictedFailureDate = new Date(Date.now() + daysToFailure * 86400000).toISOString();
  }

  return {
    ...vehicle,
    health_score: health,
    risk,
    predicted_failure_date: predictedFailureDate,
    days_to_failure: daysToFailure,
    estimated_repair_cost: estimateRepairCost(risk, vehicle.make),
    ai_summary: `${vehicle.make} is performing at ${health}% health. Risk is ${risk.toUpperCase()}.`
  };
}

/**
 * Computes intelligence for the entire fleet
 */
export function computeFleetBrain(vehicles: Vehicle[]): VehicleAI[] {
  if (!vehicles.length) return [];
  
  return vehicles
    .map(enrichVehicle)
    .sort((a, b) => a.health_score - b.health_score); // Worst vehicles first
}