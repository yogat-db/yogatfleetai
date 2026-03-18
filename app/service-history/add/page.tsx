'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'

type Vehicle = {
  id: string
  license_plate: string
  make: string | null
  model: string | null
}

const JOB_TITLES = [
  'Oil Change',
  'Brake Pad Replacement',
  'Tire Rotation',
  'Engine Diagnostic',
  'Battery Replacement',
  'AC Recharge',
  'Timing Belt Replacement',
  'Wheel Alignment',
  'Transmission Service',
  'Coolant Flush',
  'Spark Plug Replacement',
  'Fuel Injector Cleaning',
  'Suspension Repair',
  'Alternator Replacement',
  'Radiator Replacement',
]

export default function AddServiceEventPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preSelectedVehicleId = searchParams.get('vehicleId')

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [title, setTitle] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [useCustomTitle, setUseCustomTitle] = useState(false)
  const [description, setDescription] = useState('')
  const [mileage, setMileage] = useState('')
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().split('T')[0])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchVehicles()
  }, [])

  useEffect(() => {
    if (preSelectedVehicleId && vehicles.length > 0) {
      setSelectedVehicleId(preSelectedVehicleId)
    }
  }, [vehicles, preSelectedVehicleId])

  async function fetchVehicles() {
    try {
      const res = await fetch('/api/vehicles')
      const data = await res.json()
      setVehicles(data)
    } catch {
      setError('Failed to load vehicles')
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
  const filePath = `service-events/${fileName}`
  const { error: uploadError } = await supabase.storage
    .from('service-images')
    .upload(filePath, imageFile)
  if (uploadError) {
    console.error('Upload error:', uploadError)
    throw new Error('Image upload failed. Please check that the "service-images" bucket exists in Supabase.')
  }
  const { data: urlData } = supabase.storage.from('service-images').getPublicUrl(filePath)
  return urlData.publicUrl
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const finalTitle = useCustomTitle ? customTitle : title
    if (!selectedVehicleId) {
      setError('Please select a vehicle')
      setLoading(false)
      return
    }
    if (!finalTitle.trim()) {
      setError('Title is required')
      setLoading(false)
      return
    }

    try {
      let imageUrl = null
      if (imageFile) {
        imageUrl = await uploadImage()
      }

      const payload = {
        vehicle_id: selectedVehicleId,
        title: finalTitle,
        description: description.trim() || null,
        mileage: mileage ? parseInt(mileage) : null,
        occurred_at: occurredAt,
        image_url: imageUrl,
      }

      const res = await fetch(`/api/vehicles/${selectedVehicleId}/service-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add service event')

      setSuccess(true)
      setTimeout(() => {
        router.push('/service-history')
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>← Back</button>
      <h1 style={styles.title}>Add Service Event</h1>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Vehicle Selection */}
        <div style={styles.field}>
          <label style={styles.label}>Vehicle *</label>
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            style={styles.select}
            required
          >
            <option value="" disabled>Select a vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.license_plate} – {v.make} {v.model}
              </option>
            ))}
          </select>
        </div>

        {/* Title with suggestions */}
        <div style={styles.field}>
          <label style={styles.label}>Service Title *</label>
          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                checked={!useCustomTitle}
                onChange={() => setUseCustomTitle(false)}
              /> Select from list
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                checked={useCustomTitle}
                onChange={() => setUseCustomTitle(true)}
              /> Custom title
            </label>
          </div>

          {!useCustomTitle ? (
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.select}
              required
            >
              <option value="" disabled>Choose a service type</option>
              {JOB_TITLES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Gearbox overhaul"
              style={styles.input}
              required
            />
          )}
        </div>

        {/* Description */}
        <div style={styles.field}>
          <label style={styles.label}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional details about the service..."
            rows={4}
            style={{ ...styles.input, resize: 'vertical' }}
          />
        </div>

        {/* Mileage */}
        <div style={styles.field}>
          <label style={styles.label}>Mileage (mi)</label>
          <input
            type="number"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            placeholder="e.g. 45000"
            style={styles.input}
          />
        </div>

        {/* Date */}
        <div style={styles.field}>
          <label style={styles.label}>Service Date</label>
          <input
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            style={styles.input}
            required
          />
        </div>

        {/* Image Upload */}
        <div style={styles.field}>
          <label style={styles.label}>Receipt / Photo (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={styles.fileInput}
          />
          {imagePreview && (
            <div style={styles.previewContainer}>
              <img src={imagePreview} alt="preview" style={styles.previewImage} />
            </div>
          )}
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>✓ Service event added! Redirecting...</div>}

        <div style={styles.buttonRow}>
          <button type="button" onClick={() => router.back()} style={styles.cancelButton} disabled={loading}>
            Cancel
          </button>
          <button type="submit" disabled={loading || success} style={styles.submitButton}>
            {loading ? 'Adding...' : 'Add Event'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9' },
  backButton: { background: 'transparent', border: '1px solid #334155', color: '#f1f5f9', padding: '8px 16px', borderRadius: 8, marginBottom: 24, cursor: 'pointer' },
  title: { fontSize: 32, fontWeight: 700, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 32 },
  form: { maxWidth: 600 },
  field: { marginBottom: 20 },
  label: { display: 'block', fontSize: 14, fontWeight: 500, color: '#94a3b8', marginBottom: 6 },
  input: { width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 16px', color: '#f1f5f9', fontSize: 16 },
  select: { width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 16px', color: '#f1f5f9', fontSize: 16 },
  radioGroup: { display: 'flex', gap: 20, marginBottom: 12 },
  radioLabel: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: '#94a3b8' },
  fileInput: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 10, color: '#94a3b8' },
  previewContainer: { marginTop: 10, width: 100, height: 75, borderRadius: 8, overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%', objectFit: 'cover' },
  errorBox: { marginTop: 16, padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 12, color: '#ef4444' },
  successBox: { marginTop: 16, padding: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: 12, color: '#22c55e' },
  buttonRow: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
  cancelButton: { background: 'transparent', border: '1px solid #334155', borderRadius: 12, padding: '12px 24px', color: '#94a3b8', cursor: 'pointer' },
  submitButton: { background: '#22c55e', border: 'none', borderRadius: 12, padding: '12px 24px', color: '#020617', fontWeight: 600, cursor: 'pointer' },
}