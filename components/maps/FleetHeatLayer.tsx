"use client"

import { useEffect } from "react"
import { useMap } from "react-leaflet"
import L from "leaflet"

// Import the heat plugin - this adds 'L.heatLayer' to the Leaflet namespace
import "leaflet.heat"

interface Vehicle {
  lat: number | null
  lng: number | null
  health_score?: number | null
}

interface Props {
  vehicles: Vehicle[]
}

export default function FleetHeatLayer({ vehicles }: Props) {
  const map = useMap()

  useEffect(() => {
    if (!map || !vehicles.length) return

    // 1. Prepare data: [lat, lng, intensity]
    // We use (100 - health_score) so that lower health vehicles show more "heat" (red)
    const points = vehicles
      .filter((v) => v.lat !== null && v.lng !== null)
      .map((v) => {
        const intensity = v.health_score ? (100 - v.health_score) / 100 : 0.5
        return [v.lat as number, v.lng as number, intensity] as [number, number, number]
      })

    // 2. Create the Heat Layer
    // @ts-ignore - Leaflet.heat is a plugin and might not have perfect TS definitions
    const heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      gradient: {
        0.4: "blue",
        0.6: "lime",
        0.8: "yellow",
        1.0: "red"
      }
    })

    // 3. Add to map
    heatLayer.addTo(map)

    // 4. Cleanup when component unmounts or vehicles change
    return () => {
      map.removeLayer(heatLayer)
    }
  }, [map, vehicles])

  return null // This component doesn't render HTML, it just manages the map layer
}