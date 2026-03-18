// lib/mapbox.ts
import mapboxgl from 'mapbox-gl';

// Replace with your Mapbox public token
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

if (!MAPBOX_TOKEN) {
  throw new Error('Missing NEXT_PUBLIC_MAPBOX_TOKEN environment variable');
}

mapboxgl.accessToken = MAPBOX_TOKEN;

export { mapboxgl };