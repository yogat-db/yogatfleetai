'use client';

import VehicleCardPremium from './VehicleCardPremium';
import theme from '@/app/theme';
import type { Vehicle } from '@/app/types/vehicle';

interface VehicleGridProps {
  vehicles: Vehicle[];
  loading?: boolean;
  onVehicleClick?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function VehicleGrid({ 
  vehicles = [], // Defaulting to empty array prevents .map crashes
  loading,
  onVehicleClick, 
  onEdit, 
  onDelete 
}: VehicleGridProps) {
  
  if (loading) {
    return (
      <div style={styles.grid}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="shimmer-card" style={styles.skeleton} />
        ))}
        <style jsx>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .shimmer-card {
            background: linear-gradient(90deg, #0f172a 25%, #1e293b 50%, #0f172a 75%);
            background-size: 200% 100%;
            animation: shimmer 2s infinite linear;
          }
        `}</style>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p style={{ color: theme.colors.text.secondary, fontSize: '14px', fontWeight: 500 }}>
          No vehicles found. Start by adding your first asset to the fleet.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.grid}>
      {vehicles.map((v) => (
        <VehicleCardPremium
          key={v.id}
          vehicle={v}
          onClick={() => onVehicleClick?.(v.id)}
          onEdit={() => onEdit?.(v.id)}
          onDelete={() => onDelete?.(v.id)}
        />
      ))}
    </div>
  );
}

const styles = {
  grid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
    gap: '24px',
    width: '100%',
    // Added padding to prevent cards from hitting screen edges on mobile
    padding: '4px' 
  },
  skeleton: {
    height: '240px',
    borderRadius: '20px',
    border: '1px solid #1e293b',
  },
  emptyState: {
    padding: '80px 20px',
    textAlign: 'center',
    borderRadius: '24px',
    background: 'rgba(15, 23, 42, 0.4)',
    border: '1px dashed #334155',
    marginTop: '20px'
  }
} as const;