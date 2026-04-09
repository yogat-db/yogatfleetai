// app/diagnostics/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import QrScanner from '@/components/QrScanner';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

// ==================== TYPES ====================
interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  year?: number;
  health_score?: number;
}

interface ScanResult {
  code: string;
  description: string;
  causes: string[];
  fix: string;
  estimatedCost: number | null;
  mechanicNeeded: boolean;
}

// ==================== HELPER ====================
const getThemeValue = (path: string, fallback: any) => {
  const parts = path.split('.');
  let current: any = theme;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return fallback;
    }
  }
  return current;
};

const primaryColor = getThemeValue('colors.primary', '#22c55e');
const errorColor = getThemeValue('colors.error', '#ef4444');
const bgCard = getThemeValue('colors.background.card', '#0f172a');
const bgElevated = getThemeValue('colors.background.elevated', '#1e293b');
const borderLight = getThemeValue('colors.border.light', '#1e293b');
const borderMedium = getThemeValue('colors.border.medium', '#334155');
const textPrimary = getThemeValue('colors.text.primary', '#f1f5f9');
const textSecondary = getThemeValue('colors.text.secondary', '#94a3b8');

// ==================== MAIN COMPONENT ====================
export default function DiagnosticsPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [dtcCode, setDtcCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchingVehicles, setFetchingVehicles] = useState(true);

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchVehicles() {
    try {
      setFetchingVehicles(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, license_plate, make, model, year, health_score')
        .eq('user_id', user.id);
      if (error) throw error;
      setVehicles(data || []);
      if (data && data.length > 0) setSelectedVehicleId(data[0].id);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Could not load your vehicles. Please try again.');
    } finally {
      setFetchingVehicles(false);
    }
  }

  const handleScan = async () => {
    if (!dtcCode.trim()) {
      setError('Please enter a DTC code');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/dtc/${dtcCode.trim().toUpperCase()}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'DTC code not found');
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQrScan = (code: string) => {
    setDtcCode(code);
    setShowScanner(false);
    setTimeout(() => handleScan(), 100);
  };

  // Loading state for vehicles
  if (fetchingVehicles) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading your vehicles...</p>
        <style jsx>{`
          .spinner {
            border: 3px solid ${borderMedium};
            border-top: 3px solid ${primaryColor};
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // No vehicles – prompt to add one
  if (vehicles.length === 0 && !error) {
    return (
      <div style={styles.centered}>
        <p>No vehicles found. Please add a vehicle first.</p>
        <button onClick={() => router.push('/vehicles/add')} style={styles.button}>
          Add Vehicle
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <h1 style={styles.title}>AI Neural Diagnostics</h1>
      <p style={styles.subtitle}>
        Scan Diagnostic Trouble Codes (DTC) using real‑time mechanical intelligence.
      </p>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Vehicle Scan</h3>

        {/* Vehicle Selector – native dropdown (no external component) */}
        <div style={styles.field}>
          <label style={styles.label}>Select Active Asset</label>
          <select
            value={selectedVehicleId || ''}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            style={styles.select}
            disabled={vehicles.length === 0}
          >
            <option value="" disabled>Select a vehicle</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.make} {vehicle.model} ({vehicle.license_plate})
              </option>
            ))}
          </select>
        </div>

        {/* DTC Input with QR button */}
        <div style={styles.field}>
          <label style={styles.label}>DTC Fault Code</label>
          <div style={styles.inputGroup}>
            <input
              type="text"
              value={dtcCode}
              onChange={(e) => setDtcCode(e.target.value.toUpperCase())}
              placeholder="e.g. P0300"
              style={styles.input}
              disabled={loading}
            />
            <button
              onClick={() => setShowScanner(!showScanner)}
              style={styles.scanIconButton}
              title="Scan QR code"
            >
              📷
            </button>
          </div>

          <AnimatePresence>
            {showScanner && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <QrScanner onScan={handleQrScan} onClose={() => setShowScanner(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scan Button */}
        <button
          onClick={handleScan}
          disabled={loading || !selectedVehicleId}
          style={styles.scanButton}
        >
          {loading ? 'Scanning...' : 'Initialize Deep Scan'}
        </button>

        {/* Error / Result */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={styles.errorBox}
            >
              {error}
            </motion.div>
          )}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={styles.resultCard}
            >
              <h4 style={styles.resultCode}>{result.code}</h4>
              <p style={styles.resultDescription}>{result.description}</p>
              <h5>Possible Causes</h5>
              <ul style={styles.list}>
                {result.causes.map((cause, i) => <li key={i}>{cause}</li>)}
              </ul>
              <h5>Suggested Fix</h5>
              <p>{result.fix}</p>
              {result.estimatedCost && (
                <p><strong>Estimated Cost:</strong> £{result.estimatedCost}</p>
              )}
              {result.mechanicNeeded && (
                <button
                  onClick={() => router.push(`/marketplace/jobs/post?dtc=${result.code}&vehicle=${selectedVehicleId}`)}
                  style={styles.mechanicButton}
                >
                  Find a Mechanic
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: getThemeValue('spacing.10', '40px'),
    background: getThemeValue('colors.background.main', '#020617'),
    minHeight: '100vh',
    color: textPrimary,
    fontFamily: getThemeValue('fontFamilies.sans', 'Inter, sans-serif'),
  },
  title: {
    fontSize: getThemeValue('fontSizes.3xl', '32px'),
    fontWeight: getThemeValue('fontWeights.bold', '700'),
    marginBottom: getThemeValue('spacing.2', '8px'),
    background: getThemeValue('gradients.title', 'linear-gradient(135deg, #94a3b8, #f1f5f9)'),
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    color: textSecondary,
    marginBottom: getThemeValue('spacing.8', '32px'),
  },
  card: {
    background: bgCard,
    border: `1px solid ${borderLight}`,
    borderRadius: getThemeValue('borderRadius.xl', '16px'),
    padding: getThemeValue('spacing.6', '24px'),
    maxWidth: '600px',
  },
  cardTitle: {
    fontSize: getThemeValue('fontSizes.xl', '20px'),
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    marginBottom: getThemeValue('spacing.5', '20px'),
    color: textSecondary,
  },
  field: {
    marginBottom: getThemeValue('spacing.5', '20px'),
  },
  label: {
    display: 'block',
    fontSize: getThemeValue('fontSizes.sm', '14px'),
    fontWeight: getThemeValue('fontWeights.medium', '500'),
    color: textSecondary,
    marginBottom: getThemeValue('spacing.1', '6px'),
  },
  select: {
    width: '100%',
    background: bgElevated,
    border: `1px solid ${borderMedium}`,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: getThemeValue('spacing.3', '12px'),
    color: textPrimary,
    fontSize: getThemeValue('fontSizes.base', '16px'),
    outline: 'none',
    cursor: 'pointer',
  },
  inputGroup: {
    display: 'flex',
    gap: getThemeValue('spacing.2', '8px'),
  },
  input: {
    flex: 1,
    background: bgElevated,
    border: `1px solid ${borderMedium}`,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: getThemeValue('spacing.3', '12px'),
    color: textPrimary,
    fontSize: getThemeValue('fontSizes.base', '16px'),
    outline: 'none',
  },
  scanIconButton: {
    background: borderMedium,
    border: 'none',
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: `0 ${getThemeValue('spacing.3', '12px')}`,
    fontSize: '20px',
    cursor: 'pointer',
    color: textPrimary,
  },
  scanButton: {
    width: '100%',
    background: primaryColor,
    color: getThemeValue('colors.background.main', '#020617'),
    border: 'none',
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: getThemeValue('spacing.3', '12px'),
    fontSize: getThemeValue('fontSizes.base', '16px'),
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    cursor: 'pointer',
    marginBottom: getThemeValue('spacing.4', '16px'),
  },
  errorBox: {
    padding: getThemeValue('spacing.3', '12px'),
    background: `${errorColor}20`,
    border: `1px solid ${errorColor}`,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    color: errorColor,
  },
  resultCard: {
    marginTop: getThemeValue('spacing.4', '16px'),
    padding: getThemeValue('spacing.4', '16px'),
    background: bgElevated,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
  },
  resultCode: {
    fontSize: getThemeValue('fontSizes.2xl', '24px'),
    fontWeight: getThemeValue('fontWeights.bold', '700'),
    color: primaryColor,
    marginBottom: getThemeValue('spacing.2', '8px'),
  },
  resultDescription: {
    fontSize: getThemeValue('fontSizes.base', '16px'),
    marginBottom: getThemeValue('spacing.3', '12px'),
  },
  list: {
    listStyleType: 'disc',
    paddingLeft: getThemeValue('spacing.5', '20px'),
    marginBottom: getThemeValue('spacing.3', '12px'),
    color: textSecondary,
  },
  mechanicButton: {
    background: getThemeValue('colors.info', '#3b82f6'),
    color: '#fff',
    border: 'none',
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: getThemeValue('spacing.2', '10px'),
    width: '100%',
    marginTop: getThemeValue('spacing.3', '12px'),
    cursor: 'pointer',
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: textSecondary,
  },
  button: {
    marginTop: getThemeValue('spacing.4', '16px'),
    padding: `${getThemeValue('spacing.2', '8px')} ${getThemeValue('spacing.4', '16px')}`,
    background: primaryColor,
    border: 'none',
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    color: getThemeValue('colors.background.main', '#020617'),
    cursor: 'pointer',
  },
};
