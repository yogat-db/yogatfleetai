'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import type { Vehicle } from '@/app/types/fleet'

export default function EditVehiclePage() {
  const params = useParams()
  const router = useRouter()
  const vehicleId = params.id as string

  const [form, setForm] = useState({
    license_plate: '',
    make: '',
    model: '',
    year: '',
    mileage: '',
    image_url: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchVehicle()
  }, [vehicleId])

  async function fetchVehicle() {
    try {
      setLoading(true)
      const res = await fetch(`/api/vehicles/${vehicleId}`)
      if (!res.ok) throw new Error('Vehicle not found')
      const data = await res.json()
      setForm({
        license_plate: data.license_plate || '',
        make: data.make || '',
        model: data.model || '',
        year: data.year?.toString() || '',
        mileage: data.mileage?.toString() || '',
        image_url: data.image_url || '',
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `vehicles/${fileName}`
    const { error: uploadError } = await supabase.storage
      .from('vehicle-images')
      .upload(filePath, imageFile)
    if (uploadError) throw new Error(uploadError.message)
    const { data: urlData } = supabase.storage.from('vehicle-images').getPublicUrl(filePath)
    return urlData.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      let imageUrl = form.image_url
      if (imageFile) {
        imageUrl = (await uploadImage()) || imageUrl
      }

      const payload = {
        license_plate: form.license_plate.toUpperCase(),
        make: form.make,
        model: form.model,
        year: form.year ? parseInt(form.year) : null,
        mileage: form.mileage ? parseInt(form.mileage) : null,
        image_url: imageUrl,
      }

      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update vehicle')

      setSuccess(true)
      setTimeout(() => {
        router.push('/vehicles')
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading vehicle details...</p>
      </div>
    )
  }

  if (error && !form.license_plate) {
    return (
      <div style={styles.centered}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => router.push('/vehicles')} style={styles.button}>
          Back to Fleet
        </button>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>
        ← Back
      </button>

      <h1 style={styles.title}>Edit Vehicle</h1>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>License Plate *</label>
          <input
            type="text"
            value={form.license_plate}
            onChange={(e) => setForm({ ...form, license_plate: e.target.value.toUpperCase() })}
            style={styles.input}
            required
          />
        </div>

        <div style={styles.rowFields}>
          <div style={styles.field}>
            <label style={styles.label}>Make</label>
            <input
              type="text"
              value={form.make}
              onChange={(e) => setForm({ ...form, make: e.target.value })}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Model</label>
            <input
              type="text"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.rowFields}>
          <div style={styles.field}>
            <label style={styles.label}>Year</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Mileage</label>
            <input
              type="number"
              value={form.mileage}
              onChange={(e) => setForm({ ...form, mileage: e.target.value })}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Current Image</label>
          {form.image_url ? (
            <div style={styles.currentImage}>
              <Image
                src={form.image_url}
                alt="Vehicle"
                width={150}
                height={100}
                style={styles.image}
              />
            </div>
          ) : (
            <p style={styles.noImage}>No image</p>
          )}
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Change Image (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={styles.fileInput}
          />
          {imagePreview && (
            <div style={styles.previewContainer}>
              <img src={imagePreview} alt="preview" style={styles.previewImage} />
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                style={styles.clearPreview}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>✓ Vehicle updated! Redirecting...</div>}

        <div style={styles.buttonRow}>
          <button type="button" onClick={() => router.back()} style={styles.cancelButton} disabled={saving}>
            Cancel
          </button>
          <button type="submit" disabled={saving || success} style={styles.submitButton}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <style jsx>{`
        .spinner {
          border: 3px solid rgba(255,255,255,0.1);
          border-top: 3px solid #22c55e;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9' },
  centered: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' },
  backButton: { background: 'transparent', border: '1px solid #334155', color: '#f1f5f9', padding: '8px 16px', borderRadius: 8, marginBottom: 24, cursor: 'pointer' },
  title: { fontSize: 32, fontWeight: 700, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 32 },
  form: { maxWidth: 600 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 14, fontWeight: 500, color: '#94a3b8', marginBottom: 6 },
  input: { width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 16px', color: '#f1f5f9', fontSize: 16 },
  rowFields: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  currentImage: { marginTop: 8, marginBottom: 8 },
  image: { borderRadius: 8, objectFit: 'cover' },
  noImage: { color: '#64748b', fontStyle: 'italic' },
  fileInput: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 10, color: '#94a3b8' },
  previewContainer: { position: 'relative', marginTop: 8, display: 'inline-block' },
  previewImage: { width: 100, height: 75, borderRadius: 8, objectFit: 'cover' },
  clearPreview: { position: 'absolute', top: 2, right: 2, background: '#ef4444', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  errorBox: { marginTop: 16, padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, color: '#ef4444' },
  successBox: { marginTop: 16, padding: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: 8, color: '#22c55e' },
  buttonRow: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
  cancelButton: { background: 'transparent', border: '1px solid #334155', borderRadius: 12, padding: '12px 24px', color: '#94a3b8', cursor: 'pointer' },
  submitButton: { background: '#22c55e', border: 'none', borderRadius: 12, padding: '12px 24px', color: '#020617', fontWeight: 600, cursor: 'pointer' },
  button: { background: '#22c55e', color: '#020617', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer' },
}