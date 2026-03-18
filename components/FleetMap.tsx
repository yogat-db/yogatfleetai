"use client"

import dynamic from "next/dynamic"
import { useMemo } from "react"
import L from "leaflet"

import "leaflet/dist/leaflet.css"

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
)

const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
)

const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
)

const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
)

const MarkerClusterGroup = dynamic(
  () => import("react-leaflet-cluster"),
  { ssr: false }
)

type Vehicle = {
  id: string
  plate: string
  make?: string | null
  model?: string | null
  mileage?: number | null
  health_score?: number | null
  lat?: number | null
  lng?: number | null
}

const UK_CENTER: [number, number] = [54.5, -3]

const mapStyle = {
  width: "100%",
  height: "500px",
  borderRadius: "10px"
}

function markerColor(v: Vehicle) {

  if (!v.health_score) return "#9CA3AF"

  if (v.health_score > 80) return "#22C55E"

  if (v.health_score > 50) return "#F59E0B"

  return "#EF4444"
}

function createIcon(color: string) {

  return new L.DivIcon({
    className: "",
    html: `<div style="
      background:${color};
      width:16px;
      height:16px;
      border-radius:50%;
      border:2px solid white;
      box-shadow:0 0 6px rgba(0,0,0,0.5)
    "></div>`
  })
}

export default function FleetMap({ vehicles }: { vehicles: Vehicle[] }) {

  const safeVehicles = useMemo(
    () =>
      vehicles?.filter(
        (v) =>
          typeof v.lat === "number" &&
          typeof v.lng === "number"
      ) ?? [],
    [vehicles]
  )

  return (
    <MapContainer
      center={UK_CENTER}
      zoom={6}
      scrollWheelZoom
      style={mapStyle}
    >

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MarkerClusterGroup>

        {safeVehicles.map((v) => {

          const icon = createIcon(markerColor(v))

          return (

            <Marker
              key={v.id}
              position={[v.lat!, v.lng!]}
              icon={icon}
            >

              <Popup>

                <div style={{ minWidth: 150 }}>

                  <strong>{v.plate}</strong>

                  <div>
                    {v.make} {v.model}
                  </div>

                  {v.mileage && (
                    <div>
                      Mileage: {v.mileage.toLocaleString()}
                    </div>
                  )}

                  {v.health_score && (
                    <div>
                      Health: {v.health_score}%
                    </div>
                  )}

                </div>

              </Popup>

            </Marker>

          )

        })}

      </MarkerClusterGroup>

    </MapContainer>
  )
}