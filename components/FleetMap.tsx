// components/FleetMap.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  health_score: number | null;
  lat: number | null;
  lng: number | null;
}

interface FleetMapProps {
  vehicles: Vehicle[];
}

export default function FleetMap({ vehicles }: FleetMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    // Check for Mapbox token
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setMapError('Mapbox token missing. Please add NEXT_PUBLIC_MAPBOX_TOKEN to your environment variables.');
      return;
    }

    if (!mapContainer.current) return;

    // Clean up existing map instance
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    try {
      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-1.5, 52.5], // Default: UK centre (longitude, latitude)
        zoom: 5,
        accessToken: token,
      });

      // Add navigation controls (optional)
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Wait for map to load before adding markers
      map.current.on('load', () => {
        if (!map.current) return;

        // Filter vehicles that have coordinates
        const vehiclesWithCoords = vehicles.filter(v => v.lat && v.lng);

        if (vehiclesWithCoords.length === 0) {
          // No coordinates: keep default view
          return;
        }

        // Add markers
        vehiclesWithCoords.forEach(vehicle => {
          if (!vehicle.lat || !vehicle.lng) return;
          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<strong>${vehicle.make} ${vehicle.model}</strong><br/>` +
            `${vehicle.license_plate}<br/>` +
            `Health: ${vehicle.health_score ?? 'N/A'}%`
          );
          new mapboxgl.Marker()
            .setLngLat([vehicle.lng, vehicle.lat])
            .setPopup(popup)
            .addTo(map.current!);
        });

        // Fit bounds to show all markers
        const bounds = new mapboxgl.LngLatBounds();
        vehiclesWithCoords.forEach(v => {
          bounds.extend([v.lng!, v.lat!]);
        });
        map.current.fitBounds(bounds, { padding: 50 });
      });

      // Handle map load errors
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setMapError('Failed to load map. Please check your Mapbox token and network.');
      });
    } catch (err: any) {
      console.error('Map initialization error:', err);
      setMapError(err.message || 'Failed to initialize map.');
    }

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [vehicles]); // Re-run when vehicles change

  if (mapError) {
    return (
      <div style={{ height: '300px', background: '#1e293b', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', padding: '20px', textAlign: 'center' }}>
        <p>{mapError}</p>
      </div>
    );
  }

  return <div ref={mapContainer} style={{ height: '300px', borderRadius: '12px', overflow: 'hidden' }} />;
}