// lib/ai.ts

export type VehicleInput = {
  id: string;
  license_plate: string;
  make?: string | null;
  model?: string | null;
  year: number | null;
  mileage: number | null;
  diagnostic_codes?: string[] | null;
  last_service_date?: string | null;   // ISO date string
  mot_expiry_date?: string | null;     // ISO date string
  status?: string | null;
  [key: string]: any;
};

export type EnrichedVehicle = VehicleInput & {
  health_score: number;        // 0-100, always a number
  risk: 'low' | 'medium' | 'high';
  days_to_failure: number | null;
  estimated_repair_cost: number | null;
  next_service_due_miles: number;
  mot_status: 'valid' | 'expiring_soon' | 'expired' | 'unknown';
};

/**
 * Compute fleet intelligence including health scores, risk assessment,
 * and predictive maintenance estimates.
 * 
 * @param vehicles - Array of vehicle objects from database
 * @returns Enriched vehicles with computed fields
 */
export function computeFleetBrain(vehicles: VehicleInput[]): EnrichedVehicle[] {
  const currentYear = new Date().getFullYear();
  const today = new Date();

  return vehicles.map(vehicle => {
    // ---------- 1. Base score (100) ----------
    let score = 100;

    // ---------- 2. Mileage penalty (max -40 points at 200k miles) ----------
    const mileage = vehicle.mileage ?? 0;
    if (mileage > 0) {
      const mileagePenalty = Math.min(40, (mileage / 200_000) * 40);
      score -= mileagePenalty;
    } else if (mileage === 0) {
      score -= 5; // brand new but not broken in
    }

    // ---------- 3. Age penalty (max -30 points at 15 years) ----------
    const age = currentYear - (vehicle.year ?? currentYear);
    const agePenalty = Math.min(30, age * 2);
    score -= agePenalty;

    // ---------- 4. Diagnostic trouble codes (each code -5%, max -30) ----------
    const dtcCount = vehicle.diagnostic_codes?.length ?? 0;
    const dtcPenalty = Math.min(30, dtcCount * 5);
    score -= dtcPenalty;

    // ---------- 5. Service history recency ----------
    if (vehicle.last_service_date) {
      const lastService = new Date(vehicle.last_service_date);
      const monthsSinceService = (today.getTime() - lastService.getTime()) / (1000 * 3600 * 24 * 30);
      if (monthsSinceService > 12) {
        score -= 15;
      } else if (monthsSinceService > 6) {
        score -= 8;
      }
    } else {
      // Never serviced – penalty
      score -= 10;
    }

    // ---------- 6. MOT status ----------
    let motStatus: 'valid' | 'expiring_soon' | 'expired' | 'unknown' = 'unknown';
    if (vehicle.mot_expiry_date) {
      const motExpiry = new Date(vehicle.mot_expiry_date);
      const daysToMot = Math.ceil((motExpiry.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (daysToMot < 0) {
        score -= 25;
        motStatus = 'expired';
      } else if (daysToMot < 30) {
        score -= 10;
        motStatus = 'expiring_soon';
      } else {
        motStatus = 'valid';
      }
    } else {
      // No MOT record – small penalty
      score -= 5;
    }

    // ---------- 7. Clamp and round ----------
    let health = Math.max(0, Math.min(100, Math.round(score)));

    // ---------- 8. Risk classification ----------
    const risk = health < 40 ? 'high' : health < 70 ? 'medium' : 'low';

    // ---------- 9. Predictive maintenance (only for high risk) ----------
    let daysToFailure: number | null = null;
    let estimatedRepairCost: number | null = null;
    if (risk === 'high') {
      // Simulate failure within 1-60 days
      daysToFailure = Math.floor(Math.random() * 60) + 1;
      // Cost between £200 and £1500
      estimatedRepairCost = Math.floor(Math.random() * 1300) + 200;
    }

    // ---------- 10. Next service due (rough estimate every 10k miles) ----------
    const nextServiceDueMiles = mileage > 0 ? Math.ceil(mileage / 10000) * 10000 + 10000 : 10000;

    return {
      ...vehicle,
      health_score: health,
      risk,
      days_to_failure: daysToFailure,
      estimated_repair_cost: estimatedRepairCost,
      next_service_due_miles: nextServiceDueMiles,
      mot_status: motStatus,
    };
  });
}