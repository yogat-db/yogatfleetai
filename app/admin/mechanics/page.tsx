import { supabaseAdmin } from '@/lib/supabase/admin'
import { CheckCircle, XCircle, Mail, Phone, MapPin, Star } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

type Mechanic = {
  id: string
  user_id: string
  business_name: string
  phone: string | null
  address: string | null
  lat: number | null
  lng: number | null
  verified: boolean
  subscription_status: string
  created_at: string
}

// Server action to toggle verification
async function toggleVerification(formData: FormData) {
  'use server'
  const mechanicId = formData.get('mechanicId') as string
  const currentVerified = formData.get('currentVerified') === 'true'

  const { error } = await supabaseAdmin
    .from('mechanics')
    .update({ verified: !currentVerified })
    .eq('id', mechanicId)

  if (error) {
    console.error('Verification update failed:', error)
    throw new Error('Failed to update verification')
  }

  revalidatePath('/admin/mechanics')
  redirect('/admin/mechanics')
}

export default async function AdminMechanicsPage() {
  try {
    // Fetch mechanics
    const { data: mechanics, error: mechanicsError } = await supabaseAdmin
      .from('mechanics')
      .select('*')
      .order('created_at', { ascending: false })

    if (mechanicsError) throw new Error(mechanicsError.message)

    const typedMechanics = (mechanics as Mechanic[]) || []

    // Get all user IDs
    const userIds = typedMechanics.map((m) => m.user_id).filter(Boolean)

    // Fetch user emails using Admin API
    let userEmails: Record<string, string> = {}
    if (userIds.length) {
      const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
      if (!usersError && users) {
        userEmails = users.users.reduce((acc, u) => {
          acc[u.id] = u.email || ''
          return acc
        }, {} as Record<string, string>)
      } else {
        console.error('Failed to fetch users:', usersError)
      }
    }

    // Enrich mechanics with email
    const enrichedMechanics = typedMechanics.map((m) => ({
      ...m,
      user: { email: userEmails[m.user_id] || '' },
    }))

    return (
      <div style={styles.page}>
        <h1 style={styles.title}>Mechanic Verification</h1>
        <div style={styles.grid}>
          {enrichedMechanics.map((mechanic) => (
            <div
              key={mechanic.id}
              style={{ ...styles.card, borderColor: mechanic.verified ? '#22c55e' : '#1e293b' }}
            >
              <div style={styles.cardHeader}>
                <h3 style={styles.businessName}>{mechanic.business_name}</h3>
                {mechanic.verified ? (
                  <CheckCircle size={20} color="#22c55e" />
                ) : (
                  <XCircle size={20} color="#ef4444" />
                )}
              </div>
              <div style={styles.detailRow}>
                <Mail size={14} color="#64748b" />
                <span>{mechanic.user?.email}</span>
              </div>
              {mechanic.phone && (
                <div style={styles.detailRow}>
                  <Phone size={14} color="#64748b" />
                  <span>{mechanic.phone}</span>
                </div>
              )}
              {mechanic.address && (
                <div style={styles.detailRow}>
                  <MapPin size={14} color="#64748b" />
                  <span>{mechanic.address}</span>
                </div>
              )}
              <div style={styles.detailRow}>
                <Star size={14} color="#64748b" />
                <span>Subscription: {mechanic.subscription_status}</span>
              </div>
              <div style={styles.cardFooter}>
                <span style={styles.date}>
                  Joined: {new Date(mechanic.created_at).toLocaleDateString()}
                </span>
                <form action={toggleVerification}>
                  <input type="hidden" name="mechanicId" value={mechanic.id} />
                  <input type="hidden" name="currentVerified" value={String(mechanic.verified)} />
                  <button
                    type="submit"
                    style={mechanic.verified ? styles.unverifyButton : styles.verifyButton}
                  >
                    {mechanic.verified ? 'Remove' : 'Verify'}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  } catch (err) {
    console.error(err)
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>Mechanic Verification</h1>
        <div style={{ color: '#ef4444', padding: 20, background: '#0f172a', borderRadius: 8 }}>
          Failed to load mechanics. Please try again later.
        </div>
      </div>
    )
  }
}

const styles = {
  page: { padding: '40px', background: '#020617', minHeight: '100vh', color: '#f1f5f9' },
  title: {
    fontSize: 32,
    fontWeight: 700,
    marginBottom: 32,
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 },
  card: { background: '#0f172a', border: '1px solid', borderRadius: 16, padding: 20 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  businessName: { fontSize: 18, fontWeight: 600, margin: 0 },
  detailRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 14, color: '#94a3b8' },
  cardFooter: { marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12, color: '#64748b' },
  verifyButton: {
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    borderRadius: 6,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  unverifyButton: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
} as const