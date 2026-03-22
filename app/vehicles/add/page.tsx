'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Loader2, Search, AlertCircle, CheckCircle, Car } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

type FormData = {
  license_plate: string;
  make: string;
  model: string;
  year: number | null;
  mileage: number | null;
  vin: string;
};

type DVLAVehicle = {
  make: string;
  model: string;
  yearOfManufacture: number;
  registrationNumber: string;
};

type MOTTest = {
  completedDate: string;
  odometerValue: number;
  odometerUnit: string;
  testResult: string;
  expiryDate: string;
};

export default function AddVehiclePage() {
  const router = useRouter();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [motLoading, setMotLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [motData, setMotData] = useState<MOTTest | null>(null);

  const licensePlate = watch('license_plate');

  // DVLA lookup
  const lookupVehicle = async (plate: string) => {
    if (!plate || plate.length < 2) return;
    setLookupLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dvla/${plate.toUpperCase()}`);
      if (!res.ok) throw new Error('Vehicle not found');
      const data: DVLAVehicle = await res.json();
      setValue('make', data.make || '');
      setValue('model', data.model || '');
      setValue('year', data.yearOfManufacture || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLookupLoading(false);
    }
  };

  // MOT lookup
  const lookupMot = async (plate: string) => {
    if (!plate || plate.length < 2) return;
    setMotLoading(true);
    try {
      const res = await fetch(`/api/mot/${plate.toUpperCase()}`);
      if (res.ok) {
        const data = await res.json();
        // Assuming API returns an object with a `tests` array
        const latest = data?.tests?.[0] || data;
        setMotData(latest);
        if (latest?.odometerValue) {
          setValue('mileage', latest.odometerValue);
        }
      }
    } catch (err) {
      console.warn('MOT lookup failed', err);
    } finally {
      setMotLoading(false);
    }
  };

  // AI insight (optional)
  const fetchAiInsight = async () => {
    const make = watch('make');
    const model = watch('model');
    const year = watch('year');
    if (!make || !model || !year) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/vehicle-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ make, model, year }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiInsight(data.insight);
      }
    } catch (err) {
      console.warn('AI insight failed', err);
    } finally {
      setAiLoading(false);
    }
  };

  // Debounced lookups
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (licensePlate && licensePlate.length >= 2) {
        lookupVehicle(licensePlate);
        lookupMot(licensePlate);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [licensePlate]);

  // Fetch AI insight when vehicle details are known
  useEffect(() => {
    if (watch('make') && watch('model') && watch('year')) {
      fetchAiInsight();
    }
  }, [watch('make'), watch('model'), watch('year')]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in');

      const { error: insertError } = await supabase.from('vehicles').insert({
        user_id: user.id,
        license_plate: data.license_plate.toUpperCase(),
        make: data.make,
        model: data.model,
        year: data.year,
        mileage: data.mileage,
        vin: data.vin || null,
      });
      if (insertError) throw insertError;
      setSuccess(true);
      setTimeout(() => router.push('/fleet'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.page}
    >
      <div style={styles.container}>
        <motion.h1
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          style={styles.title}
        >
          Add New Vehicle
        </motion.h1>

        <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
          {/* License Plate Field */}
          <div style={styles.field}>
            <label style={styles.label}>
              License Plate *
              {lookupLoading && <Loader2 size={14} style={{ marginLeft: theme.spacing[1], animation: 'spin 1s linear infinite' }} />}
            </label>
            <div style={styles.inputGroup}>
              <input
                {...register('license_plate', { required: 'License plate is required' })}
                style={styles.input}
                placeholder="e.g., KF66LJN"
                autoCapitalize="characters"
                autoComplete="off"
              />
              {lookupLoading && <Search size={20} style={styles.inputIcon} />}
            </div>
            {errors.license_plate && <p style={styles.errorText}>{errors.license_plate.message}</p>}
          </div>

          {/* Make & Model */}
          <div style={styles.row}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Make *</label>
              <input {...register('make', { required: 'Make is required' })} style={styles.input} />
              {errors.make && <p style={styles.errorText}>{errors.make.message}</p>}
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Model *</label>
              <input {...register('model', { required: 'Model is required' })} style={styles.input} />
              {errors.model && <p style={styles.errorText}>{errors.model.message}</p>}
            </div>
          </div>

          {/* Year & Mileage */}
          <div style={styles.row}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Year</label>
              <input
                type="number"
                {...register('year', { valueAsNumber: true })}
                style={styles.input}
                placeholder="e.g., 2016"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>
                Mileage (mi)
                {motLoading && <Loader2 size={14} style={{ marginLeft: theme.spacing[1], animation: 'spin 1s linear infinite' }} />}
              </label>
              <input
                type="number"
                {...register('mileage', { valueAsNumber: true })}
                style={styles.input}
                placeholder="Current odometer reading"
              />
              {motData && (
                <p style={styles.helperText}>
                  ✓ Last MOT: {new Date(motData.completedDate).toLocaleDateString()} at {motData.odometerValue.toLocaleString()} mi
                </p>
              )}
            </div>
          </div>

          {/* VIN */}
          <div style={styles.field}>
            <label style={styles.label}>VIN (Vehicle Identification Number)</label>
            <input {...register('vin')} style={styles.input} placeholder="Optional" />
          </div>

          {/* AI Insight */}
          {aiLoading && (
            <div style={styles.aiContainer}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={styles.aiText}>Generating AI insights...</span>
            </div>
          )}
          {aiInsight && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={styles.aiContainer}
            >
              <Car size={16} style={{ color: theme.colors.primary }} />
              <span style={styles.aiText}>{aiInsight}</span>
            </motion.div>
          )}

          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          {success && (
            <div style={styles.successBox}>
              <CheckCircle size={16} />
              Vehicle added successfully! Redirecting...
            </div>
          )}

          <motion.button
            type="submit"
            disabled={loading || success}
            style={styles.submitButton}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Adding Vehicle...' : 'Add Vehicle'}
          </motion.button>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input:focus {
          outline: none;
          border-color: ${theme.colors.primary};
          box-shadow: 0 0 0 2px ${theme.colors.primary}40;
        }
        @media (max-width: 640px) {
          .row {
            flex-direction: column;
            gap: ${theme.spacing[4]};
          }
        }
      `}</style>
    </motion.div>
  );
}

// Styles using your theme – corrected spacing
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: theme.colors.background.main,
    padding: theme.spacing[8],
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: theme.fontFamilies.sans,
  },
  container: {
    maxWidth: '600px',
    width: '100%',
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius['2xl'],
    border: `1px solid ${theme.colors.border.light}`,
    padding: theme.spacing[8],
  },
  title: {
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.bold,
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: theme.spacing[6],
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[5],
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing[1],
  },
  row: {
    display: 'flex',
    gap: theme.spacing[4],
    // The class "row" will be used in the media query
  },
  label: {
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[1],
    display: 'flex',
    alignItems: 'center',
  },
  inputGroup: {
    position: 'relative',
  },
  input: {
    width: '100%',
    background: theme.colors.background.elevated,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.base,
    transition: theme.transitions.default,
  },
  inputIcon: {
    position: 'absolute',
    right: theme.spacing[3],
    top: '50%',
    transform: 'translateY(-50%)',
    color: theme.colors.text.muted,
  },
  errorText: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.error,
    marginTop: theme.spacing[1],
  },
  helperText: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.muted,
    marginTop: theme.spacing[1],
  },
  aiContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    background: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    border: `1px solid ${theme.colors.primary}20`,
  },
  aiText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    background: `${theme.colors.error}10`,
    border: `1px solid ${theme.colors.error}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.error,
    fontSize: theme.fontSizes.sm,
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    background: `${theme.colors.primary}10`,
    border: `1px solid ${theme.colors.primary}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    color: theme.colors.primary,
    fontSize: theme.fontSizes.sm,
  },
  submitButton: {
    background: theme.colors.primary,
    color: theme.colors.background.main,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.semibold,
    cursor: 'pointer',
    transition: theme.transitions.default,
    marginTop: theme.spacing[2],
  },
};