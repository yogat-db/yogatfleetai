'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CarFront,
  Loader2,
  ScanLine,
  Search,
  Stethoscope,
  Wrench,
} from 'lucide-react';
import QrScanner from '@/components/QrScanner';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  year?: number | null;
  health_score?: number | null;
}

interface ScanResult {
  code: string;
  description: string;
  causes?: string[];
  fix: string;
  estimatedCost: number | null;
  mechanicNeeded: boolean;
}

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
const errorColor = getThemeValue('colors.status.critical', '#ef4444');
const warningColor = getThemeValue('colors.status.warning', '#f59e0b');
const infoColor = getThemeValue('colors.status.info', '#3b82f6');
const bgMain = getThemeValue('colors.background.main', '#020617');
const bgCard = getThemeValue('colors.background.card', '#0f172a');
const bgElevated = getThemeValue('colors.background.elevated', '#1e293b');
const borderLight = getThemeValue('colors.border.light', '#1e293b');
const borderMedium = getThemeValue('colors.border.medium', '#334155');
const textPrimary = getThemeValue('colors.text.primary', '#f1f5f9');
const textSecondary = getThemeValue('colors.text.secondary', '#94a3b8');

function normalizeDtcCode(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

function getHealthTone(score?: number | null) {
  if (typeof score !== 'number') {
    return {
      label: 'Unknown',
      color: textSecondary,
      bg: `${borderMedium}30`,
    };
  }

  if (score < 50) {
    return {
      label: 'At risk',
      color: errorColor,
      bg: `${errorColor}20`,
    };
  }

  if (score < 80) {
    return {
      label: 'Needs attention',
      color: warningColor,
      bg: `${warningColor}20`,
    };
  }

  return {
    label: 'Healthy',
    color: primaryColor,
    bg: `${primaryColor}20`,
  };
}

export default function DiagnosticsPage() {
  const router = useRouter();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [dtcCode, setDtcCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingVehicles, setFetchingVehicles] = useState(true);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId]
  );

  const selectedVehicleTone = getHealthTone(selectedVehicle?.health_score);

  useEffect(() => {
    void fetchVehicles();
  }, []);

  async function fetchVehicles() {
    try {
      setFetchingVehicles(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('vehicles')
        .select('id, license_plate, make, model, year, health_score')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const safeVehicles = (data ?? []) as Vehicle[];
      setVehicles(safeVehicles);

      if (safeVehicles.length > 0) {
        setSelectedVehicleId((current) => current || safeVehicles[0].id);
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Could not load your vehicles. Please try again.');
    } finally {
      setFetchingVehicles(false);
    }
  }

  async function handleScan() {
    const normalizedCode = normalizeDtcCode(dtcCode);

    if (!selectedVehicleId) {
      setError('Please select a vehicle first.');
      return;
    }

    if (!normalizedCode) {
      setError('Please enter a DTC code.');
      return;
    }

    if (normalizedCode.length < 4) {
      setError('Enter a valid diagnostic code, for example P0300.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/dtc/${encodeURIComponent(normalizedCode)}`);

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'DTC code not found');
      }

      setResult(data as ScanResult);
      setDtcCode(normalizedCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      setLoading(false);
    }
  }

  function handleQrScan(code: string) {
    const normalizedCode = normalizeDtcCode(code);
    setDtcCode(normalizedCode);
    setShowScanner(false);
    void handleDeferredScan(normalizedCode);
  }

  async function handleDeferredScan(nextCode: string) {
    if (!nextCode) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/dtc/${encodeURIComponent(nextCode)}`);
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'DTC code not found');
      }

      setResult(data as ScanResult);
      setDtcCode(nextCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      setLoading(false);
    }
  }

  function handleFindMechanic() {
    if (!result?.code || !selectedVehicleId) return;

    const params = new URLSearchParams({
      dtc: result.code,
      vehicle: selectedVehicleId,
    });

    router.push(`/marketplace/jobs/post?${params.toString()}`);
  }

  if (fetchingVehicles) {
    return (
      <div style={styles.centered}>
        <Loader2 size={36} className="spin" />
        <p style={styles.centerText}>Loading your vehicles...</p>
        <style>{`
          .spin {
            animation: spin 0.9s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (vehicles.length === 0 && !error) {
    return (
      <div style={styles.centered}>
        <CarFront size={36} color={textSecondary} />
        <p style={styles.centerText}>No vehicles found. Add a vehicle before running diagnostics.</p>
        <button onClick={() => router.push('/vehicles/add')} style={styles.button}>
          Add Vehicle
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <div style={styles.hero}>
        <h1 style={styles.title}>Diagnostics</h1>
        <p style={styles.subtitle}>
          Scan diagnostic trouble codes and turn faults into clear repair actions.
        </p>
      </div>

      <div style={styles.layout}>
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>
              <Stethoscope size={18} />
            </div>
            <div>
              <h3 style={styles.cardTitle}>Vehicle Scan</h3>
              <p style={styles.cardMeta}>Choose a vehicle and inspect a DTC fault code.</p>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Select vehicle</label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              style={styles.select}
              disabled={vehicles.length === 0}
            >
              <option value="" disabled>
                Select a vehicle
              </option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.make} {vehicle.model} ({vehicle.license_plate})
                </option>
              ))}
            </select>
          </div>

          {selectedVehicle && (
            <div style={styles.vehicleSummary}>
              <div style={styles.vehicleSummaryTop}>
                <div>
                  <div style={styles.vehicleTitle}>
                    {[selectedVehicle.make, selectedVehicle.model].filter(Boolean).join(' ')}
                  </div>
                  <div style={styles.vehicleSub}>
                    {selectedVehicle.license_plate}
                    {selectedVehicle.year ? ` • ${selectedVehicle.year}` : ''}
                  </div>
                </div>

                <div
                  style={{
                    ...styles.healthBadge,
                    background: selectedVehicleTone.bg,
                    color: selectedVehicleTone.color,
                  }}
                >
                  {typeof selectedVehicle.health_score === 'number'
                    ? `Health ${selectedVehicle.health_score}`
                    : 'Health unknown'}
                </div>
              </div>

              <div style={styles.healthHint}>
                Fleet status: {selectedVehicleTone.label}
              </div>
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>DTC fault code</label>
            <div style={styles.inputGroup}>
              <input
                type="text"
                value={dtcCode}
                onChange={(e) => setDtcCode(normalizeDtcCode(e.target.value))}
                placeholder="e.g. P0300"
                style={styles.input}
                disabled={loading}
                maxLength={10}
              />
              <button
                type="button"
                onClick={() => setShowScanner((value) => !value)}
                style={styles.scanIconButton}
                title="Scan QR code"
              >
                <ScanLine size={18} />
              </button>
            </div>
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

          <button
            type="button"
            onClick={handleScan}
            disabled={loading || !selectedVehicleId}
            style={{
              ...styles.scanButton,
              ...(loading || !selectedVehicleId ? styles.buttonDisabled : {}),
            }}
          >
            {loading ? 'Scanning...' : 'Run scan'}
          </button>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={styles.errorBox}
              >
                <AlertTriangle size={16} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{ ...styles.cardIcon, background: `${infoColor}20`, color: infoColor }}>
              <Search size={18} />
            </div>
            <div>
              <h3 style={styles.cardTitle}>Result</h3>
              <p style={styles.cardMeta}>Fault meaning, likely causes, and next action.</p>
            </div>
          </div>

          {!result && !loading ? (
            <div style={styles.emptyPanel}>
              <Wrench size={24} color={textSecondary} />
              <p style={styles.emptyText}>Run a diagnostic scan to see the fault analysis.</p>
            </div>
          ) : null}

          {loading ? (
            <div style={styles.emptyPanel}>
              <Loader2 size={24} className="spin" />
              <p style={styles.emptyText}>Analysing fault code...</p>
            </div>
          ) : null}

          <AnimatePresence>
            {result && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={styles.resultCard}
              >
                <h4 style={styles.resultCode}>{result.code}</h4>
                <p style={styles.resultDescription}>{result.description}</p>

                <h5 style={styles.resultHeading}>Possible causes</h5>
                <ul style={styles.list}>
                  {(result.causes ?? []).map((cause, i) => (
  <li key={i}>{cause}</li>
))}
                </ul>

                <h5 style={styles.resultHeading}>Suggested fix</h5>
                <p style={styles.resultParagraph}>{result.fix}</p>

                {typeof result.estimatedCost === 'number' && (
                  <p style={styles.resultParagraph}>
                    <strong>Estimated cost:</strong> £{result.estimatedCost}
                  </p>
                )}

                {result.mechanicNeeded && (
                  <button
                    type="button"
                    onClick={handleFindMechanic}
                    style={styles.mechanicButton}
                  >
                    Find a mechanic
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      <style>{`
        .spin {
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: getThemeValue('spacing.10', '40px'),
    background: bgMain,
    minHeight: '100vh',
    color: textPrimary,
    fontFamily: getThemeValue('fontFamilies.sans', 'Inter, sans-serif'),
  },
  hero: {
    marginBottom: getThemeValue('spacing.8', '32px'),
  },
  title: {
    fontSize: getThemeValue('fontSizes.3xl', '32px'),
    fontWeight: getThemeValue('fontWeights.bold', '700'),
    marginBottom: getThemeValue('spacing.2', '8px'),
    background: getThemeValue(
      'gradients.title',
      'linear-gradient(135deg, #94a3b8, #f1f5f9)'
    ),
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    color: textSecondary,
    maxWidth: '56ch',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: getThemeValue('spacing.6', '24px'),
    alignItems: 'start',
  },
  card: {
    background: bgCard,
    border: `1px solid ${borderLight}`,
    borderRadius: getThemeValue('borderRadius.xl', '16px'),
    padding: getThemeValue('spacing.6', '24px'),
  },
  cardHeader: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: getThemeValue('spacing.5', '20px'),
  },
  cardIcon: {
    width: 36,
    height: 36,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '10px',
    background: `${primaryColor}20`,
    color: primaryColor,
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: getThemeValue('fontSizes.xl', '20px'),
    fontWeight: getThemeValue('fontWeights.semibold', '600'),
    margin: 0,
    color: textPrimary,
  },
  cardMeta: {
    margin: '4px 0 0 0',
    color: textSecondary,
    fontSize: '14px',
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
  vehicleSummary: {
    marginBottom: getThemeValue('spacing.5', '20px'),
    background: `${bgElevated}`,
    border: `1px solid ${borderMedium}`,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: '14px 16px',
  },
  vehicleSummaryTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  vehicleTitle: {
    fontWeight: 700,
    fontSize: '15px',
    color: textPrimary,
  },
  vehicleSub: {
    color: textSecondary,
    fontSize: '13px',
    marginTop: '4px',
  },
  healthBadge: {
    padding: '6px 10px',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: '12px',
  },
  healthHint: {
    marginTop: '10px',
    color: textSecondary,
    fontSize: '13px',
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
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: bgElevated,
    border: `1px solid ${borderMedium}`,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    padding: `0 ${getThemeValue('spacing.3', '12px')}`,
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
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: getThemeValue('spacing.3', '12px'),
    background: `${errorColor}20`,
    border: `1px solid ${errorColor}`,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    color: errorColor,
  },
  emptyPanel: {
    minHeight: 220,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: textSecondary,
    textAlign: 'center',
  },
  emptyText: {
    margin: 0,
    color: textSecondary,
  },
  resultCard: {
    marginTop: getThemeValue('spacing.2', '8px'),
    padding: getThemeValue('spacing.4', '16px'),
    background: bgElevated,
    borderRadius: getThemeValue('borderRadius.lg', '8px'),
    border: `1px solid ${borderMedium}`,
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
    color: textPrimary,
  },
  resultHeading: {
    margin: '16px 0 8px 0',
    color: textPrimary,
    fontSize: '14px',
    fontWeight: 700,
  },
  resultParagraph: {
    margin: 0,
    color: textSecondary,
  },
  list: {
    listStyleType: 'disc',
    paddingLeft: getThemeValue('spacing.5', '20px'),
    marginBottom: getThemeValue('spacing.3', '12px'),
    color: textSecondary,
  },
  mechanicButton: {
    background: infoColor,
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
    gap: '12px',
    background: bgMain,
  },
  centerText: {
    margin: 0,
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
    fontWeight: 600,
  },
};