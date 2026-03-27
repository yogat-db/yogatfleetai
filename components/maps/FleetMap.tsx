'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase/client';

// Fix default marker icons (Leaflet issue with webpack)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function FleetMap({ vehicles }: { vehicles: any[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current).setView([52.5, -1.5], 6); // UK view

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CartoDB',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear existing markers
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapInstance.current!.removeLayer(layer);
      }
    });

    // Add markers for vehicles with coordinates
    vehicles.forEach(vehicle => {
      if (vehicle.lat && vehicle.lng) {
        const marker = L.marker([vehicle.lat, vehicle.lng]).addTo(mapInstance.current!);
        marker.bindPopup(`
          <strong>${vehicle.make} ${vehicle.model}</strong><br/>
          ${vehicle.license_plate}<br/>
          Health: ${vehicle.health_score ?? 'N/A'}%
        `);
      }
    });
  }, [vehicles]);

  return <div ref={mapRef} style={{ height: '400px', width: '100%', borderRadius: '12px' }} />;
}