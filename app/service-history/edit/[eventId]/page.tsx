'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { Camera, X, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'

type ServiceEvent = {
  id: string
  vehicle_id: string
  title: string
  description: string | null
  mileage: number | null
  occurred_at: string
  image_url: string | null
  vehicle?: {
    id: string
    license_plate: string
    make: string | null
    model: string | null
  }
}

export default function EditServiceEventPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.eventId as string

  const [event, setEvent] = useState<ServiceEvent | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [mileage, setMileage] = useState('')
  const [occurredAt, setOccurredAt] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!eventId) return
    fetchEvent()
  }, [eventId])

  async function fetchEvent() {
    try {
      setLoading(true)
      const res = await fetch(`/api/service-events/${eventId}`)
      if (!res.ok) throw new Error('Event not found')
      const data = await res.json()
      setEvent(data)
      setTitle(data.title)
      setDescription(data.description || '')
      setMileage(data.mileage?.toString() || '')
      setOccurredAt(data.occurred_at.slice(0, 10)) // yyyy-mm-dd
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

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
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
      throw new Error('Failed to upload image')
    }
    const { data: urlData } = supabase.storage
      .from('service-images')
      .getPublicUrl(filePath)
    return urlData.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      let imageUrl = event?.image_url
      if (imageFile) {
        imageUrl = await uploadImage()
      }

      const payload = {
        title,
        description: description.trim() || null,
        mileage: mileage ? parseInt(mileage) : null,
        occurred_at: occurredAt,
        image_url: imageUrl,
      }

      const res = await fetch(`/api/service-events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update event')

      setSuccess(true)
      setTimeout(() => {
        router.push('/service-history')
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
        <p>Loading event details...</p>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div style={styles.centered}>
        <h2>Error</h2>
        <p>{error || 'Event not found'}</p>
        <button onClick={() => router.push('/service-history')} style={styles.retryButton}>
          Back to Service History
        </button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={styles.page}
    >
      <button onClick={() => router.back()} style={styles.backButton}>
        <ArrowLeft size={16} /> Back
      </button>

      <h1 style={styles.title}>Edit Service Event</h1>

      {/* Vehicle info (read‑only) */}
      {event.vehicle && (
        <div style={styles.vehicleInfo}>
          <span style={styles.vehicleLabel}>Vehicle</span>
          <div style={styles.vehicleBadge}>
            <span style={styles.vehiclePlate}>{event.vehicle.license_plate}</span>
            <span style={styles.vehicleName}>
              {event.vehicle.make} {event.vehicle.model}
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Title */}
        <div style={styles.field}>
          <label style={styles.label}>Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={styles.input}
            required
          />
        </div>

        {/* Description */}
        <div style={styles.field}>
          <label style={styles.label}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
          <label style={styles.label}>Receipt / Photo</label>
          <div style={styles.uploadArea}>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={styles.fileInput}
              id="edit-service-image"
            />
            <label htmlFor="edit-service-image" style={styles.uploadLabel}>
              <Camera size={18} />
              {imageFile ? 'Change image' : 'Upload new image'}
            </label>
            {(imagePreview || event.image_url) && (
              <div style={styles.previewContainer}>
                <img
                  src={imagePreview || event.image_url || ''}
                  alt="preview"
                  style={styles.previewImage}
                />
                {imagePreview && (
                  <button type="button" onClick={clearImage} style={styles.clearPreview}>
                    <X size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
          {event.image_url && !imageFile && (
            <p style={styles.imageNote}>Current image will be kept unless you upload a new one.</p>
          )}
        </div>

        {/* Error / Success */}
        {error && <div style={styles.errorBox}>{error}</div>}
        {success && (
          <div style={styles.successBox}>
            ✓ Event updated! Redirecting...
          </div>
        )}

        {/* Submit Button */}
        <div style={styles.buttonRow}>
          <button
            type="button"
            onClick={() => router.back()}
            style={styles.cancelButton}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || success}
            style={styles.submitButton}
          >
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
  page: {
    padding: '40px',
    background: '#020617',
    minHeight: '100vh',
    color: '#f1f5f9',
    fontFamily: 'Inter, sans-serif',
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
  },
  backButton: {
    background: 'transparent',
    border: '1px solid #334155',
    color: '#f1f5f9',
    padding: '8px 16px',
    borderRadius: '8px',
    marginBottom: '24px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '24px',
  },
  vehicleInfo: {
    marginBottom: '24px',
    background: '#0f172a',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #1e293b',
  },
  vehicleLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#94a3b8',
    marginBottom: '8px',
  },
  vehicleBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#1e293b',
    padding: '8px 12px',
    borderRadius: '8px',
  },
  vehiclePlate: {
    background: '#0f172a',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 600,
  },
  vehicleName: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  form: {
    maxWidth: '600px',
  },
  field: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#94a3b8',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '12px 16px',
    color: '#f1f5f9',
    fontSize: '16px',
    outline: 'none',
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
  uploadLabel: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '30px',
    padding: '8px 16px',
    color: '#f1f5f9',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  previewContainer: {
    position: 'relative',
    width: '60px',
    height: '60px',
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
  },
  imageNote: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#64748b',
  },
  errorBox: {
    marginTop: '16px',
    padding: '12px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    color: '#ef4444',
  },
  successBox: {
    marginTop: '16px',
    padding: '12px',
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid #22c55e',
    borderRadius: '8px',
    color: '#22c55e',
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
    cursor: 'pointer',
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
  },
  retryButton: {
    marginTop: '16px',
    padding: '8px 16px',
    background: '#22c55e',
    border: 'none',
    borderRadius: '4px',
    color: '#020617',
    cursor: 'pointer',
  },
}