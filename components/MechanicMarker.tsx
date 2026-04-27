'use client';

import { useMemo } from 'react';
import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
import { ShieldCheck, Phone, Navigation, ExternalLink } from 'lucide-react';
import theme from '@/app/theme';

interface MechanicMarkerProps {
  id: string;
  position: [number, number];
  businessName: string;
  phone?: string;
  verified?: boolean;
}

/**
 * PRODUCTION-GRADE ICON GENERATOR
 * Uses useMemo to prevent icon recreation and memory leaks.
 */
const useMechanicIcon = (color: string) => {
  return useMemo(() => L.divIcon({
    className: 'mechanic-ping-wrapper',
    html: `
      <div class="ping-container">
        <div class="ping-dot" style="background: ${color};"></div>
        <div class="ping-wave" style="background: ${color};"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  }), [color]);
};

export default function MechanicMarker({ id, position, businessName, phone, verified }: MechanicMarkerProps) {
  // Pulling strictly from your upgraded theme structure
  const accentColor = theme.colors.status.info;
  const successColor = theme.colors.status.healthy;
  const icon = useMechanicIcon(accentColor);

  const handleNavigation = () => {
    const [lat, lng] = position;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  return (
    <>
      <style>{`
        .mechanic-ping-wrapper { background: none; border: none; }
        .ping-container { position: relative; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; }
        .ping-dot { width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: ${theme.shadows.md}; z-index: 2; }
        .ping-wave { position: absolute; width: 12px; height: 12px; border-radius: 50%; opacity: 0.6; animation: marker-pulse 2s infinite; z-index: 1; }
        @keyframes marker-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(3.5); opacity: 0; }
        }
        .mechanic-popup .leaflet-popup-content-wrapper { 
          background: ${theme.colors.background.card}; 
          color: ${theme.colors.text.primary};
          border-radius: ${theme.borderRadius.lg};
          padding: 0;
          border: 1px solid ${theme.colors.border.light};
        }
        .mechanic-popup .leaflet-popup-tip { background: ${theme.colors.background.card}; }
      `}</style>

      <Marker position={position} icon={icon}>
        <Popup minWidth={240} className="mechanic-popup">
          <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={styles.name}>{businessName}</span>
                {verified && <ShieldCheck size={16} color={successColor} />}
              </div>
              {verified && (
                <span style={{ ...styles.badge, color: successColor, backgroundColor: `${successColor}15` }}>
                  Verified Specialist
                </span>
              )}
            </div>

            {/* Content */}
            <div style={styles.content}>
              {phone && (
                <div style={styles.row}>
                  <Phone size={14} style={{ opacity: 0.5 }} />
                  <a href={`tel:${phone}`} style={styles.link}>{phone}</a>
                </div>
              )}
              
              <div style={styles.actions}>
                <button onClick={handleNavigation} style={{ ...styles.primaryBtn, backgroundColor: accentColor }}>
                  <Navigation size={14} />
                  Directions
                </button>
                <button 
                  onClick={() => window.open(`/mechanic/${id}`, '_blank')}
                  style={styles.secondaryBtn}
                >
                  <ExternalLink size={14} />
                  Profile
                </button>
              </div>
            </div>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

const styles = {
  container: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  name: {
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.text.primary,
    marginRight: '8px',
  },
  badge: {
    fontSize: '10px',
    fontWeight: 800,
    textTransform: 'uppercase' as const,
    padding: '2px 8px',
    borderRadius: theme.borderRadius.full,
    width: 'fit-content',
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
  },
  link: {
    color: theme.colors.status.info,
    textDecoration: 'none',
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  primaryBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    border: 'none',
    color: 'white',
    padding: '8px 0',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSizes.xs,
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    color: theme.colors.text.secondary,
    padding: '8px 0',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSizes.xs,
    fontWeight: 600,
    cursor: 'pointer',
  },
};