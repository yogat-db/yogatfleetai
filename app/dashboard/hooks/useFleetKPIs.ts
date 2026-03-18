"use client";

import { useState, useEffect } from "react";
import type { VehicleRow } from "./useVehicles";

export type FleetKPIs = {
  totalVehicles: number;
  activeVehicles: number;
  inServiceVehicles: number;
  highRiskVehicles: number;
  fleetHealthScore: number;
  motRiskCount: number;
  forecast90dTotal: number;
};

export function useFleetKPIs(vehicles: VehicleRow[]) {
  const [kpis, setKpis] = useState<FleetKPIs>({
    totalVehicles: 0,
    activeVehicles: 0,
    inServiceVehicles: 0,
    highRiskVehicles: 0,
    fleetHealthScore: 0,
    motRiskCount: 0,
    forecast90dTotal: 0
  });

  useEffect(() => {
    const totalVehicles = vehicles.length;
    const activeVehicles = vehicles.filter(v => v.status === "active").length;
    const inServiceVehicles = vehicles.filter(v => v.status === "in_service").length;
    
    // Calculate health score (simplified for now)
    const fleetHealthScore = vehicles.length > 0 
      ? Math.round(vehicles.reduce((acc, v) => acc + (v.mileage ? 100 - (v.mileage / 10000) : 80), 0) / vehicles.length)
      : 0;

    setKpis({
      totalVehicles,
      activeVehicles,
      inServiceVehicles,
      highRiskVehicles: 0, // You can implement risk calculation
      fleetHealthScore,
      motRiskCount: 0,
      forecast90dTotal: 0
    });
  }, [vehicles]);

  return kpis;
}