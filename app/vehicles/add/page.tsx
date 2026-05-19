'use client';

import { useState, useEffect, useCallback, useMemo, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Brain,
  CarFront,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Crosshair,
  Loader2,
  LocateFixed,
  MapPin,
  ScanSearch,
  Shield,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import toast from 'react-hot-toast';

type VehicleLookup = {
  make: string | null;
  model: string | null;
  yearOfManufacture: number | null;
  engineCapacity: number | null;
  fuelType: string | null;
  vin: string | null;
  registrationNumber?: string | null;
};

type DvlaResponse =
  | {
      success: true;
      error: null;
      data: VehicleLookup;
    }
  | {
      success: false;
      error: string;
      data: null;
    };

type Coords = {
  lat: number | null;
  lng: number | null;
};

type RiskLevel = 'low' | 'medium' | 'high';

type AiBrief = {
  score: number;
  summary: string;
  priorities: string[];
  nextAction: string;
  risk: RiskLevel;
};

function normalizePlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim();
}

function compactPlate(value: string) {
  return normalizePlate(value).replace(/\s+/g, '');
}

function isDvlaSuccess(body: DvlaResponse | null): body is Extract<DvlaResponse, { success: true }> {
  return !!body && body.success === true && !!body.data;
}

function safeText(value: string | number | null | undefined, fallback = 'Not available') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function formatEngineCapacity(value: number | null | undefined) {
  return typeof value === 'number' ? `${value.toLocaleString()} cc` : 'Not available';
}

function buildAiBrief(vehicle: VehicleLookup): AiBrief {
  const year = vehicle.yearOfManufacture;
  const currentYear = new Date().getFullYear();
  const age = typeof year === 'number' ? currentYear - year : null;
  const fuel = (vehicle.fuelType ?? '').toLowerCase();

  let score = 89;
  let risk: RiskLevel = 'low';
  const priorities: string[] = [];

  if (age === null) {
    score -= 6;
    risk = 'medium';
    priorities.push('Confirm history manually before relying on automated maintenance planning.');
  } else if (age >= 10) {
    score -= 16;
    risk = 'high';
    priorities.push('Schedule a full inspection before assigning regular operational use.');
    priorities.push('Review brake, suspension, corrosion, and MOT advisory history.');
  } else if (age >= 6) {
    score -= 8;
    risk = 'medium';
    priorities.push('Set a proactive maintenance baseline within the next 30 to 60 days.');
  } else {
    priorities.push('Capture a baseline check and set the first preventive service reminder.');
  }

  if (fuel.includes('diesel')) {
    score -= 4;
    if (risk === 'low') risk = 'medium';
    priorities.push('Monitor DPF and EGR suitability for short-trip usage.');
  }

  if (typeof vehicle.engineCapacity === 'number' && vehicle.engineCapacity >= 2500) {
    score -= 3;
    priorities.push('Track cooling and fluid service intervals closely.');
  }

  const make = safeText(vehicle.make, 'Unknown make');
  const model = safeText(vehicle.model, 'Unknown model');

  const summary =
    age === null
      ? `This ${make} ${model} needs a manual intake baseline before automated fleet planning begins.`
      : age >= 10
      ? `This ${year} ${make} ${model} should enter the fleet with a cautious maintenance profile.`
      : age >= 6
      ? `This ${year} ${make} ${model} looks suitable for standard use with a proactive service baseline.`
      : `This ${year} ${make} ${model} starts with a strong operational profile and low immediate risk.`;

  const nextAction =
    risk === 'high'
      ? 'Add the vehicle and create an inspection-first onboarding task.'
      : risk === 'medium'
      ? 'Add the vehicle and schedule a preventive review.'
      : 'Add the vehicle and set routine service reminders.';

  return {
    score: Math.max(60, Math.min(96, score)),
    summary,
    priorities: priorities.slice(0, 3),
    nextAction,
    risk,
  };
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metricCard}>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={styles.metricValue}>{value}</strong>
    </div>
  );
}

export default function AddVehiclePage() {
  const router = useRouter();

  const [plate, setPlate] = useState('');
  const [address, setAddress] = useState('');
  const [vehicleData, setVehicleData] = useState<VehicleLookup | null>(null);
  const [coords, setCoords] = useState<Coords>({ lat: null, lng: null });

  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const aiBrief = useMemo(
    () => (vehicleData ? buildAiBrief(vehicleData) : null),
    [vehicleData]
  );

  const checkFleetLimits = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const [vCount, profile] = await Promise.all([
      supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('profiles').select('has_multi_vehicle').eq('id', user.id).maybeSingle(),
    ]);

    const count = vCount.count ?? 0;
    const isPremium = profile.data?.has_multi_vehicle ?? false;

    if (count >= 1 && !isPremium) {
      setShowUpgrade(true);
    }
  }, [router]);

  useEffect(() => {
    void checkFleetLimits();
  }, [checkFleetLimits]);

  const fetchVehicleDetails = async () => {
    const registration = compactPlate(plate);

    if (!registration) {
      setError('Enter a registration number to continue.');
      return;
    }

    setFetching(true);
    setAiLoading(false);
    setVehicleData(null);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/dvla/${encodeURIComponent(registration)}`, {
        cache: 'no-store',
      });

      const body = (await res.json().catch(() => null)) as DvlaResponse | null;

      if (!res.ok || !isDvlaSuccess(body)) {
        throw new Error(body?.error || 'Vehicle not found in DVLA database');
      }

      setVehicleData(body.data);
      setPlate(registration);
      setAiLoading(true);

      window.setTimeout(() => {
        setAiLoading(false);
      }, 850);
    } catch (err) {
      console.error('DVLA lookup error:', err);
      setVehicleData(null);
      setAiLoading(false);
      setError(err instanceof Error ? err.message : 'Unable to fetch vehicle details');
    } finally {
      setFetching(false);
    }
  };

  const syncMOTData = async (vehicleId: string, reg: string) => {
    try {
      await fetch('/api/mot/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, registration: reg }),
      });
    } catch (err) {
      console.warn('MOT sync failed (non-critical):', err);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device.');
      return;
    }

    setDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });

        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const geoData = await geoRes.json();
          setAddress(geoData.display_name || `${latitude}, ${longitude}`);
        } catch {
          setAddress(`${latitude}, ${longitude}`);
        } finally {
          setDetectingLocation(false);
        }
      },
      (geoError) => {
        console.error(geoError);
        setError('Unable to get location. Please allow access and try again.');
        setDetectingLocation(false);
      }
    );
  };

  const handleUpgrade = async () => {
    setUpgradeLoading(true);

    try {
      const res = await fetch('/api/stripe/create-multi-vehicle-checkout', {
        method: 'POST',
      });
      const body = await res.json();

      if (body?.url) {
        window.location.href = body.url;
        return;
      }

      throw new Error('No checkout URL returned');
    } catch (err) {
      console.error('Upgrade error:', err);
      toast.error('Payment gateway error. Please try again.');
      setUpgradeLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleData) {
      setError('Run a registration lookup before adding the vehicle.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Session expired. Please log in again.');
      }

      const normalizedPlate = compactPlate(plate);

      const { data: newVehicle, error: insertError } = await supabase
        .from('vehicles')
        .insert({
          license_plate: normalizedPlate,
          make: vehicleData.make,
          model: vehicleData.model,
          year: vehicleData.yearOfManufacture,
          fuel_type: vehicleData.fuelType,
          engine_capacity: vehicleData.engineCapacity,
          vin: vehicleData.vin,
          user_id: user.id,
          status: 'active',
          health_score: aiBrief?.score ?? 85,
          lat: coords.lat,
          lng: coords.lng,
          address: address.trim() || null,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      if (newVehicle?.id) {
        void syncMOTData(newVehicle.id, normalizedPlate);
      }

      setSuccess(true);
      toast.success('Vehicle added successfully');

      window.setTimeout(() => {
        router.push('/fleet');
      }, 1200);
    } catch (err) {
      console.error('Add vehicle error:', err);
      const message =
        err instanceof Error ? err.message : 'Could not add vehicle. Please try again.';
      setError(message);
      toast.error(message);
      setLoading(false);
    }
  };

  if (showUpgrade) {
    return (
      <div style={styles.page}>
        <motion.section
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          style={styles.upgradeCard}
        >
          <div style={styles.upgradeIcon}>
            <Zap size={22} />
          </div>

          <div>
            <h1 style={styles.upgradeTitle}>Fleet limit reached</h1>
            <p style={styles.upgradeBody}>
              Your current tier supports one managed vehicle. Upgrade to unlock multi-vehicle
              operations, richer AI diagnostics, and broader fleet automation.
            </p>
          </div>

          <div style={styles.upgradeFeatureList}>
            <div style={styles.upgradeFeatureItem}>
              <CheckCircle2 size={14} />
              <span>Unlimited vehicles</span>
            </div>
            <div style={styles.upgradeFeatureItem}>
              <CheckCircle2 size={14} />
              <span>AI-led service prioritisation</span>
            </div>
            <div style={styles.upgradeFeatureItem}>
              <CheckCircle2 size={14} />
              <span>Smarter maintenance visibility</span>
            </div>
          </div>

          <div style={styles.upgradeActions}>
            <button type="button" onClick={handleUpgrade} disabled={upgradeLoading} style={styles.upgradeButton}>
              {upgradeLoading ? 'Redirecting…' : 'Upgrade fleet (£10)'}
            </button>
            <button type="button" onClick={() => router.push('/fleet')} style={styles.backButton}>
              Back to fleet
            </button>
          </div>
        </motion.section>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <main style={styles.container}>
        <header style={styles.header}>
          <div style={styles.heroBadge}>
            <Sparkles size={14} />
            <span>AI-assisted intake</span>
          </div>

          <h1 style={styles.title}>Add a vehicle with instant fleet context</h1>
          <p style={styles.subtitle}>
            Pull DVLA data, verify the vehicle profile, and create a cleaner operational baseline
            before the vehicle enters your fleet.
          </p>
        </header>

        <div style={styles.layout}>
          <section style={styles.card}>
            <div style={styles.sectionIntro}>
              <p style={styles.kicker}>Step 1</p>
              <h2 style={styles.sectionTitle}>Registration lookup</h2>
              <p style={styles.sectionBody}>
                Start with the registration number to build a verified vehicle profile.
              </p>
            </div>

            <div style={styles.lookupPanel}>
              <div style={styles.plateInputRow}>
                <div style={styles.plateWrapper}>
                  <div style={styles.ukPlateShell}>
                    <div style={styles.ukPlateMark}>UK</div>
                    <input
                      type="text"
                      value={plate}
                      onChange={(e) => setPlate(normalizePlate(e.target.value))}
                      placeholder="AB12 CDE"
                      style={styles.plateInput}
                      maxLength={8}
                      aria-label="Vehicle registration"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchVehicleDetails}
                  disabled={fetching || !plate.trim()}
                  style={styles.lookupBtn}
                >
                  {fetching ? <Loader2 className="spin" size={18} /> : <ScanSearch size={18} />}
                  <span>{fetching ? 'Checking…' : 'Lookup vehicle'}</span>
                </button>
              </div>

              <p style={styles.helperText}>
                We fetch core vehicle details first, then reveal the remaining intake steps.
              </p>
            </div>

            <AnimatePresence initial={false}>
              {error && (
                <motion.div
                  key="vehicle-error"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={styles.errorBox}
                >
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {vehicleData && (
                <motion.div
                  key="vehicle-data"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  style={styles.dataPreview}
                >
                  <div style={styles.previewHeader}>
                    <div style={styles.vehicleIcon}>
                      <CarFront size={20} />
                    </div>

                    <div>
                      <p style={styles.previewEyebrow}>Verified vehicle</p>
                      <h3 style={styles.previewTitle}>
                        {safeText(vehicleData.make, 'Unknown make')} {safeText(vehicleData.model, 'Unknown model')}
                      </h3>
                      <p style={styles.previewPlate}>{compactPlate(plate)}</p>
                    </div>
                  </div>

                  <div style={styles.previewGrid}>
                    <MetricCard
                      label="Year"
                      value={safeText(vehicleData.yearOfManufacture)}
                    />
                    <MetricCard
                      label="Fuel"
                      value={safeText(vehicleData.fuelType)}
                    />
                    <MetricCard
                      label="Engine"
                      value={formatEngineCapacity(vehicleData.engineCapacity)}
                    />
                    <MetricCard
                      label="VIN"
                      value={safeText(vehicleData.vin)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.sectionIntro}>
                <p style={styles.kicker}>Step 2</p>
                <h2 style={styles.sectionTitle}>Location and confirmation</h2>
                <p style={styles.sectionBody}>
                  Add a base location and confirm the vehicle enters the fleet with the right starting profile.
                </p>
              </div>

              <div style={styles.field}>
                <label style={styles.label} htmlFor="vehicle-location">
                  Base location
                </label>

                <div style={styles.locationRow}>
                  <input
                    id="vehicle-location"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Where is this vehicle usually kept?"
                    style={styles.formInput}
                  />
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={detectingLocation}
                    style={styles.locationBtn}
                    title="Use my current location"
                    aria-label="Use current location"
                  >
                    {detectingLocation ? (
                      <Loader2 size={18} className="spin" />
                    ) : (
                      <Crosshair size={18} />
                    )}
                  </button>
                </div>

                {coords.lat !== null && coords.lng !== null && (
                  <div style={styles.coordsHint}>
                    <LocateFixed size={12} />
                    <span>
                      {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </span>
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading || !vehicleData || success} style={styles.submitBtn}>
                {success ? (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Added to fleet</span>
                  </>
                ) : loading ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    <span>Saving vehicle…</span>
                  </>
                ) : (
                  <>
                    <span>Confirm and add to fleet</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </section>

          <aside style={styles.sidebar}>
            <section style={styles.aiCard}>
              <div style={styles.aiHeader}>
                <div style={styles.aiHeaderIcon}>
                  <Brain size={18} />
                </div>
                <div>
                  <p style={styles.aiEyebrow}>AI vehicle brief</p>
                  <h2 style={styles.aiTitle}>Operational readiness</h2>
                </div>
              </div>

              {aiLoading && (
                <div style={styles.aiPlaceholder}>
                  <Sparkles size={16} className="pulse" />
                  <span>Building a maintenance baseline and intake summary…</span>
                </div>
              )}

              {!vehicleData && !aiLoading && (
                <div style={styles.emptyState}>
                  <p style={styles.emptyTitle}>No vehicle loaded</p>
                  <p style={styles.emptyBody}>
                    Run a registration lookup to generate a readiness summary, health baseline,
                    and first-pass service guidance.
                  </p>
                </div>
              )}

              {vehicleData && aiBrief && !aiLoading && (
                <div style={styles.aiContent}>
                  <div style={styles.aiTopRow}>
                    <div style={styles.scoreCard}>
                      <span style={styles.scoreLabel}>Health baseline</span>
                      <strong style={styles.scoreValue}>{aiBrief.score}%</strong>
                    </div>

                    <div style={getRiskBadgeStyle(aiBrief.risk)}>
                      <Shield size={14} />
                      <span>{aiBrief.risk} risk</span>
                    </div>
                  </div>

                  <div style={styles.aiInsight}>
                    <Zap size={16} color={theme.colors.status.warning} />
                    <span>{aiBrief.summary}</span>
                  </div>

                  <div style={styles.prioritySection}>
                    <p style={styles.priorityLabel}>Priority actions</p>

                    <div style={styles.priorityList}>
                      {aiBrief.priorities.map((item) => (
                        <div key={item} style={styles.priorityItem}>
                          <ChevronRight size={14} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={styles.nextAction}>
                    <div style={styles.nextActionHeader}>
                      <Wrench size={15} />
                      <span>Recommended next step</span>
                    </div>
                    <p style={styles.nextActionText}>{aiBrief.nextAction}</p>
                  </div>
                </div>
              )}
            </section>

            <section style={styles.noteCard}>
              <div style={styles.noteHeader}>
                <MapPin size={16} />
                <h3 style={styles.noteTitle}>Why add a base location?</h3>
              </div>

              <p style={styles.noteText}>
                A clean location baseline helps with service logistics, roadside support,
                and usage-aware fleet decisions later on.
              </p>

              <div style={styles.noteHint}>
                <CircleAlert size={14} />
                <span>Location is optional, but useful for smarter operations.</span>
              </div>
            </section>
          </aside>
        </div>
      </main>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        .pulse { animation: pulse 1.6s ease-in-out infinite; }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0% { opacity: 0.55; }
          50% { opacity: 1; }
          100% { opacity: 0.55; }
        }

        @media (max-width: 980px) {
          .vehicle-onboarding-layout {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          .plate-input-row {
            flex-direction: column;
          }

          .lookup-button {
            width: 100%;
            justify-content: center;
          }

          .location-row {
            grid-template-columns: 1fr !important;
          }

          .location-button {
            width: 100%;
            height: 48px;
          }
        }
      `}</style>
    </div>
  );
}

function getRiskBadgeStyle(risk: RiskLevel): CSSProperties {
  const palette =
    risk === 'high'
      ? {
          bg: `${theme.colors.status.critical}12`,
          border: `${theme.colors.status.critical}25`,
          text: theme.colors.status.critical,
        }
      : risk === 'medium'
      ? {
          bg: `${theme.colors.status.warning}12`,
          border: `${theme.colors.status.warning}25`,
          text: theme.colors.status.warning,
        }
      : {
          bg: `${theme.colors.primary}12`,
          border: `${theme.colors.primary}25`,
          text: theme.colors.primary,
        };

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 12px',
    borderRadius: 999,
    border: `1px solid ${palette.border}`,
    background: palette.bg,
    color: palette.text,
    fontSize: 13,
    fontWeight: 700,
    textTransform: 'capitalize',
  };
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: '28px 16px 40px',
    background: `linear-gradient(180deg, ${theme.colors.background.main} 0%, ${theme.colors.background.subtle} 100%)`,
    color: theme.colors.text.primary,
  },
  container: {
    maxWidth: 1180,
    marginInline: 'auto',
  },
  header: {
    marginBottom: 24,
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 999,
    background: `${theme.colors.primary}12`,
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 14,
  },
  title: {
    fontSize: 'clamp(30px, 4vw, 42px)',
    lineHeight: 1.06,
    letterSpacing: '-0.05em',
    fontWeight: 750,
    maxWidth: 760,
  },
  subtitle: {
    marginTop: 12,
    color: theme.colors.text.secondary,
    fontSize: 16,
    lineHeight: 1.65,
    maxWidth: 760,
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.3fr) minmax(320px, 0.7fr)',
    gap: 20,
  },
  card: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: 24,
    padding: 22,
    boxShadow: '0 8px 30px rgba(15, 23, 42, 0.04)',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  sectionIntro: {
    marginBottom: 16,
  },
  kicker: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: theme.colors.text.muted,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 1.1,
    fontWeight: 650,
    letterSpacing: '-0.03em',
  },
  sectionBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 1.65,
    color: theme.colors.text.secondary,
    maxWidth: 620,
  },
  lookupPanel: {
    borderRadius: 20,
    padding: 16,
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.light}`,
  },
  plateInputRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'stretch',
    flexWrap: 'wrap',
  },
  plateWrapper: {
    flex: 1,
    minWidth: 220,
  },
  ukPlateShell: {
    display: 'grid',
    gridTemplateColumns: '56px 1fr',
    minHeight: 58,
    overflow: 'hidden',
    borderRadius: 16,
    border: '1px solid rgba(17, 24, 39, 0.14)',
    background: '#F8D94E',
  },
  ukPlateMark: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1747B5',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: '0.08em',
  },
  plateInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    padding: '0 18px',
    background: 'transparent',
    color: '#18181B',
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  lookupBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 58,
    padding: '0 18px',
    borderRadius: 16,
    border: 'none',
    background: theme.colors.primary,
    color: theme.colors.background.main,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  helperText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 1.55,
    color: theme.colors.text.muted,
  },
  errorBox: {
    marginTop: 12,
    padding: '12px 14px',
    borderRadius: 14,
    border: `1px solid ${theme.colors.status.critical}`,
    background: `${theme.colors.status.critical}10`,
    color: theme.colors.status.critical,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    lineHeight: 1.5,
  },
  dataPreview: {
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.background.main,
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  vehicleIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `${theme.colors.primary}12`,
    color: theme.colors.primary,
  },
  previewEyebrow: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: theme.colors.text.muted,
    marginBottom: 4,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: 650,
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
  },
  previewPlate: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: 600,
    color: theme.colors.text.secondary,
    letterSpacing: '0.08em',
  },
  previewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 10,
  },
  metricCard: {
    padding: 12,
    borderRadius: 14,
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 700,
  },
  metricValue: {
    fontSize: 14,
    lineHeight: 1.45,
    color: theme.colors.text.primary,
    overflowWrap: 'anywhere',
  },
  form: {
    marginTop: 22,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: theme.colors.text.secondary,
  },
  locationRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 48px',
    gap: 10,
    alignItems: 'center',
  },
  formInput: {
    width: '100%',
    minHeight: 48,
    padding: '0 14px',
    borderRadius: 14,
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.background.card,
    color: theme.colors.text.primary,
    fontSize: 14,
    outline: 'none',
  },
  locationBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    border: `1px solid ${theme.colors.border.medium}`,
    background: theme.colors.background.subtle,
    color: theme.colors.text.secondary,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  coordsHint: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: theme.colors.text.muted,
  },
  submitBtn: {
    width: '100%',
    minHeight: 52,
    marginTop: 4,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '0 18px',
    borderRadius: 16,
    border: 'none',
    background: theme.colors.primary,
    color: theme.colors.background.main,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  aiCard: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: 24,
    padding: 18,
    boxShadow: '0 8px 30px rgba(15, 23, 42, 0.04)',
  },
  aiHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  aiHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `${theme.colors.primary}12`,
    color: theme.colors.primary,
  },
  aiEyebrow: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: theme.colors.text.muted,
    marginBottom: 4,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: 650,
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
  },
  aiPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  emptyState: {
    paddingTop: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 650,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 1.65,
    color: theme.colors.text.secondary,
  },
  aiContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  aiTopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  scoreCard: {
    flex: '1 1 180px',
    padding: 14,
    borderRadius: 16,
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  scoreLabel: {
    fontSize: 12,
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 700,
  },
  scoreValue: {
    fontSize: 28,
    lineHeight: 1,
    letterSpacing: '-0.04em',
    fontWeight: 750,
  },
  aiInsight: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    border: '1px solid rgba(245, 158, 11, 0.22)',
    background: 'rgba(245, 158, 11, 0.07)',
    fontSize: 14,
    lineHeight: 1.6,
    color: theme.colors.text.primary,
  },
  prioritySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  priorityLabel: {
    fontSize: 12,
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 700,
  },
  priorityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  priorityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    fontSize: 14,
    lineHeight: 1.55,
    color: theme.colors.text.primary,
  },
  nextAction: {
    padding: 14,
    borderRadius: 16,
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.light}`,
  },
  nextActionHeader: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
    fontSize: 12,
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 700,
  },
  nextActionText: {
    fontSize: 14,
    lineHeight: 1.6,
    color: theme.colors.text.primary,
  },
  noteCard: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: 24,
    padding: 18,
  },
  noteHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    color: theme.colors.text.primary,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 650,
    letterSpacing: '-0.02em',
  },
  noteText: {
    fontSize: 14,
    lineHeight: 1.65,
    color: theme.colors.text.secondary,
  },
  noteHint: {
    marginTop: 12,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    fontSize: 13,
    lineHeight: 1.55,
    color: theme.colors.text.muted,
  },
  upgradeCard: {
    maxWidth: 560,
    margin: '72px auto 0',
    padding: 26,
    borderRadius: 24,
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.background.card,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
  },
  upgradeIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `${theme.colors.primary}12`,
    color: theme.colors.primary,
  },
  upgradeTitle: {
    fontSize: 24,
    lineHeight: 1.1,
    fontWeight: 700,
    letterSpacing: '-0.04em',
  },
  upgradeBody: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 1.65,
    color: theme.colors.text.secondary,
  },
  upgradeFeatureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '6px 0',
  },
  upgradeFeatureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  upgradeActions: {
    marginTop: 4,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  upgradeButton: {
    minHeight: 50,
    padding: '0 16px',
    borderRadius: 16,
    border: 'none',
    background: theme.colors.primary,
    color: theme.colors.background.main,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  backButton: {
    minHeight: 46,
    padding: '0 16px',
    borderRadius: 16,
    border: `1px solid ${theme.colors.border.light}`,
    background: 'transparent',
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
};