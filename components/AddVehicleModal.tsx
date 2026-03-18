'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'

interface AddVehicleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (vehicle: any) => void
}

export default function AddVehicleModal({ isOpen, onClose, onSuccess }: AddVehicleModalProps) {
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

  const handleLookup = async () => {
    if (!plate) {
      setError('Please enter a registration number')
      return
    }
    setLookupLoading(true)
    setError(null)
    setMotData(null)
    try {
      const res = await fetch(`/api/enrich/${normalizePlate(plate)}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Lookup failed')
      setMake(data.dvla?.make || '')
      setModel(data.dvla?.model || '')
      setYear(data.dvla?.yearOfManufacture?.toString() || '')
      setMotData(data.mot || null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLookupLoading(false)
    }
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
    const { data: urlData } = supabase.storage.from('vehicle-images').getPublicUrl(filePath)
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
        lat: 52.6369, // default coordinates
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
      onSuccess?.(data)
      setTimeout(() => {
        onClose()
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={styles.overlay}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          style={styles.modal}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 style={styles.title}>Add New Vehicle</h2>

          <form onSubmit={handleSubmit}>
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
                  {lookupLoading ? <div style={styles.spinnerSmall} /> : 'Lookup'}
                </button>
              </div>
            </div>

            {/* Make, Model */}
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

            {/* Year, Mileage */}
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
              <div style={styles.uploadArea}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={styles.fileInput}
                  id="vehicle-image"
                  disabled={submitting}
                />
                <label htmlFor="vehicle-image" style={styles.fileInputLabel}>
                  {imagePreview ? 'Change image' : 'Choose file'}
                </label>
                {imagePreview && (
                  <div style={styles.previewContainer}>
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      width={60}
                      height={40}
                      style={styles.previewImage}
                    />
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
            </div>

            {/* MOT Info */}
            {motData ? (
              <div style={styles.motBox}>
                <strong>MOT:</strong> {motData.status}
                {motData.expiryDate && ` – Expires ${new Date(motData.expiryDate).toLocaleDateString()}`}
              </div>
            ) : (
              <div style={styles.motBox}>
                <strong>MOT:</strong> No MOT data available
              </div>
            )}

            {/* Error / Success */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={styles.errorBox}
                >
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={styles.successBox}
                >
                  ✓ Vehicle added successfully!
                </motion.div>
              )}
            </AnimatePresence>

            {/* Buttons */}
            <div style={styles.buttonRow}>
              <button type="button" onClick={onClose} style={styles.cancelButton} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" disabled={submitting || success} style={styles.submitButton}>
                {submitting ? 'Adding...' : 'Add Vehicle'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '24px',
    padding: '32px',
    width: '100%',
    maxWidth: '520px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    marginBottom: '24px',
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#94a3b8',
    marginBottom: '6px',
  },
  row: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '12px 16px',
    color: '#f1f5f9',
    fontSize: '16px',
    outline: 'none',
  },
  lookupButton: {
    background: '#334155',
    border: 'none',
    borderRadius: '12px',
    padding: '0 20px',
    color: '#f1f5f9',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '80px',
  },
  rowFields: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '8px',
  },
  uploadArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  fileInput: {
    display: 'none',
  },
  fileInputLabel: {
    background: '#1e293b',
    border: '1px dashed #334155',
    borderRadius: '12px',
    padding: '10px 16px',
    color: '#94a3b8',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  previewContainer: {
    position: 'relative',
    width: '60px',
    height: '40px',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #334155',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  clearPreview: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    background: '#ef4444',
    border: 'none',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#fff',
    fontSize: '12px',
  },
  motBox: {
    marginTop: '8px',
    marginBottom: '16px',
    padding: '12px 16px',
    background: '#1e293b',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#94a3b8',
  },
  errorBox: {
    marginTop: '16px',
    padding: '12px 16px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    borderRadius: '12px',
    color: '#ef4444',
    fontSize: '14px',
  },
  successBox: {
    marginTop: '16px',
    padding: '12px 16px',
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid #22c55e',
    borderRadius: '12px',
    color: '#22c55e',
    fontSize: '14px',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  cancelButton: {
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '12px 24px',
    color: '#94a3b8',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  submitButton: {
    background: '#22c55e',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 24px',
    color: '#020617',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '120px',
  },
  spinnerSmall: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255,255,255,0.2)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
}