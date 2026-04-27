// lib/mapbox.ts

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

if (!MAPBOX_TOKEN) {
  throw new Error('Missing NEXT_PUBLIC_MAPBOX_TOKEN environment variable');
}

export interface MapboxLocation {
  id: string;
  name: string;
  fullAddress: string;
  coordinates: {
    lng: number;
    lat: number;
  };
  context?: any;
}

export interface DirectionsResult {
  distance: number; // meters
  duration: number; // seconds
  geometry: any;    // GeoJSON for rendering route
}

/**
 * Enhanced Forward Geocoding (Search v6)
 * Includes proximity bias to prioritize local results.
 */
export async function geocode(
  query: string, 
  proximity?: [number, number]
): Promise<MapboxLocation[]> {
  if (!query || query.length < 3) return [];

  const searchParams = new URLSearchParams({
    access_token: MAPBOX_TOKEN!,
    limit: '5',
    language: 'en',
    ...(proximity && { proximity: `${proximity[0]},${proximity[1]}` }),
  });

  const url = `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(query)}&${searchParams.toString()}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour
    if (!res.ok) throw new Error(`Geocoding error: ${res.statusText}`);
    
    const data = await res.json();
    
    return data.features.map((f: any) => ({
      id: f.properties.mapbox_id,
      name: f.properties.name,
      fullAddress: f.properties.full_address || f.properties.place_name,
      coordinates: {
        lng: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
      },
    }));
  } catch (error) {
    console.error('Mapbox Geocode failure:', error);
    return [];
  }
}

/**
 * Reverse Geocoding: Get address from coordinates
 */
export async function reverseGeocode(lng: number, lat: number): Promise<MapboxLocation | null> {
  const url = `https://api.mapbox.com/search/searchbox/v1/reverse?longitude=${lng}&latitude=${lat}&access_token=${MAPBOX_TOKEN}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const f = data.features[0];

    return f ? {
      id: f.properties.mapbox_id,
      name: f.properties.name,
      fullAddress: f.properties.full_address,
      coordinates: { lng, lat },
    } : null;
  } catch (error) {
    return null;
  }
}

/**
 * Professional Directions API
 * Returns distance, duration, and the geometry for line-drawing on maps.
 */
export async function getDirections(
  start: [number, number],
  end: [number, number],
  profile: 'driving-traffic' | 'driving' | 'walking' = 'driving-traffic'
): Promise<DirectionsResult | null> {
  const points = `${start[0]},${start[1]};${end[0]},${end[1]}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${points}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Directions request failed');
    const data = await res.json();
    
    if (!data.routes?.[0]) return null;

    return {
      distance: data.routes[0].distance,
      duration: data.routes[0].duration,
      geometry: data.routes[0].geometry,
    };
  } catch (error) {
    console.error('Mapbox Directions error:', error);
    return null;
  }
}

/**
 * Format meters to miles for the UK/US fleet market
 */
export const formatDistance = (meters: number): string => {
  const miles = meters * 0.000621371;
  return `${miles.toFixed(1)} miles`;
};

/**
 * Format seconds to a readable travel time
 */
export const formatDuration = (seconds: number): string => {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} mins`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hrs}h ${remainingMins}m`;
};