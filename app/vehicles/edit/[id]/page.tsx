'use client';

import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CarFront,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  RefreshCw,
  Save,
  Shield,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

type VehicleRecord = {
  id: string;
  license_plate: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  mileage: number | null;
  status: string | null;
  image_url: string | null;
};

type WrappedVehicleResponse = {
  success?: boolean;
  error?: string | null;
  data?: VehicleRecord | null;
};

type DvlaVehicle = {
  make: string | null;
  model: string | null;
  yearOfManufacture: number | null;
  fuelType?: string | null;
  engineCapacity?: number | null;
  vin?: string | null;
  registrationNumber?: string | null;
};

type WrappedDvlaResponse = {
  success?: boolean;
  error?: string | null;
  data?: DvlaVehicle | null;
};

type FormState = {
  license_plate: string;
  make: string;
  model: string;
  year: string;
  mileage: string;
  status: string;
};

type RiskLevel = 'low' | 'medium' | 'high';

function normalizePlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim();
}

function compactPlate(value: string) {
  return normalizePlate(value).replace(/\s+/g, '');
}

function displayValue(value: string | number | null | undefined, fallback = 'Not available') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function extractVehicleRecord(body: unknown): VehicleRecord | null {
  if (!body || typeof body !== 'object') return null;

  const maybeWrapped = body as WrappedVehicleResponse;
  if (maybeWrapped.data && typeof maybeWrapped.data === 'object') {
    return maybeWrapped.data;
  }

  const raw = body as VehicleRecord;
  if ('id' in raw || 'license_plate' in raw) {
    return raw;
  }

  return null;
}

function extractDvlaRecord(body: unknown): DvlaVehicle | null {
  if (!body || typeof body !== 'object') return null;

  const maybeWrapped = body as WrappedDvlaResponse;
  if (maybeWrapped.data && typeof maybeWrapped.data === 'object') {
    return maybeWrapped.data;
  }

  const raw = body as DvlaVehicle;
  if ('make' in raw || 'model' in raw || 'yearOfManufacture' in raw) {
    return raw;
  }

  return null;
}

function getApiError(body: unknown, fallback: string) {
  if (body && typeof body === 'object' && 'error' in body) {
    const errorValue = (body as { error?: unknown }).error;
    if (typeof errorValue === 'string' && errorValue.trim()) {
      return errorValue;
    }
  }
  return fallback;
}

function buildInsight(form: FormState): { score: number; risk: RiskLevel; summary: string } {
  const year = Number(form.year);
  const mileage = Number(form.mileage);
  const validYear = Number.isFinite(year) ? year : null;
  const validMileage = Number.isFinite(mileage) ? mileage : null;
  const age = validYear ? new Date().getFullYear() - validYear : null;

  let score = 90;
  let risk: RiskLevel = 'low';

  if (age !== null && age >= 10) {
    score -= 16;
    risk = 'high';
  } else if (age !== null && age >= 6) {
    score -= 8;
    risk = 'medium';
  }

  if (validMileage !== null && validMileage >= 120000) {
    score -= 8;
    risk = risk === 'low' ? 'medium' : risk;
  } else if (validMileage !== null && validMileage >= 80000) {
    score -= 4;
  }

  const summary =
    risk === 'high'
      ? 'This vehicle should stay on a tighter maintenance and inspection cadence.'
      : risk === 'medium'
      ? 'This vehicle looks fine for regular use with a proactive maintenance baseline.'
      : 'This vehicle profile looks stable for routine fleet operation.';

  return {
    score: Math.max(60, Math.min(96, score)),
    risk,
    summary,
  };
}

function getRiskBadgeStyle(risk: RiskLevel): CSSProperties {
  if (risk === 'high') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '10px 12px',
      borderRadius: 999,
      border: `1px solid ${theme.colors.status.critical}25`,
      background: `${theme.colors.status.critical}12`,
      color: theme.colors.status.critical,
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'capitalize',
    };
  }

  if (risk === 'medium') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '10px 12px',
      borderRadius: 999,
      border: `1px solid ${theme.colors.status.warning}25`,
      background: `${theme.colors.status.warning}12`,
      color: theme.colors.status.warning,
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'capitalize',
    };
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 12px',
    borderRadius: 999,
    border: `1px solid ${theme.colors.primary}25`,
    background: `${theme.colors.primary}12`,
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: 700,
    textTransform: 'capitalize',
  };
}

export default function EditVehiclePage() {
  const params = useParams();
  const router = useRouter();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<FormState>({
    license_plate: '',
    make: '',
    model: '',
    year: '',
    mileage: '',
    status: 'active',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const insight = useMemo(() => buildInsight(formData), [formData]);

  const fetchVehicle = useCallback(async () => {
    if (!id) {
      setError('Vehicle id is missing');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/vehicles/${encodeURIComponent(id)}`, {
        cache: 'no-store',
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(body, 'Vehicle record could not be loaded'));
      }

      const data = extractVehicleRecord(body);

      if (!data) {
        throw new Error('Vehicle record could not be loaded');
      }

      setFormData({
        license_plate: data.license_plate ?? '',
        make: data.make ?? '',
        model: data.model ?? '',
        year: data.year ? String(data.year) : '',
        mileage: data.mileage?.toString() ?? '',
        status: data.status ?? 'active',
      });

      setExistingImageUrl(data.image_url ?? null);
    } catch (err) {
      console.error('Fetch vehicle error:', err);
      setError(err instanceof Error ? err.message : 'Unable to load vehicle details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchVehicle();
  }, [fetchVehicle]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleLookup = async () => {
    const plate = compactPlate(formData.license_plate);

    if (!plate) {
      setError('Enter a registration number');
      return;
    }

    setLookupLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/dvla/${encodeURIComponent(plate)}`, {
        cache: 'no-store',
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(body, 'DVLA record not found for this plate'));
      }

      const data = extractDvlaRecord(body);

      if (!data) {
        throw new Error('DVLA record not found for this plate');
      }

      setFormData((prev) => ({
        ...prev,
        license_plate: plate,
        make: data.make ?? prev.make,
        model: data.model ?? prev.model,
        year:
          typeof data.yearOfManufacture === 'number'
            ? String(data.yearOfManufacture)
            : prev.year,
      }));
    } catch (err) {
      console.error('DVLA lookup error:', err);
      setError(err instanceof Error ? err.message : 'DVLA lookup failed');
    } finally {
      setLookupLoading(false);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return existingImageUrl;

    if (!id) {
      throw new Error('Vehicle id is missing');
    }

    const fileExt = imageFile.name.split('.').pop() ?? 'jpg';
    const filePath = `vehicles/${id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('vehicle-images')
      .upload(filePath, imageFile, { upsert: true });

    if (uploadError) {
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from('vehicle-images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!id) {
      setError('Vehicle id is missing');
      return;
    }

    const cleanedPlate = compactPlate(formData.license_plate);

    if (!cleanedPlate) {
      setError('Registration number is required');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const imageUrl = await uploadImage();

      const year = formData.year ? Number(formData.year) : null;
      const mileage = formData.mileage ? Number(formData.mileage) : null;

      if (year !== null && (!Number.isFinite(year) || year < 1900)) {
        throw new Error('Enter a valid year');
      }

      if (mileage !== null && (!Number.isFinite(mileage) || mileage < 0)) {
        throw new Error('Enter a valid mileage');
      }

      const payload = {
        license_plate: cleanedPlate,
        make: formData.make.trim() || null,
        model: formData.model.trim() || null,
        year,
        mileage,
        status: formData.status,
        image_url: imageUrl,
      };

      const res = await fetch(`/api/vehicles/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(body, 'Update failed'));
      }

      setSuccess(true);

      window.setTimeout(() => {
        router.push(`/vehicles/${cleanedPlate}`);
      }, 1200);
    } catch (err) {
      console.error('Update vehicle error:', err);
      setError(
        err instanceof Error ? err.message : 'Could not update vehicle. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main style={styles.centered}>
        <div style={styles.loadingShell}>
          <Loader2 className="spin" size={28} color={theme.colors.primary} />
          <span style={styles.loadingText}>Loading vehicle profile…</span>
        </div>

        <style>{`
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <button type="button" onClick={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={16} />
          <span>Back to fleet</span>
        </button>

        <header style={styles.header}>
          <div style={styles.headerBadge}>
            <Sparkles size={14} />
            <span>Vehicle profile editor</span>
          </div>

          <h1 style={styles.title}>Edit vehicle</h1>
          <p style={styles.subtitle}>
            Update registration, mileage, status, and imagery for{' '}
            {formData.license_plate || 'this vehicle'}.
          </p>
        </header>

        <div style={styles.layout} className="edit-vehicle-layout">
          <form onSubmit={handleSubmit} style={styles.form}>
            <section style={styles.imageSection} aria-label="Vehicle photo">
              <div style={styles.imageContainer}>
                <Image
                  src={imagePreview || existingImageUrl || '/placeholder-car.png'}
                  alt="Vehicle"
                  fill
                  unoptimized
                  style={{ objectFit: 'cover' }}
                  sizes="124px"
                />

                <label style={styles.cameraBtn}>
                  <Camera size={16} />
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              </div>

              <div style={styles.imageMeta}>
                <h2 style={styles.imageTitle}>Vehicle image</h2>
                <p style={styles.imageHint}>
                  Upload a clear image so the vehicle is easier to recognise across the fleet.
                </p>
              </div>
            </section>

            <section style={styles.card}>
              <div style={styles.sectionIntro}>
                <p style={styles.kicker}>Identity</p>
                <h2 style={styles.sectionTitle}>Registration and details</h2>
                <p style={styles.sectionBody}>
                  Refresh DVLA information or edit the core profile manually.
                </p>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Registration</label>

                <div style={styles.lookupRow} className="edit-lookup-row">
                  <div style={styles.plateShell}>
                    <div style={styles.plateMark}>UK</div>
                    <input
                      type="text"
                      value={formData.license_plate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          license_plate: normalizePlate(e.target.value),
                        }))
                      }
                      style={styles.plateInput}
                      maxLength={8}
                      aria-label="Registration number"
                      placeholder="AB12 CDE"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleLookup}
                    disabled={lookupLoading || !formData.license_plate}
                    style={styles.lookupBtn}
                    className="edit-dvla-button"
                  >
                    {lookupLoading ? (
                      <Loader2 size={14} className="spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    <span>{lookupLoading ? 'Syncing…' : 'DVLA sync'}</span>
                  </button>
                </div>
              </div>

              <div style={styles.grid}>
                <div style={styles.field}>
                  <label style={styles.label}>Make</label>
                  <input
                    type="text"
                    value={formData.make}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, make: e.target.value }))
                    }
                    style={styles.input}
                    placeholder="Manufacturer"
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Model</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, model: e.target.value }))
                    }
                    style={styles.input}
                    placeholder="Model"
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Year</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, year: e.target.value }))
                    }
                    style={styles.input}
                    placeholder="e.g. 2019"
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Mileage (mi)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.mileage}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, mileage: e.target.value }))
                    }
                    style={styles.input}
                    placeholder="e.g. 42000"
                  />
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Operational status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, status: e.target.value }))
                  }
                  style={styles.input}
                >
                  <option value="active">Active</option>
                  <option value="maintenance">In maintenance</option>
                  <option value="inactive">Decommissioned</option>
                </select>
              </div>
            </section>

            <AnimatePresence initial={false}>
              {error && (
                <motion.div
                  key="edit-error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  style={styles.errorBox}
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </motion.div>
              )}

              {success && (
                <motion.div
                  key="edit-success"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  style={styles.successBox}
                >
                  <CheckCircle2 size={16} />
                  <span>Vehicle updated. Redirecting…</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={styles.actionRow} className="edit-actions">
              <button type="button" onClick={() => router.back()} style={styles.cancelBtn}>
                Discard
              </button>

              <button type="submit" disabled={submitting} style={styles.submitBtn}>
                {submitting ? 'Saving…' : 'Save changes'}
                {submitting ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              </button>
            </div>
          </form>

          <aside style={styles.sidebar}>
            <section style={styles.previewCard}>
              <div style={styles.previewHeader}>
                <div style={styles.previewIcon}>
                  <CarFront size={18} />
                </div>

                <div>
                  <p style={styles.previewEyebrow}>Live summary</p>
                  <h2 style={styles.previewTitle}>
                    {displayValue(formData.make, 'Unknown make')} {displayValue(formData.model, 'Unknown model')}
                  </h2>
                </div>
              </div>

              <div style={styles.previewMetrics}>
                <div style={styles.metric}>
                  <span style={styles.metricLabel}>Plate</span>
                  <strong style={styles.metricValue}>
                    {displayValue(compactPlate(formData.license_plate))}
                  </strong>
                </div>

                <div style={styles.metric}>
                  <span style={styles.metricLabel}>Year</span>
                  <strong style={styles.metricValue}>{displayValue(formData.year)}</strong>
                </div>

                <div style={styles.metric}>
                  <span style={styles.metricLabel}>Mileage</span>
                  <strong style={styles.metricValue}>
                    {formData.mileage ? `${Number(formData.mileage).toLocaleString()} mi` : 'Not set'}
                  </strong>
                </div>

                <div style={styles.metric}>
                  <span style={styles.metricLabel}>Status</span>
                  <strong style={styles.metricValue}>{displayValue(formData.status)}</strong>
                </div>
              </div>
            </section>

            <section style={styles.insightCard}>
              <div style={styles.insightTop}>
                <div style={getRiskBadgeStyle(insight.risk)}>
                  <Shield size={14} />
                  <span>{insight.risk} risk</span>
                </div>

                <div style={styles.scorePill}>
                  <span style={styles.scoreLabel}>Health baseline</span>
                  <strong style={styles.scoreValue}>{insight.score}%</strong>
                </div>
              </div>

              <p style={styles.insightText}>{insight.summary}</p>

              <div style={styles.nextHint}>
                <ArrowRight size={14} />
                <span>Use DVLA sync when the registration has changed or details look outdated.</span>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 980px) {
          .edit-vehicle-layout {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          .edit-lookup-row {
            flex-direction: column;
          }

          .edit-dvla-button {
            width: 100%;
            justify-content: center;
          }

          .edit-actions {
            flex-direction: column-reverse;
          }

          .edit-actions button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </main>
  );
}

const successColor = theme.colors.primary;

const styles: Record<string, CSSProperties> = {
  page: {
    padding: '28px 16px 40px',
    background: `linear-gradient(180deg, ${theme.colors.background.main} 0%, ${theme.colors.background.subtle} 100%)`,
    minHeight: '100vh',
    color: theme.colors.text.primary,
  },
  container: {
    maxWidth: 1140,
    marginInline: 'auto',
  },
  header: {
    marginBottom: 22,
  },
  headerBadge: {
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
    fontSize: 'clamp(28px, 4vw, 40px)',
    lineHeight: 1.06,
    fontWeight: 750,
    letterSpacing: '-0.05em',
    margin: 0,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 1.65,
    color: theme.colors.text.secondary,
    maxWidth: 720,
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
    borderRadius: 999,
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.background.card,
    color: theme.colors.text.secondary,
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(300px, 0.8fr)',
    gap: 20,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  imageSection: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    flexWrap: 'wrap',
    background: theme.colors.background.card,
    borderRadius: 22,
    border: `1px solid ${theme.colors.border.light}`,
    padding: 18,
  },
  imageContainer: {
    width: 124,
    height: 124,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    border: `1px solid ${theme.colors.border.light}`,
    flexShrink: 0,
    background: theme.colors.background.subtle,
  },
  cameraBtn: {
    position: 'absolute',
    insetInlineEnd: 8,
    insetBlockEnd: 8,
    borderRadius: 999,
    border: 'none',
    background: theme.colors.primary,
    color: theme.colors.background.main,
    width: 34,
    height: 34,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  imageMeta: {
    flex: 1,
    minWidth: 220,
  },
  imageTitle: {
    fontSize: 16,
    fontWeight: 650,
    marginBottom: 6,
  },
  imageHint: {
    fontSize: 14,
    lineHeight: 1.6,
    color: theme.colors.text.secondary,
    margin: 0,
    maxWidth: 560,
  },
  card: {
    background: theme.colors.background.card,
    borderRadius: 22,
    border: `1px solid ${theme.colors.border.light}`,
    padding: 20,
    boxShadow: '0 8px 30px rgba(15, 23, 42, 0.04)',
  },
  sectionIntro: {
    marginBottom: 16,
  },
  kicker: {
    fontSize: 12,
    fontWeight: 700,
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 1.1,
    fontWeight: 650,
    letterSpacing: '-0.03em',
    margin: 0,
  },
  sectionBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 1.65,
    color: theme.colors.text.secondary,
    maxWidth: 620,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  lookupRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'stretch',
    flexWrap: 'wrap',
  },
  plateShell: {
    flex: 1,
    minWidth: 220,
    display: 'grid',
    gridTemplateColumns: '56px 1fr',
    minHeight: 56,
    borderRadius: 16,
    overflow: 'hidden',
    border: '1px solid rgba(17, 24, 39, 0.14)',
    background: '#F8D94E',
  },
  plateMark: {
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
    background: 'transparent',
    color: '#171717',
    padding: '0 16px',
    fontSize: 21,
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  lookupBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 56,
    padding: '0 16px',
    borderRadius: 16,
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.background.subtle,
    color: theme.colors.text.primary,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    margin: '16px 0',
  },
  input: {
    borderRadius: 14,
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.background.main,
    padding: '12px 14px',
    minHeight: 46,
    fontSize: 14,
    color: theme.colors.text.primary,
    outline: 'none',
  },
  errorBox: {
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
  successBox: {
    padding: '12px 14px',
    borderRadius: 14,
    border: `1px solid ${successColor}`,
    background: `${successColor}10`,
    color: successColor,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    lineHeight: 1.5,
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    flexWrap: 'wrap',
  },
  cancelBtn: {
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
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 46,
    padding: '0 18px',
    borderRadius: 16,
    border: 'none',
    background: theme.colors.primary,
    color: theme.colors.background.main,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  previewCard: {
    background: theme.colors.background.card,
    borderRadius: 22,
    border: `1px solid ${theme.colors.border.light}`,
    padding: 18,
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  previewIcon: {
    width: 40,
    height: 40,
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
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 4,
  },
  previewTitle: {
    fontSize: 18,
    lineHeight: 1.15,
    fontWeight: 650,
    letterSpacing: '-0.03em',
    margin: 0,
  },
  previewMetrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 10,
  },
  metric: {
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
    fontWeight: 700,
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  metricValue: {
    fontSize: 14,
    lineHeight: 1.45,
    color: theme.colors.text.primary,
    overflowWrap: 'anywhere',
  },
  insightCard: {
    background: theme.colors.background.card,
    borderRadius: 22,
    border: `1px solid ${theme.colors.border.light}`,
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  insightTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  scorePill: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '10px 12px',
    borderRadius: 14,
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.light}`,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  scoreValue: {
    fontSize: 20,
    lineHeight: 1,
    fontWeight: 750,
    letterSpacing: '-0.03em',
  },
  insightText: {
    fontSize: 14,
    lineHeight: 1.65,
    color: theme.colors.text.primary,
    margin: 0,
  },
  nextHint: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.light}`,
    fontSize: 13,
    lineHeight: 1.55,
    color: theme.colors.text.secondary,
  },
  centered: {
    minHeight: '70vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    background: theme.colors.background.main,
  },
  loadingShell: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    borderRadius: 16,
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.background.card,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
};