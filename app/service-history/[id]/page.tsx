'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { Calendar, Wrench, MapPin, Camera, Edit2, Trash2, ArrowLeft, Save, X } from 'lucide-react'
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
  created_at: string
  vehicle?: {
    id: string
    license_plate: string
    make: string | null
    model: string | null
  }
}

export default function ServiceEventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const [event, setEvent] = useState<ServiceEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    mileage: '',
    occurred_at: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchEvent()
  }, [eventId])

  async function fetchEvent() {
    try {
      setLoading(true)
      const res = await fetch(`/api/service-events/${eventId}`)
      if (!res.ok) throw new Error('Event not found')
      const data = await res.json()
      setEvent(data)
      setEditForm({
        title: data.title,
        description: data.description || '',
        mileage: data.mileage?.toString() || '',
        occurred_at: data.occurred_at.slice(0, 10), // yyyy-mm-dd
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
    const filePath = `service-events/${fileName}`
    const { error: uploadError } = await supabase.storage
      .from('service-images')
      .upload(filePath, imageFile)
    if (uploadError) throw new Error('Failed to upload image')
    const { data: urlData } = supabase.storage
      .from('service-images')
      .getPublicUrl(filePath)
    return urlData.publicUrl
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      let imageUrl = event?.image_url
      if (imageFile) {
        imageUrl = await uploadImage()
      }

      const payload = {
        title: editForm.title,
        description: editForm.description || null,
        mileage: editForm.mileage ? parseInt(editForm.mileage) : null,
        occurred_at: editForm.occurred_at,
        image_url: imageUrl,
      }

      const res = await fetch(`/api/service-events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Update failed')
      const updated = await res.json()
      setEvent(updated)
      setIsEditing(false)
      setImageFile(null)
      setImagePreview(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this service event?')) return
    try {
      const res = await fetch(`/api/service-events/${eventId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      router.push('/service-history')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.page}
    >
      <button onClick={() => router.back()} style={styles.backButton}>
        <ArrowLeft size={16} /> Back
      </button>

      <div style={styles.header}>
        <h1 style={styles.title}>Service Event</h1>
        <div style={styles.headerActions}>
          {!isEditing && (
            <>
              <button onClick={() => setIsEditing(true)} style={styles.editButton}>
                <Edit2 size={16} /> Edit
              </button>
              <button onClick={handleDelete} style={styles.deleteButton}>
                <Trash2 size={16} /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleUpdate} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Title *</label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Description</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3}
              style={styles.textarea}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Mileage (mi)</label>
            <input
              type="number"
              value={editForm.mileage}
              onChange={(e) => setEditForm({ ...editForm, mileage: e.target.value })}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Date</label>
            <input
              type="date"
              value={editForm.occurred_at}
              onChange={(e) => setEditForm({ ...editForm, occurred_at: e.target.value })}
              style={styles.input}
              required
            />
          </div>

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
                <Camera size={16} />
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
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} style={styles.clearPreview}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <div style={styles.buttonRow}>
            <button type="button" onClick={() => setIsEditing(false)} style={styles.cancelButton} disabled={saving}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={styles.submitButton}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div style={styles.detailCard}>
          {/* Vehicle Info */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Vehicle</h3>
            <div style={styles.vehicleBadge}>
              <span style={styles.vehiclePlate}>{event.vehicle?.license_plate || 'Unknown'}</span>
              <span style={styles.vehicleName}>
                {event.vehicle?.make} {event.vehicle?.model}
              </span>
            </div>
          </div>

          {/* Event Details */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Event Details</h3>
            <div style={styles.detailRow}>
              <Wrench size={16} color="#64748b" />
              <span style={styles.detailLabel}>Title:</span>
              <span style={styles.detailValue}>{event.title}</span>
            </div>
            {event.description && (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Description:</span>
                <span style={styles.detailValue}>{event.description}</span>
              </div>
            )}
            {event.mileage && (
              <div style={styles.detailRow}>
                <MapPin size={16} color="#64748b" />
                <span style={styles.detailLabel}>Mileage:</span>
                <span style={styles.detailValue}>{event.mileage.toLocaleString()} mi</span>
              </div>
            )}
            <div style={styles.detailRow}>
              <Calendar size={16} color="#64748b" />
              <span style={styles.detailLabel}>Date:</span>
              <span style={styles.detailValue}>{format(new Date(event.occurred_at), 'PPPP')}</span>
            </div>
          </div>

          {/* Image */}
          {event.image_url && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Receipt / Photo</h3>
              <div style={styles.imageContainer}>
                <Image
                  src={event.image_url}
                  alt="receipt"
                  width={300}
                  height={200}
                  style={styles.eventImage}
                />
              </div>
            </div>
          )}
        </div>
      )}

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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
  },
  editButton: {
    background: 'transparent',
    border: '1px solid #3b82f6',
    color: '#3b82f6',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  deleteButton: {
    background: 'transparent',
    border: '1px solid #ef4444',
    color: '#ef4444',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  detailCard: {
    background: '#0f172a',
    borderRadius: '16px',
    border: '1px solid #1e293b',
    padding: '24px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: '12px',
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
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  detailLabel: {
    fontSize: '14px',
    color: '#64748b',
    minWidth: '80px',
  },
  detailValue: {
    fontSize: '14px',
    color: '#f1f5f9',
  },
  imageContainer: {
    marginTop: '8px',
    borderRadius: '8px',
    overflow: 'hidden',
    maxWidth: '300px',
  },
  eventImage: {
    width: '100%',
    height: 'auto',
    objectFit: 'cover',
  },
  form: {
    background: '#0f172a',
    borderRadius: '16px',
    border: '1px solid #1e293b',
    padding: '24px',
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
  input: {
    width: '100%',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#f1f5f9',
    fontSize: '14px',
  },
  textarea: {
    width: '100%',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#f1f5f9',
    fontSize: '14px',
    resize: 'vertical',
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
    gap: '6px',
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
  errorBox: {
    marginTop: '16px',
    padding: '10px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    color: '#ef4444',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '16px',
  },
  cancelButton: {
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 20px',
    color: '#94a3b8',
    cursor: 'pointer',
  },
  submitButton: {
    background: '#22c55e',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    color: '#020617',
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