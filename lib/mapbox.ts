// lib/mapbox.ts

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

if (!MAPBOX_TOKEN) {
  throw new Error('Missing NEXT_PUBLIC_MAPBOX_TOKEN environment variable')
}

export interface GeocodeResult {
  place_name: string
  center: [number, number] // [lng, lat]
  address?: string
}

/**
 * Forward geocoding: convert address to coordinates
 */
export async function geocode(query: string): Promise<GeocodeResult[]> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Geocoding failed: ${res.statusText}`)
  const data = await res.json()
  return data.features.map((feature: any) => ({
    place_name: feature.place_name,
    center: feature.center,
  }))
}

/**
 * Reverse geocoding: convert coordinates to address
 */
export async function reverseGeocode(lng: number, lat: number): Promise<GeocodeResult | null> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Reverse geocoding failed: ${res.statusText}`)
  const data = await res.json()
  if (data.features.length === 0) return null
  const feature = data.features[0]
  return {
    place_name: feature.place_name,
    center: feature.center,
  }
}

/**
 * Get directions between two points (optional)
 */
export async function getDirections(
  start: [number, number],
  end: [number, number],
  profile: 'driving' | 'walking' | 'cycling' = 'driving'
) {
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start[0]},${start[1]};${end[0]},${end[1]}?access_token=${MAPBOX_TOKEN}&geometries=geojson`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Directions failed: ${res.statusText}`)
  const data = await res.json()
  return data.routes[0]
}
