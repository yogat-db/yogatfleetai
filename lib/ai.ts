// lib/ai.ts
export function computeFleetBrain(vehicles: any[]) {
  return vehicles.map(vehicle => {
    const health = vehicle.health_score ?? 100;
    const risk = health < 40 ? 'high' : health < 70 ? 'medium' : 'low';
    const daysToFailure = risk === 'high' ? Math.floor(Math.random() * 30) + 1 : null;
    const estimatedRepairCost = risk === 'high' ? Math.floor(Math.random() * 500) + 300 : null;
    return {
      ...vehicle,
      health_score: health,
      risk,
      daysToFailure,
      estimatedRepairCost,
    };
  });
}