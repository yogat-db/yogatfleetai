'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'

export default function AddVehiclePage() {
  const router = useRouter()

  const [plate, setPlate] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [mileage, setMileage] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const [lookupLoading, setLookupLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [motData, setMotData] = useState<any>(null)

  const normalizePlate = (p: string) => p.toUpperCase().replace(/\s+/g, '')

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  // Mock DVLA lookup – replace with real API later
  const handleLookup = async () => {
    if (!plate) {
      setError('Please enter a registration number')
      return
    }
    setLookupLoading(true)
    setError(null)
    // Simulate network delay
    setTimeout(() => {
      setMake('NISSAN')
      setModel('QASHQAI')
      setYear('2015')
      setMotData({ status: 'Valid', expiryDate: '2024-12-01' })
      setLookupLoading(false)
    }, 800)
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `vehicles/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('vehicle-images')
      .upload(filePath, imageFile)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(uploadError.message)
    }

    const { data: urlData } = supabase.storage
      .from('vehicle-images')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const imageUrl = await uploadImage()

      const payload = {
        registration: normalizePlate(plate),
        make,
        model,
        year: year ? parseInt(year) : null,
        mileage: mileage ? parseInt(mileage) : null,
        image_url: imageUrl,
        // Default coordinates (can be updated later)
        lat: 52.6369,
        lng: -1.1398,
      }

      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add vehicle')

      setSuccess(true)
      setTimeout(() => {
        router.push('/vehicles')
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={styles.page}
    >
      <button onClick={() => router.back()} style={styles.backButton}>
        ← Back
      </button>

      <h1 style={styles.title}>Add New Vehicle</h1>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Registration + Lookup */}
        <div style={styles.field}>
          <label style={styles.label}>Registration Number *</label>
          <div style={styles.row}>
            <input
              type="text"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              style={styles.input}
              required
              disabled={lookupLoading || submitting}
            />
            <button
              type="button"
              onClick={handleLookup}
              disabled={lookupLoading || !plate || submitting}
              style={styles.lookupButton}
            >
              {lookupLoading ? '...' : 'Lookup'}
            </button>
          </div>
        </div>

        {/* Make & Model */}
        <div style={styles.rowFields}>
          <div style={styles.field}>
            <label style={styles.label}>Make</label>
            <input
              type="text"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              style={styles.input}
              disabled={submitting}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={styles.input}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Year & Mileage */}
        <div style={styles.rowFields}>
          <div style={styles.field}>
            <label style={styles.label}>Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              style={styles.input}
              disabled={submitting}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Mileage</label>
            <input
              type="number"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              style={styles.input}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Image Upload */}
        <div style={styles.field}>
          <label style={styles.label}>Vehicle Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={styles.fileInput}
            disabled={submitting}
          />
          {imagePreview && (
            <div style={styles.preview}>
              <Image
                src={imagePreview}
                alt="preview"
                width={100}
                height={75}
                style={styles.previewImage}
              />
            </div>
          )}
        </div>

        {/* MOT Info (if available) */}
        {motData && (
          <div style={styles.motBox}>
            MOT: {motData.status} – Expires {motData.expiryDate ? new Date(motData.expiryDate).toLocaleDateString() : 'N/A'}
          </div>
        )}

        {/* Error / Success */}
        {error && <div style={styles.errorBox}>{error}</div>}
        {success && (
          <div style={styles.successBox}>
            ✓ Vehicle added successfully! Redirecting...
          </div>
        )}

        {/* Buttons */}
        <div style={styles.buttonRow}>
          <button
            type="button"
            onClick={() => router.back()}
            style={styles.cancelButton}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || success}
            style={styles.submitButton}
          >
            {submitting ? 'Adding...' : 'Add Vehicle'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '40px',
    background: '#020617',
    minHeight: '100vh',
    color: '#f1f5f9',
    fontFamily: 'Inter, sans-serif',
  },
  backButton: {
    background: 'transparent',
    border: '1px solid #334155',
    color: '#f1f5f9',
    padding: '8px 16px',
    borderRadius: 8,
    marginBottom: 24,
    cursor: 'pointer',
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    marginBottom: 32,
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  form: {
    maxWidth: 600,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: '#94a3b8',
    marginBottom: 6,
  },
  row: {
    display: 'flex',
    gap: 8,
  },
  rowFields: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 12,
    padding: '12px 16px',
    color: '#f1f5f9',
    fontSize: 16,
    outline: 'none',
  },
  lookupButton: {
    background: '#334155',
    border: 'none',
    borderRadius: 12,
    padding: '0 20px',
    color: '#f1f5f9',
    fontWeight: 600,
    cursor: 'pointer',
  },
  fileInput: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 12,
    padding: 10,
    color: '#94a3b8',
  },
  preview: {
    marginTop: 10,
  },
  previewImage: {
    borderRadius: 8,
    objectFit: 'cover',
  },
  motBox: {
    marginTop: 8,
    padding: 12,
    background: '#1e293b',
    borderRadius: 12,
    fontSize: 14,
  },
  errorBox: {
    marginTop: 16,
    padding: 12,
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid #ef4444',
    borderRadius: 12,
    color: '#ef4444',
  },
  successBox: {
    marginTop: 16,
    padding: 12,
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid #22c55e',
    borderRadius: 12,
    color: '#22c55e',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: 12,
    padding: '12px 24px',
    color: '#94a3b8',
    cursor: 'pointer',
  },
  submitButton: {
    background: '#22c55e',
    border: 'none',
    borderRadius: 12,
    padding: '12px 24px',
    color: '#020617',
    fontWeight: 600,
    cursor: 'pointer',
  },
}