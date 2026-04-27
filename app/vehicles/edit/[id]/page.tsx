'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Search, Save, Camera, 
  Trash2, AlertCircle, CheckCircle, Loader2, Info 
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

type Vehicle = {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  year: number;
  mileage: number | null;
  status: string;
  image_url: string | null;
  dvla_data?: any;
};

export default function EditVehiclePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    license_plate: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    mileage: '',
    status: 'active',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [dvlaData, setDvlaData] = useState<any>(null);

  const fetchVehicle = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/vehicles/${id}`);
      if (!res.ok) throw new Error('Vehicle record not found');
      const data: Vehicle = await res.json();
      
      setFormData({
        license_plate: data.license_plate,
        make: data.make,
        model: data.model,
        year: data.year,
        mileage: data.mileage?.toString() || '',
        status: data.status || 'active',
      });
      setExistingImageUrl(data.image_url);
      setDvlaData(data.dvla_data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVehicle();
  }, [fetchVehicle]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleLookup = async () => {
    const plate = formData.license_plate.toUpperCase().replace(/\s+/g, '');
    if (!plate) return setError('Enter a registration number');

    setLookupLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/dvla/${encodeURIComponent(plate)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'DVLA Record Missing');

      setFormData(prev => ({
        ...prev,
        make: data.make || prev.make,
        model: data.model || prev.model,
        year: data.year || prev.year,
      }));
      setDvlaData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLookupLoading(false);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return existingImageUrl;

    const fileExt = imageFile.name.split('.').pop();
    const filePath = `vehicles/${id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('vehicle-images')
      .upload(filePath, imageFile);

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage
      .from('vehicle-images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const imageUrl = await uploadImage();

      const res = await fetch(`/api/vehicles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          year: parseInt(formData.year.toString()),
          mileage: formData.mileage ? parseInt(formData.mileage) : null,
          image_url: imageUrl,
          dvla_data: dvlaData,
        }),
      });

      if (!res.ok) throw new Error('Update failed');

      setSuccess(true);
      setTimeout(() => router.push(`/vehicles/${formData.license_plate}`), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={styles.centered}>
      <Loader2 className="spin" size={32} color={theme.colors.primary} />
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button onClick={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={18} /> Back to Fleet
        </button>

        <header style={styles.header}>
          <h1 style={styles.title}>Asset Calibration</h1>
          <p style={styles.subtitle}>Modify specifications for {formData.license_plate}</p>
        </header>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Image Manager Section */}
          <div style={styles.imageSection}>
            <div style={styles.imageContainer}>
              <Image
                src={imagePreview || existingImageUrl || '/placeholder-car.png'}
                alt="Vehicle Preview"
                fill
                style={{ objectFit: 'cover' }}
              />
              <label style={styles.cameraBtn}>
                <Camera size={20} />
                <input type="file" hidden onChange={handleImageChange} accept="image/*" />
              </label>
            </div>
            <div style={styles.imageMeta}>
              <h4 style={{ margin: 0 }}>Visual Identity</h4>
              <p style={{ fontSize: '12px', color: theme.colors.text.muted }}>Upload a clear side-profile photo.</p>
            </div>
          </div>

          <div style={styles.card}>
            {/* Lookup Logic */}
            <div style={styles.field}>
              <label style={styles.label}>Licence Plate</label>
              <div style={styles.lookupRow}>
                <input
                  type="text"
                  value={formData.license_plate}
                  onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                  style={styles.plateInput}
                />
                <button type="button" onClick={handleLookup} style={styles.lookupBtn} disabled={lookupLoading}>
                  {lookupLoading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                  DVLA Sync
                </button>
              </div>
            </div>

            {/* Grid Layout */}
            <div style={styles.grid}>
              <div style={styles.field}>
                <label style={styles.label}>Make</label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Model</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Year</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Mileage (mi)</label>
                <input
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Operational Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={styles.input}
              >
                <option value="active">Active Service</option>
                <option value="maintenance">Maintenance Protocol</option>
                <option value="inactive">Decommissioned</option>
              </select>
            </div>
          </div>

          {/* Feedback & Actions */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={styles.errorBox}>
                <AlertCircle size={16} /> {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={styles.successBox}>
                <CheckCircle size={16} /> Asset updated successfully. Redirecting...
              </motion.div>
            )}
          </AnimatePresence>

          <div style={styles.actionRow}>
             <button type="button" onClick={() => router.back()} style={styles.cancelBtn}>
               Discard
             </button>
             <button type="submit" style={styles.submitBtn} disabled={submitting}>
               {submitting ? 'Updating Core...' : 'Apply Changes'}
               <Save size={18} />
             </button>
          </div>
        </form>
      </div>

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px 20px', background: theme.colors.background.main, minHeight: '100vh', color: '#fff' },
  container: { maxWidth: '800px', margin: '0 auto' },
  header: { marginBottom: '32px' },
  title: { fontSize: '32px', fontWeight: 900, background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 },
  subtitle: { color: theme.colors.text.muted, marginTop: '8px' },
  backButton: { background: 'none', border: 'none', color: theme.colors.text.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '14px' },
  
  form: { display: 'flex', flexDirection: 'column', gap: '24px' },
  card: { ...theme.glass, padding: '32px', borderRadius: '24px', border: `1px solid ${theme.colors.border.light}` },
  
  imageSection: { display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '8px' },
  imageContainer: { width: '120px', height: '120px', borderRadius: '20px', overflow: 'hidden', position: 'relative', border: `2px solid ${theme.colors.border.light}` },
  cameraBtn: { position: 'absolute', bottom: '8px', right: '8px', background: theme.colors.primary, color: '#000', padding: '8px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' },
  imageMeta: { flex: 1 },

  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '20px 0' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '12px', fontWeight: 700, color: theme.colors.text.muted, textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.colors.border.light}`, borderRadius: '12px', padding: '12px', color: '#fff', outline: 'none' },
  
  lookupRow: { display: 'flex', gap: '12px' },
  plateInput: { flex: 1, background: '#facc15', color: '#000', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: 800, fontSize: '18px', textAlign: 'center' },
  lookupBtn: { background: theme.colors.background.elevated, color: '#fff', border: `1px solid ${theme.colors.border.light}`, padding: '0 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },

  actionRow: { display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '20px' },
  cancelBtn: { background: 'none', border: `1px solid ${theme.colors.border.light}`, color: theme.colors.text.muted, padding: '12px 24px', borderRadius: '12px', cursor: 'pointer' },
  submitBtn: { background: theme.colors.primary, color: '#000', border: 'none', padding: '12px 28px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' },

  errorBox: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' },
  successBox: { background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' },
  centered: { height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }
};