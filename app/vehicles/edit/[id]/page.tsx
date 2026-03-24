'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import styles from './page.module.css';

type Vehicle = {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  year: number;
  mileage: number | null;
  status: string;
  image_url: string | null;
  // optional DVLA data stored
  dvla_data?: any;
};

export default function EditVehiclePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
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

  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dvlaData, setDvlaData] = useState<any>(null);

  useEffect(() => {
    fetchVehicle();
  }, [id]);

  async function fetchVehicle() {
    try {
      const res = await fetch(`/api/vehicles/${id}`);
      if (!res.ok) throw new Error('Vehicle not found');
      const data = await res.json();
      setVehicle(data);
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
    }
  }

  const normalizePlate = (p: string) => p.toUpperCase().replace(/\s+/g, '');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleLookup = async () => {
    const normalizedPlate = normalizePlate(formData.license_plate);
    if (!normalizedPlate) {
      setError('Please enter a registration number');
      return;
    }

    setLookupLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/dvla/${encodeURIComponent(normalizedPlate)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Vehicle not found');
      }

      setFormData(prev => ({
        ...prev,
        make: data.make || '',
        model: data.model || '',
        year: data.year || prev.year,
      }));
      setDvlaData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to lookup vehicle details');
    } finally {
      setLookupLoading(false);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return existingImageUrl; // keep existing if no new image
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `vehicles/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('vehicle-images')
      .upload(filePath, imageFile);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(uploadError.message);
    }

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

      const payload = {
        registration: normalizePlate(formData.license_plate),
        make: formData.make,
        model: formData.model,
        year: parseInt(formData.year.toString()),
        mileage: formData.mileage ? parseInt(formData.mileage) : null,
        status: formData.status,
        image_url: imageUrl,
        dvla_data: dvlaData,
      };

      const res = await fetch(`/api/vehicles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update vehicle');

      setSuccess(true);
      setTimeout(() => {
        router.push(`/vehicles/${normalizePlate(formData.license_plate)}`);
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!vehicle && !error) {
    return <div className={styles.page}>Loading...</div>;
  }

  return (
    <div className={styles.page}>
      <button onClick={() => router.back()} className={styles.backButton}>
        ← Back
      </button>

      <h1 className={styles.title}>Edit Vehicle</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Registration + Lookup */}
        <div className={styles.field}>
          <label className={styles.label}>Registration Number *</label>
          <div className={styles.row}>
            <input
              type="text"
              value={formData.license_plate}
              onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
              className={styles.input}
              required
              disabled={lookupLoading || submitting}
            />
            <button
              type="button"
              onClick={handleLookup}
              disabled={lookupLoading || !formData.license_plate || submitting}
              className={styles.lookupButton}
            >
              {lookupLoading ? '...' : 'Lookup'}
            </button>
          </div>
          <p className={styles.hint}>We'll try to auto‑fill details using the DVLA database.</p>
        </div>

        {/* Make & Model */}
        <div className={styles.rowFields}>
          <div className={styles.field}>
            <label className={styles.label}>Make</label>
            <input
              type="text"
              value={formData.make}
              onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              className={styles.input}
              disabled={submitting}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Model</label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className={styles.input}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Year & Mileage */}
        <div className={styles.rowFields}>
          <div className={styles.field}>
            <label className={styles.label}>Year</label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              className={styles.input}
              disabled={submitting}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Mileage (mi)</label>
            <input
              type="number"
              value={formData.mileage}
              onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
              className={styles.input}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Status */}
        <div className={styles.field}>
          <label className={styles.label}>Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className={styles.input}
            disabled={submitting}
          >
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Image Upload */}
        <div className={styles.field}>
          <label className={styles.label}>Vehicle Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className={styles.fileInput}
            disabled={submitting}
          />
          {(imagePreview || existingImageUrl) && (
            <div className={styles.preview}>
              <Image
                src={imagePreview || existingImageUrl!}
                alt="Vehicle preview"
                width={120}
                height={90}
                className={styles.previewImage}
              />
            </div>
          )}
        </div>

        {/* DVLA Info (if available) */}
        {dvlaData && (
          <div className={styles.infoBox}>
            <strong>DVLA data fetched:</strong>
            <ul className={styles.infoList}>
              {dvlaData.make && <li>Make: {dvlaData.make}</li>}
              {dvlaData.model && <li>Model: {dvlaData.model}</li>}
              {dvlaData.year && <li>Year: {dvlaData.year}</li>}
              {dvlaData.engineCapacity && <li>Engine: {dvlaData.engineCapacity}cc</li>}
              {dvlaData.fuelType && <li>Fuel: {dvlaData.fuelType}</li>}
            </ul>
          </div>
        )}

        {/* Error / Success */}
        {error && <div className={styles.errorBox}>{error}</div>}
        {success && (
          <div className={styles.successBox}>
            ✓ Vehicle updated successfully! Redirecting...
          </div>
        )}

        {/* Buttons */}
        <div className={styles.buttonRow}>
          <button
            type="button"
            onClick={() => router.back()}
            className={styles.cancelButton}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || success}
            className={styles.submitButton}
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}