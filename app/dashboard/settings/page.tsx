'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useOrg } from '../hooks/useOrg'
import { supabase } from '@/lib/supabase'

export default function DashboardSettingsPage() {
  const { org, loading, error } = useOrg()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (org) setName(org.name)
  }, [org])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSuccess(false)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name })
        .eq('id', org!.id)
      if (error) throw error
      setSuccess(true)
    } catch (err: any) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={styles.centered}>Loading...</div>
  if (error) return <div style={styles.centered}>Error: {error}</div>
  if (!org) return <div style={styles.centered}>No organization found</div>

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <h1 style={styles.title}>Organization Settings</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label>Organization Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={styles.input} required />
        </div>
        {saveError && <div style={styles.error}>{saveError}</div>}
        {success && <div style={styles.success}>Settings saved!</div>}
        <button type="submit" disabled={saving} style={styles.button}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </motion.div>
  )
}

const styles = {
  page: { padding: 40, background: '#020617', minHeight: '100vh', color: '#f1f5f9' },
  title: { fontSize: 32, fontWeight: 700, marginBottom: 24 },
  centered: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  form: { maxWidth: 500 },
  field: { marginBottom: 16 },
  input: { width: '100%', padding: 8, background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#f1f5f9' },
  button: { background: '#22c55e', color: '#020617', padding: '10px 20px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600 },
  error: { color: '#ef4444', marginTop: 8 },
  success: { color: '#22c55e', marginTop: 8 },
}