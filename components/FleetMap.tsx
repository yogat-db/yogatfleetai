'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { AlertCircle, Loader2, MapPin, RefreshCw, Maximize2 } from 'lucide-react';
import theme from '@/app/theme';

interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  health_score: number | null;
  lat: number | null;
  lng: number | null;
  year?: number | null;
  mileage?: number | null;
}

interface FleetMapProps {
  vehicles: Vehicle[];
  onVehicleSelect?: (vehicle: Vehicle) => void;
  height?: string;
  interactive?: boolean;
}

interface MarkerState {
  vehicleId: string;
  marker: mapboxgl.Marker;
  popup: mapboxgl.Popup;
}

// Helper: Get marker color based on health score
const getMarkerColor = (healthScore: number | null): string => {
  if (!healthScore) return '#6b7280'; // Gray for unknown
  if (healthScore >= 80) return '#22c55e'; // Green - Healthy
  if (healthScore >= 50) return '#f59e0b'; // Orange - Warning
  return '#ef4444'; // Red - Critical
};

// Helper: Get health status text
const getHealthStatus = (healthScore: number | null): string => {
  if (!healthScore) return 'Unknown';
  if (healthScore >= 80) return 'Healthy';
  if (healthScore >= 50) return 'Warning';
  return 'Critical';
};

// Custom SVG marker (HTML DOM element)
const createCustomMarker = (vehicle: Vehicle): HTMLElement => {
  const healthScore = vehicle.health_score ?? 0;
  const color = getMarkerColor(healthScore);
  
  const el = document.createElement('div');
  el.style.width = '40px';
  el.style.height = '40px';
  el.style.backgroundColor = color;
  el.style.borderRadius = '50%';
  el.style.border = '3px solid white';
  el.style.boxShadow = `0 2px 8px rgba(0,0,0,0.3)`;
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.cursor = 'pointer';
  el.style.transition = 'transform 0.2s ease';
  el.style.fontSize = '18px';
  el.title = `${vehicle.make} ${vehicle.model} - Health: ${healthScore}%`;
  
  // Add emoji based on status
  const emoji = healthScore >= 80 ? '✓' : healthScore >= 50 ? '⚠' : '✕';
  el.innerHTML = emoji;
  el.style.color = 'white';
  el.style.fontWeight = 'bold';
  
  el.addEventListener('mouseenter', () => {
    el.style.transform = 'scale(1.3)';
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = 'scale(1)';
  });
  
  return el;
};

export default function FleetMap({
  vehicles,
  onVehicleSelect,
  height = '400px',
  interactive = true,
}: FleetMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<MarkerState[]>([]);
  
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicleCount, setVehicleCount] = useState(0);

  // Initialize Mapbox
  const initializeMap = useCallback(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    
    if (!token) {
      setMapError('Mapbox token not configured. Please add NEXT_PUBLIC_MAPBOX_TOKEN to your environment.');
      setMapLoading(false);
      return;
    }

    if (!mapContainer.current) {
      setMapError('Map container not found');
      setMapLoading(false);
      return;
    }

    try {
      // Clean up existing map
      if (map.current) {
        map.current.remove();
        map.current = null;
      }

      // Set Mapbox access token
      mapboxgl.accessToken = token;

      // Initialize new map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-2.5, 54.5], // UK center
        zoom: 5,
        attributionControl: true,
        maxZoom: 18,
        minZoom: 3,
        interactive: interactive,
      });

      // Add controls
      if (interactive) {
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
        map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
      }

      // Handle map load
      map.current.on('load', () => {
        setMapLoading(false);
        updateMarkers();
      });

      // Error handling
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setMapError('Failed to load map. Check your connection and Mapbox token.');
        setMapLoading(false);
      });

    } catch (err: any) {
      console.error('Map initialization failed:', err);
      setMapError(`Error: ${err.message || 'Failed to initialize map'}`);
      setMapLoading(false);
    }
  }, [interactive]);

  // Update markers on vehicle data change
  const updateMarkers = useCallback(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach(({ marker }) => {
      marker.remove();
    });
    markers.current = [];

    // Filter vehicles with coordinates
    const vehiclesWithCoords = vehicles.filter(
      (v) => v.lat !== null && v.lng !== null && v.lat !== 0 && v.lng !== 0
    );

    setVehicleCount(vehiclesWithCoords.length);

    if (vehiclesWithCoords.length === 0) {
      setMapError(null);
      return;
    }

    // Add new markers
    const bounds = new mapboxgl.LngLatBounds();

    vehiclesWithCoords.forEach((vehicle) => {
      try {
        const markerEl = createCustomMarker(vehicle);
        const healthStatus = getHealthStatus(vehicle.health_score);
        
        const popupContent = `
          <div style="font-family: system-ui; padding: 8px; color: #f1f5f9;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">
              ${vehicle.make} ${vehicle.model}
            </div>
            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">
              <strong>Plate:</strong> ${vehicle.license_plate}
            </div>
            ${vehicle.year ? `<div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;"><strong>Year:</strong> ${vehicle.year}</div>` : ''}
            ${vehicle.mileage ? `<div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;"><strong>Mileage:</strong> ${vehicle.mileage.toLocaleString()} mi</div>` : ''}
            <div style="font-size: 13px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #334155;">
              <strong>Health:</strong> <span style="color: ${getMarkerColor(vehicle.health_score)}; font-weight: 700;">
                ${vehicle.health_score ?? 'N/A'}% (${healthStatus})
              </span>
            </div>
          </div>
        `;

        const popup = new mapboxgl.Popup({
          offset: 25,
          maxWidth: '250px',
          closeButton: true,
          closeOnClick: false,
        }).setHTML(popupContent);

        const marker = new mapboxgl.Marker({ element: markerEl })
          .setLngLat([vehicle.lng!, vehicle.lat!])
          .setPopup(popup)
          .addTo(map.current!);

        // Click event
        markerEl.addEventListener('click', () => {
          setSelectedVehicle(vehicle);
          if (onVehicleSelect) {
            onVehicleSelect(vehicle);
          }
        });

        markers.current.push({ vehicleId: vehicle.id, marker, popup });
        bounds.extend([vehicle.lng!, vehicle.lat!]);
      } catch (err) {
        console.warn(`Failed to add marker for ${vehicle.license_plate}:`, err);
      }
    });

    // Fit map to bounds
    try {
      if (vehiclesWithCoords.length > 1) {
        map.current!.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15,
          duration: 1000,
        });
      } else if (vehiclesWithCoords.length === 1) {
        map.current!.flyTo({
          center: [vehiclesWithCoords[0].lng!, vehiclesWithCoords[0].lat!],
          zoom: 12,
          duration: 1000,
        });
      }
    } catch (err) {
      console.warn('Failed to fit bounds:', err);
    }
  }, [vehicles, onVehicleSelect]);

  // Initialize on mount
  useEffect(() => {
    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      markers.current = [];
    };
  }, [initializeMap]);

  // Update markers when vehicles change
  useEffect(() => {
    if (map.current && map.current.loaded()) {
      updateMarkers();
    }
  }, [vehicles, updateMarkers]);

  const handleRefresh = () => {
    setMapLoading(true);
    updateMarkers();
    setTimeout(() => setMapLoading(false), 500);
  };

  const handleFitBounds = () => {
    if (!map.current) return;
    const vehiclesWithCoords = vehicles.filter((v) => v.lat && v.lng);
    if (vehiclesWithCoords.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    vehiclesWithCoords.forEach((v) => {
      bounds.extend([v.lng!, v.lat!]);
    });
    map.current.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 800 });
  };

  return (
    <div style={styles.container}>
      {/* Map Header with Controls */}
      <div style={styles.header}>
        <div style={styles.headerInfo}>
          <MapPin size={16} color={theme.colors.primary} />
          <span style={styles.headerText}>
            Fleet Locations
            {vehicleCount > 0 && ` (${vehicleCount} vehicle${vehicleCount !== 1 ? 's' : ''})`}
          </span>
        </div>
        <div style={styles.controls}>
          {interactive && (
            <>
              <button
                onClick={handleFitBounds}
                title="Fit to bounds"
                style={styles.controlButton}
                disabled={vehicleCount === 0}
              >
                <Maximize2 size={14} />
              </button>
              <button
                onClick={handleRefresh}
                title="Refresh map"
                style={styles.controlButton}
                disabled={mapLoading}
              >
                {mapLoading ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <RefreshCw size={14} />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error State */}
      {mapError && (
        <div style={styles.errorBox}>
          <AlertCircle size={20} color={theme.colors.status.critical} />
          <div>
            <strong>Map Error</strong>
            <p style={styles.errorMessage}>{mapError}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {mapLoading && (
        <div style={styles.loadingOverlay}>
          <Loader2 size={32} color={theme.colors.primary} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={styles.loadingText}>Loading map...</p>
        </div>
      )}

      {/* Map Container */}
      <div
        ref={mapContainer}
        style={{
          ...styles.mapContainer,
          height,
          opacity: mapLoading ? 0.5 : 1,
        }}
      />

      {/* Legend */}
      {vehicleCount > 0 && interactive && (
        <div style={styles.legend}>
          <div style={styles.legendTitle}>Health Status</div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, backgroundColor: '#22c55e' }} />
            <span>Healthy (≥80%)</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, backgroundColor: '#f59e0b' }} />
            <span>Warning (50-79%)</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, backgroundColor: '#ef4444' }} />
            <span>Critical (&lt;50%)</span>
          </div>
        </div>
      )}

      {/* Selected Vehicle Info */}
      {selectedVehicle && interactive && (
        <div style={styles.selectedVehicleBox}>
          <div style={styles.selectedVehicleHeader}>
            <strong>
              {selectedVehicle.make} {selectedVehicle.model}
            </strong>
            <button
              onClick={() => setSelectedVehicle(null)}
              style={styles.closeButton}
            >
              ✕
            </button>
          </div>
          <div style={styles.selectedVehicleDetails}>
            <p>
              <strong>Plate:</strong> {selectedVehicle.license_plate}
            </p>
            {selectedVehicle.year && (
              <p>
                <strong>Year:</strong> {selectedVehicle.year}
              </p>
            )}
            {selectedVehicle.mileage && (
              <p>
                <strong>Mileage:</strong> {selectedVehicle.mileage.toLocaleString()} mi
              </p>
            )}
            <p>
              <strong>Health:</strong>{' '}
              <span style={{ color: getMarkerColor(selectedVehicle.health_score) }}>
                {selectedVehicle.health_score ?? 'N/A'}%
              </span>
            </p>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!mapLoading && vehicleCount === 0 && !mapError && (
        <div style={styles.noDataBox}>
          <MapPin size={32} color={theme.colors.text.muted} />
          <p>No vehicles with location data</p>
          <small>Add addresses to your vehicles to view them on the map</small>
        </div>
      )}

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .mapboxgl-popup-content {
          background: #0f172a !important;
          color: #f1f5f9 !important;
          border-radius: 8px !important;
        }
        .mapboxgl-popup-close-button {
          color: #94a3b8 !important;
        }
        .mapboxgl-popup-anchor-top .mapboxgl-popup-tip {
          border-bottom-color: #0f172a !important;
        }
        .mapboxgl-ctrl-group button {
          background-color: #1e293b !important;
          color: #f1f5f9 !important;
        }
        .mapboxgl-ctrl-group button:hover {
          background-color: #334155 !important;
        }
      `}</style>
    </div>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    borderRadius: theme.borderRadius.xl || '16px',
    overflow: 'hidden',
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.background.main,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: theme.colors.background.card,
    borderBottom: `1px solid ${theme.colors.border.light}`,
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerText: {
    fontSize: '14px',
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  controls: {
    display: 'flex',
    gap: '8px',
  },
  controlButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.md || '8px',
    color: theme.colors.text.primary,
    cursor: 'pointer',
    transition: 'all 0.2s',
    padding: 0,
  },
  mapContainer: {
    width: '100%',
    borderRadius: theme.borderRadius.xl || '16px',
    transition: 'opacity 0.3s',
  },
  errorBox: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    background: `${theme.colors.status.critical}15`,
    border: `1px solid ${theme.colors.status.critical}`,
    borderRadius: theme.borderRadius.lg || '12px',
    margin: '12px',
    color: theme.colors.status.critical,
    fontSize: '14px',
  },
  errorMessage: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    opacity: 0.9,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(2, 6, 23, 0.8)',
    zIndex: 10,
    gap: '12px',
  },
  loadingText: {
    color: theme.colors.text.secondary,
    fontSize: '14px',
  },
  legend: {
    position: 'absolute',
    bottom: '16px',
    left: '16px',
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.lg || '12px',
    padding: '12px',
    zIndex: 5,
    fontSize: '12px',
  },
  legendTitle: {
    fontWeight: '600',
    marginBottom: '8px',
    color: theme.colors.text.primary,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
    color: theme.colors.text.secondary,
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid white',
    flexShrink: 0,
  },
  selectedVehicleBox: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: theme.colors.background.card,
    border: `2px solid ${theme.colors.primary}`,
    borderRadius: theme.borderRadius.lg || '12px',
    padding: '12px',
    maxWidth: '250px',
    zIndex: 5,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  selectedVehicleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: `1px solid ${theme.colors.border.light}`,
    color: theme.colors.text.primary,
    fontSize: '13px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: theme.colors.text.muted,
    cursor: 'pointer',
    fontSize: '16px',
    padding: 0,
  },
  selectedVehicleDetails: {
    fontSize: '12px',
    color: theme.colors.text.secondary,
  },
  noDataBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
    color: theme.colors.text.muted,
    gap: '8px',
  },
};
