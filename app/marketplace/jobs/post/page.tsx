'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Briefcase,
  CalendarClock,
  Car,
  ChevronDown,
  Crosshair,
  Loader2,
  MapPin,
  PoundSterling,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import toast from 'react-hot-toast';

type Vehicle = {
  id: string;
  make: string | null;
  model: string | null;
  license_plate: string | null;
};

type Coords = {
  lat: number | null;
  lng: number | null;
};

const JOB_TEMPLATES = {
  'Engine & Mechanical': [
    'Engine diagnostic scan',
    'Oil leak repair',
    'Timing belt replacement',
    'Engine overheating diagnosis',
    'Starter motor replacement',
  ],
  'Brakes & Suspension': [
    'Brake pad replacement',
    'Brake disc replacement',
    'Suspension noise diagnosis',
    'Shock absorber replacement',
    'Wheel bearing inspection',
  ],
  'Electrical & Electronics': [
    'Battery drain diagnosis',
    'Alternator replacement',
    'Dashboard warning light diagnosis',
    'Lighting fault repair',
    'Window or lock electrical fault',
  ],
  'Transmission & Drivetrain': [
    'Clutch replacement',
    'Gear selection diagnosis',
    'Driveshaft inspection',
    'Transmission fluid service',
    'Differential noise diagnosis',
  ],
  'Exhaust & Emissions': [
    'Exhaust leak repair',
    'DPF issue diagnosis',
    'Catalytic converter inspection',
    'Emissions fault diagnosis',
    'Lambda sensor replacement',
  ],
  'Heating & Cooling': [
    'Radiator replacement',
    'Coolant leak diagnosis',
    'Heater not working',
    'Air conditioning regas',
    'Thermostat replacement',
  ],
  'Bodywork & Paint': [
    'Scratch and paint repair',
    'Dent repair',
    'Bumper repair',
    'Panel alignment correction',
    'Rust assessment',
  ],
  'Tyres & Wheels': [
    'Tyre replacement',
    'Wheel alignment check',
    'Puncture repair',
    'Balancing vibration diagnosis',
    'Wheel damage inspection',
  ],
  'Diagnostic only': [
    'General diagnostic inspection',
    'Pre-purchase inspection',
    'Intermittent fault diagnosis',
    'Warning light scan',
    'No-start diagnosis',
  ],
  Other: [
    'Custom repair request',
    'General service support',
    'Unknown issue inspection',
  ],
} as const;

type JobCategory = keyof typeof JOB_TEMPLATES;

const URGENCY_OPTIONS = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'week', label: 'Within a week' },
  { value: 'month', label: 'Within a month' },
  { value: 'flexible', label: 'Flexible' },
] as const;

type Urgency = (typeof URGENCY_OPTIONS)[number]['value'];

type InsertedJobId = {
  id: string;
};

function getUrgencyHint(urgency: Urgency) {
  switch (urgency) {
    case 'immediate':
      return 'Needs attention as soon as possible.';
    case 'week':
      return 'Suitable for short-term scheduling.';
    case 'month':
      return 'Can be scheduled in the near future.';
    default:
      return 'Flexible timing helps attract more mechanics.';
  }
}

function parseBudget(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

async function resolveInsertedJobId(userId: string, insertedId?: string | null) {
  if (insertedId) return insertedId;

  const { data: latestJob, error: latestError } = await supabase
    .from('jobs')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<InsertedJobId>();

  if (latestError) throw latestError;
  return latestJob?.id ?? null;
}

export default function PostJobPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [vehicleId, setVehicleId] = useState('');
  const [category, setCategory] = useState<JobCategory>('Engine & Mechanical');
  const [service, setService] = useState<string>(JOB_TEMPLATES['Engine & Mechanical'][0]);
  const [customDetail, setCustomDetail] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('week');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<Coords>({ lat: null, lng: null });

  useEffect(() => {
    setService(JOB_TEMPLATES[category][0]);
  }, [category]);

  const generatedTitle = useMemo(() => {
    const detail = normalizeText(customDetail);
    return `[${category}] ${service}${detail ? ` - ${detail}` : ''}`;
  }, [category, service, customDetail]);

  const selectedVehicle = useMemo(() => {
    return vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null;
  }, [vehicleId, vehicles]);

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, make, model, license_plate')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (vehicleError) throw vehicleError;

      const list = (data ?? []) as Vehicle[];
      setVehicles(list);

      if (list.length > 0) {
        setVehicleId((current) => current || list[0].id);
      }
    } catch (err) {
      console.error('Fetch vehicles error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchVehicles();
  }, [fetchVehicles]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported on this device');
      return;
    }

    setDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setCoords({ lat, lng });

        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
              headers: { Accept: 'application/json' },
            }
          );

          if (!geoRes.ok) {
            throw new Error('Reverse geocoding failed');
          }

          const geoData = await geoRes.json();
          setLocation(geoData.display_name || `${lat}, ${lng}`);
          toast.success('Location detected');
        } catch (reverseError) {
          console.error('Reverse geocoding failed:', reverseError);
          setLocation(`${lat}, ${lng}`);
          toast.success('Coordinates added');
        } finally {
          setDetectingLocation(false);
        }
      },
      (geoError) => {
        console.error(geoError);
        setDetectingLocation(false);
        toast.error('Unable to detect location');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!vehicleId) {
      toast.error('Please select a vehicle');
      return;
    }

    const cleanedDescription = normalizeText(description);
    if (!cleanedDescription) {
      toast.error('Please add a description');
      return;
    }

    const parsedBudget = parseBudget(budget);

    if (budget.trim() && parsedBudget === null) {
      toast.error('Please enter a valid budget');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        router.push('/login');
        return;
      }

      const payload = {
        title: generatedTitle,
        description: cleanedDescription,
        budget: parsedBudget,
        status: 'open',
        location: normalizeText(location) || null,
        user_id: user.id,
        vehicle_id: vehicleId,
        urgency,
        category,
        lat: coords.lat,
        lng: coords.lng,
      };

      const { data: insertedRow, error: insertError } = await supabase
        .from('jobs')
        .insert(payload)
        .select('id')
        .single<InsertedJobId>();

      if (insertError) throw insertError;

      const jobId = await resolveInsertedJobId(user.id, insertedRow?.id ?? null);

      if (!jobId) {
        throw new Error(
          'Job was created, but no job id could be retrieved. Check your jobs table select policy.'
        );
      }

      toast.success('Job posted successfully');
      router.push(`/marketplace/jobs/${jobId}`);
    } catch (err) {
      console.error('Post job error:', err);
      const message = err instanceof Error ? err.message : 'Could not post job';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.centered}>
        <Loader2 size={30} className="spin" />
        <p style={styles.centerText}>Loading job form…</p>
        <style>{spinCss + responsiveCss}</style>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div style={styles.centered}>
        <div style={styles.emptyCard}>
          <Car size={34} color={theme.colors.primary} />
          <h2 style={styles.emptyTitle}>Add a vehicle first</h2>
          <p style={styles.emptyBody}>
            A job needs to be attached to a vehicle before mechanics can review it.
          </p>
          <button
            type="button"
            onClick={() => router.push('/fleet')}
            style={styles.primaryButton}
          >
            Go to fleet
          </button>
        </div>
        <style>{spinCss + responsiveCss}</style>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{spinCss + responsiveCss}</style>

      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.kicker}>
            <Sparkles size={14} />
            Guided job posting
          </div>

          <h1 style={styles.title}>Post a repair job</h1>

          <p style={styles.subtitle}>
            Build a clear request with structured dropdowns, a generated title preview,
            and optional location detection for faster, higher-quality mechanic responses.
          </p>
        </header>

        <div className="post-job-layout" style={styles.layout}>
          <form onSubmit={handleSubmit} style={styles.formCard}>
            <section style={styles.section}>
              <div style={styles.sectionHeading}>
                <Briefcase size={18} color={theme.colors.primary} />
                <h2 style={styles.sectionTitle}>Job setup</h2>
              </div>

              <div className="post-job-grid" style={styles.fieldGrid}>
                <div style={styles.fieldFull}>
                  <label style={styles.label} htmlFor="vehicle">
                    Vehicle
                  </label>
                  <div style={styles.selectWrap}>
                    <select
                      id="vehicle"
                      value={vehicleId}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        setVehicleId(e.currentTarget.value)
                      }
                      style={styles.select}
                    >
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {[vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle'}
                          {vehicle.license_plate ? ` (${vehicle.license_plate})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} style={styles.selectIcon} />
                  </div>
                </div>

                <div style={styles.field}>
                  <label style={styles.label} htmlFor="category">
                    Category
                  </label>
                  <div style={styles.selectWrap}>
                    <select
                      id="category"
                      value={category}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        setCategory(e.currentTarget.value as JobCategory)
                      }
                      style={styles.select}
                    >
                      {Object.keys(JOB_TEMPLATES).map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} style={styles.selectIcon} />
                  </div>
                </div>

                <div style={styles.field}>
                  <label style={styles.label} htmlFor="service">
                    Service type
                  </label>
                  <div style={styles.selectWrap}>
                    <select
                      id="service"
                      value={service}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        setService(e.currentTarget.value)
                      }
                      style={styles.select}
                    >
                      {JOB_TEMPLATES[category].map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} style={styles.selectIcon} />
                  </div>
                </div>

                <div style={styles.fieldFull}>
                  <label style={styles.label} htmlFor="custom-detail">
                    Short detail
                  </label>
                  <input
                    id="custom-detail"
                    value={customDetail}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setCustomDetail(e.currentTarget.value)
                    }
                    placeholder="Example: front left, intermittent issue, cold start only"
                    style={styles.input}
                    maxLength={60}
                  />
                </div>

                <div style={styles.fieldFull}>
                  <label style={styles.label}>Generated title</label>
                  <div style={styles.titlePreview}>
                    <Wrench size={15} color={theme.colors.primary} />
                    <span>{generatedTitle}</span>
                  </div>
                </div>
              </div>
            </section>

            <section style={styles.section}>
              <div style={styles.sectionHeading}>
                <CalendarClock size={18} color={theme.colors.primary} />
                <h2 style={styles.sectionTitle}>Timing and budget</h2>
              </div>

              <div className="post-job-grid" style={styles.fieldGrid}>
                <div style={styles.field}>
                  <label style={styles.label} htmlFor="urgency">
                    Urgency
                  </label>
                  <div style={styles.selectWrap}>
                    <select
                      id="urgency"
                      value={urgency}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        setUrgency(e.currentTarget.value as Urgency)
                      }
                      style={styles.select}
                    >
                      {URGENCY_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} style={styles.selectIcon} />
                  </div>
                  <p style={styles.helper}>{getUrgencyHint(urgency)}</p>
                </div>

                <div style={styles.field}>
                  <label style={styles.label} htmlFor="budget">
                    Budget (£)
                  </label>
                  <div style={styles.moneyInputWrap}>
                    <PoundSterling size={16} color={theme.colors.text.muted} />
                    <input
                      id="budget"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="10"
                      value={budget}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setBudget(e.currentTarget.value)
                      }
                      placeholder="Optional"
                      style={styles.moneyInput}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section style={styles.section}>
              <div style={styles.sectionHeading}>
                <MapPin size={18} color={theme.colors.primary} />
                <h2 style={styles.sectionTitle}>Location and description</h2>
              </div>

              <div className="post-job-grid" style={styles.fieldGrid}>
                <div style={styles.fieldFull}>
                  <label style={styles.label} htmlFor="location">
                    Job location
                  </label>

                  <div className="location-row" style={styles.locationRow}>
                    <input
                      id="location"
                      value={location}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setLocation(e.currentTarget.value)
                      }
                      placeholder="Enter address or use current location"
                      style={styles.input}
                    />

                    <button
                      type="button"
                      onClick={detectLocation}
                      disabled={detectingLocation}
                      style={styles.locationButton}
                      aria-label="Use current location"
                      title="Use current location"
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
                      <MapPin size={12} />
                      <span>
                        {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                      </span>
                    </div>
                  )}
                </div>

                <div style={styles.fieldFull}>
                  <label style={styles.label} htmlFor="description">
                    Describe the issue
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                      setDescription(e.currentTarget.value)
                    }
                    placeholder="Explain symptoms, when it happens, any noises, warning lights, previous repairs, and anything else a mechanic should know."
                    style={styles.textarea}
                    rows={6}
                  />
                  <p style={styles.helper}>
                    Clear descriptions improve quote quality and reduce back-and-forth.
                  </p>
                </div>
              </div>
            </section>

            <AnimateError error={error} />

            <div style={styles.actionRow}>
              <button
                type="button"
                onClick={() => router.push('/marketplace/jobs')}
                style={styles.secondaryButton}
              >
                Cancel
              </button>

              <button type="submit" disabled={submitting} style={styles.primaryButton}>
                {submitting ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    Posting…
                  </>
                ) : (
                  'Post job'
                )}
              </button>
            </div>
          </form>

          <aside style={styles.sideCard}>
            <div style={styles.sideCardHeader}>
              <Sparkles size={16} color={theme.colors.primary} />
              <h3 style={styles.sideTitle}>Job preview</h3>
            </div>

            <div style={styles.previewCard}>
              <div style={styles.previewBadge}>{category}</div>
              <h4 style={styles.previewTitle}>{generatedTitle}</h4>

              <div style={styles.previewMeta}>
                <span style={styles.previewMetaItem}>
                  <Car size={13} />
                  {selectedVehicle
                    ? `${[selectedVehicle.make, selectedVehicle.model].filter(Boolean).join(' ') || 'Vehicle'}${selectedVehicle.license_plate ? ` (${selectedVehicle.license_plate})` : ''}`
                    : 'No vehicle selected'}
                </span>

                <span style={styles.previewMetaItem}>
                  <CalendarClock size={13} />
                  {URGENCY_OPTIONS.find((item) => item.value === urgency)?.label}
                </span>

                <span style={styles.previewMetaItem}>
                  <PoundSterling size={13} />
                  {budget.trim() ? `Up to £${budget}` : 'Budget not specified'}
                </span>

                <span style={styles.previewMetaItem}>
                  <MapPin size={13} />
                  {location || 'Location not added yet'}
                </span>
              </div>

              <p style={styles.previewDescription}>
                {description.trim() || 'Your full description will appear here once added.'}
              </p>
            </div>

            <div style={styles.tipCard}>
              <p style={styles.tipTitle}>Tips for better mechanic responses</p>
              <ul style={styles.tipList}>
                <li>Choose the closest matching service from the dropdown.</li>
                <li>Add one short detail instead of rewriting the whole title.</li>
                <li>Use location detection, then edit the address if needed.</li>
                <li>Mention symptoms, timing, noises, smells, and warning lights.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function AnimateError({ error }: { error: string | null }) {
  if (!error) return null;

  return (
    <div style={styles.errorBox} role="alert" aria-live="polite">
      <AlertCircle size={16} />
      <span>{error}</span>
    </div>
  );
}

const spinCss = `
  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const responsiveCss = `
  @media (max-width: 980px) {
    .post-job-layout {
      grid-template-columns: 1fr !important;
    }
  }

  @media (max-width: 640px) {
    .post-job-grid {
      grid-template-columns: 1fr !important;
    }

    .location-row {
      grid-template-columns: 1fr 48px !important;
    }
  }
`;

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: theme.colors.background.main,
    padding: 'clamp(16px, 3vw, 32px)',
    color: theme.colors.text.primary,
  },
  container: {
    maxWidth: 1180,
    marginInline: 'auto',
  },
  header: {
    marginBottom: 24,
  },
  kicker: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 999,
    background: `${theme.colors.primary}14`,
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 14,
  },
  title: {
    margin: 0,
    fontSize: 'clamp(28px, 5vw, 40px)',
    lineHeight: 1.05,
    fontWeight: 800,
    letterSpacing: '-0.04em',
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 1.65,
    color: theme.colors.text.secondary,
    maxWidth: 760,
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(300px, 0.8fr)',
    gap: 20,
  },
  formCard: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: 24,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  sideCard: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: 24,
    padding: 18,
    height: 'fit-content',
    position: 'sticky',
    top: 20,
  },
  sideCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sideTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
  },
  previewCard: {
    borderRadius: 20,
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.light}`,
    padding: 16,
  },
  previewBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    background: `${theme.colors.primary}16`,
    color: theme.colors.primary,
    marginBottom: 10,
  },
  previewTitle: {
    margin: 0,
    fontSize: 20,
    lineHeight: 1.25,
    fontWeight: 750,
    color: theme.colors.text.primary,
  },
  previewMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 14,
    marginBottom: 14,
  },
  previewMetaItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: theme.colors.text.secondary,
    flexWrap: 'wrap',
  },
  previewDescription: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.65,
    color: theme.colors.text.secondary,
  },
  tipCard: {
    marginTop: 14,
    borderRadius: 18,
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.light}`,
    padding: 14,
  },
  tipTitle: {
    margin: '0 0 10px',
    fontSize: 13,
    fontWeight: 700,
    color: theme.colors.text.primary,
  },
  tipList: {
    margin: 0,
    paddingLeft: 18,
    color: theme.colors.text.secondary,
    fontSize: 13,
    lineHeight: 1.7,
  },
  section: {
    borderRadius: 18,
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.light}`,
    padding: 16,
  },
  sectionHeading: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    color: theme.colors.text.primary,
  },
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 14,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  fieldFull: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: theme.colors.text.secondary,
  },
  helper: {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.55,
    color: theme.colors.text.muted,
  },
  selectWrap: {
    position: 'relative',
  },
  select: {
    width: '100%',
    minHeight: 48,
    appearance: 'none',
    WebkitAppearance: 'none',
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: 14,
    padding: '0 40px 0 14px',
    color: theme.colors.text.primary,
    fontSize: 14,
    outline: 'none',
  },
  selectIcon: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    color: theme.colors.text.muted,
  },
  input: {
    width: '100%',
    minHeight: 48,
    borderRadius: 14,
    border: `1px solid ${theme.colors.border.medium}`,
    background: theme.colors.background.card,
    color: theme.colors.text.primary,
    padding: '0 14px',
    fontSize: 14,
    outline: 'none',
  },
  moneyInputWrap: {
    minHeight: 48,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    border: `1px solid ${theme.colors.border.medium}`,
    background: theme.colors.background.card,
    padding: '0 14px',
  },
  moneyInput: {
    flex: 1,
    minHeight: 46,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: theme.colors.text.primary,
    fontSize: 14,
  },
  titlePreview: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 14,
    background: `${theme.colors.primary}10`,
    border: `1px solid ${theme.colors.primary}22`,
    color: theme.colors.text.primary,
    fontSize: 14,
    lineHeight: 1.5,
    flexWrap: 'wrap',
  },
  locationRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 48px',
    gap: 10,
    alignItems: 'center',
  },
  locationButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    border: `1px solid ${theme.colors.border.medium}`,
    background: theme.colors.background.card,
    color: theme.colors.text.primary,
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
  textarea: {
    width: '100%',
    borderRadius: 14,
    border: `1px solid ${theme.colors.border.medium}`,
    background: theme.colors.background.card,
    color: theme.colors.text.primary,
    padding: '14px',
    fontSize: 14,
    lineHeight: 1.6,
    outline: 'none',
    resize: 'vertical',
    minHeight: 140,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid rgba(239, 68, 68, 0.45)',
    background: 'rgba(239, 68, 68, 0.08)',
    color: '#f87171',
    fontSize: 13,
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  primaryButton: {
    minHeight: 48,
    padding: '0 16px',
    border: 'none',
    borderRadius: 14,
    background: theme.colors.primary,
    color: '#020617',
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButton: {
    minHeight: 48,
    padding: '0 16px',
    borderRadius: 14,
    background: 'transparent',
    border: `1px solid ${theme.colors.border.light}`,
    color: theme.colors.text.primary,
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    background: theme.colors.background.main,
  },
  centerText: {
    color: theme.colors.text.secondary,
  },
  emptyCard: {
    width: 'min(460px, 100%)',
    borderRadius: 24,
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    textAlign: 'center',
  },
  emptyTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
    color: theme.colors.text.primary,
  },
  emptyBody: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
};