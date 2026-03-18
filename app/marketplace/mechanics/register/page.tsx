'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'

export default function MechanicRegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    business_name: '',
    phone: '',
    address: '',
    service_radius: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const geocodeAddress = async (address: string) => {
    // Mock geocoding – replace with real service (Mapbox, Google)
    return { lat: 52.6369, lng: -1.1398 }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { lat, lng } = await geocodeAddress(form.address)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const payload = {
        user_id: user.id,
        business_name: form.business_name,
        phone: form.phone || null,
        address: form.address,
        lat,
        lng,
        service_radius: form.service_radius ? parseInt(form.service_radius) : null,
      }

      const res = await fetch('/api/marketplace/mechanics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')

      setSuccess(true)
      setTimeout(() => router.push('/marketplace/mechanics/dashboard'), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={styles.page}
    >
      <h1 style={styles.title}>Become a Mechanic</h1>
      <p style={styles.subtitle}>Register to receive local repair jobs and grow your business.</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Business Name *</label>
          <input
            type="text"
            value={form.business_name}
            onChange={(e) => setForm({ ...form, business_name: e.target.value })}
            style={styles.input}
            required
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Phone Number</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Business Address *</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="e.g. 123 High Street, Leicester"
            style={styles.input}
            required
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Service Radius (miles)</label>
          <input
            type="number"
            value={form.service_radius}
            onChange={(e) => setForm({ ...form, service_radius: e.target.value })}
            placeholder="e.g. 20"
            style={styles.input}
          />
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>✓ Registration successful! Redirecting...</div>}

        <button type="submit" disabled={loading} style={styles.submitButton}>
          {loading ? 'Registering...' : 'Register as Mechanic'}
        </button>
      </form>
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9' },
  title: { fontSize: 32, fontWeight: 700, background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 },
  subtitle: { color: '#94a3b8', marginBottom: 32 },
  form: { maxWidth: 500 },
  field: { marginBottom: 20 },
  label: { display: 'block', fontSize: 14, fontWeight: 500, color: '#94a3b8', marginBottom: 6 },
  input: { width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 16px', color: '#f1f5f9' },
  errorBox: { marginTop: 16, padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, color: '#ef4444' },
  successBox: { marginTop: 16, padding: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: 8, color: '#22c55e' },
  submitButton: { width: '100%', background: '#22c55e', border: 'none', borderRadius: 12, padding: 12, color: '#020617', fontWeight: 600, cursor: 'pointer' },
}