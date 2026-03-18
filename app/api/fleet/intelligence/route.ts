import { NextRequest, NextResponse } from "next/server";

// Define strict types to eliminate "undefined" errors
type Severity = "Low" | "Moderate" | "High" | "Critical";

interface HeatmapData {
  severities: Severity[];
  matrix: number[][]; // [row][column]
}

export async function GET(req: NextRequest) {
  try {
    // 1. Initialize with a fixed structure to satisfy TS compiler
    const heatmap: HeatmapData = {
      severities: ["Low", "Moderate", "High", "Critical"],
      matrix: [
        [0, 0, 0, 0], // Row 0: MOT Status
        [0, 0, 0, 0], // Row 1: Health/Risk
        [0, 0, 0, 0], // Row 2: Data Quality
        [0, 0, 0, 0], // Row 3: Wear/Mileage
      ]
    };

    // Mapping helper to safely update the matrix
    const updateHeatmap = (row: number, severity: Severity) => {
      const col = heatmap.severities.indexOf(severity);
      if (col !== -1) {
        // Use non-null assertion safely because we initialized matrix above
        heatmap.matrix[row]![col]! += 1;
      }
    };

    let totalMonthlyCost = 0;
    let highRiskCost = 0;

    // TODO: Fetch your actual vehicle data here
    const vehicles: any[] = []; 

    vehicles.forEach((v) => {
      const health = v.health_score ?? 100;
      const motDays = v.mot_days;
      
      // --- RISK / HEALTH LOGIC (Row 1) ---
      // Matches your VehicleEnrichmentCard.tsx logic
      const riskSev: Severity = health < 40 ? "Critical" : health < 60 ? "High" : health < 80 ? "Moderate" : "Low";
      updateHeatmap(1, riskSev);

      // --- MOT SEVERITY LOGIC (Row 0) ---
      if (motDays !== null && motDays !== undefined) {
        const motSev: Severity = motDays < 0 ? "Critical" : motDays <= 14 ? "High" : motDays <= 30 ? "Moderate" : "Low";
        updateHeatmap(0, motSev);
      } else {
        updateHeatmap(0, "Moderate");
      }

      // --- DATA QUALITY LOGIC (Row 2) ---
      const dqIssues = (v.mot_due ? 0 : 1) + (v.last_service_date ? 0 : 1);
      const dqSev: Severity = dqIssues >= 2 ? "High" : dqIssues === 1 ? "Moderate" : "Low";
      updateHeatmap(2, dqSev);

      // --- MILEAGE / WEAR LOGIC (Row 3) ---
      const mileage = v.mileage ?? 0;
      const wearSev: Severity = mileage >= 150000 ? "High" : mileage >= 110000 ? "Moderate" : "Low";
      updateHeatmap(3, wearSev);

      // --- FINANCIALS ---
      // Using estimateMonthlyCost as per your project structure
      const cost = typeof v.estimateMonthlyCost === 'function' ? v.estimateMonthlyCost() : 100;
      totalMonthlyCost += cost;
      if (health < 60) highRiskCost += cost;
    });

    // Highly professional response structure for your UI components
    return NextResponse.json({
      summary: {
        totalVehicles: vehicles.length,
        totalMonthlyCost,
        highRiskCost,
        riskPercentage: vehicles.length > 0 ? ((highRiskCost / totalMonthlyCost) * 100).toFixed(2) : 0
      },
      heatmap,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("[INTELLIGENCE_API_ERROR]:", error);
    return NextResponse.json({ error: "Failed to process fleet intelligence" }, { status: 500 });
  }
}