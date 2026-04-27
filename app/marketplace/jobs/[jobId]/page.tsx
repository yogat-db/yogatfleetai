'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, DollarSign, Calendar, MessageSquare, AlertCircle, Loader2, CheckCircle, XCircle, Shield, Zap, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import theme from '@/app/theme';

// Dynamically import PaymentForm and ChatWindow to avoid SSR issues and reduce bundle size
const PaymentForm = dynamic(() => import('@/components/PaymentForm'), { ssr: false, loading: () => <div style={{ padding: 20, textAlign: 'center' }}>Loading payment...</div> });
const ChatWindow = dynamic(() => import('@/components/ChatWindow'), { ssr: false, loading: () => <div style={{ padding: 20, textAlign: 'center' }}>Loading chat...</div> });

// Types
interface Job {
  id: string;
  title: string;
  description: string;
  budget: number;
  status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  location?: string;
  user_id: string;
  assigned_mechanic_id?: string;
  created_at: string;
  updated_at?: string;
  vehicle_id?: string;
  vehicle?: { 
    make: string; 
    model: string; 
    license_plate: string;
    year?: number;
    fuel_type?: string;
  };
}

interface Application {
  id: string;
  mechanic_id: string;
  bid_amount: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  mechanic?: { 
    business_name: string; 
    id: string;
    rating?: number;
    verified?: boolean;
  };
}

interface State {
  job: Job | null;
  applications: Application[];
  user: any | null;
  isMechanic: boolean;
  mechanicId: string | null;
  loading: boolean;
  error: string | null;
  hasApplied: boolean;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [state, setState] = useState<State>({
    job: null,
    applications: [],
    user: null,
    isMechanic: false,
    mechanicId: null,
    loading: true,
    error: null,
    hasApplied: false,
  });
  const [selectedApp, setSelectedApp] = useState<{ id: string; mechanicId: string; amount: number } | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // 1. Auth
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw new Error(authErr.message);

      // 2. Mechanic check
      let mechanicData = null;
      if (user) {
        const { data: m } = await supabase
          .from('mechanics')
          .select('id, verified, rating')
          .eq('user_id', user.id)
          .maybeSingle();
        mechanicData = m;
      }

      // 3. Job details with vehicle
      const { data: jobData, error: jobErr } = await supabase
        .from('jobs')
        .select(`*, vehicle:vehicles(make, model, license_plate, year, fuel_type)`)
        .eq('id', jobId)
        .single();

      if (jobErr) throw new Error(jobErr.message);
      if (!jobData) throw new Error('Job not found');

      // 4. Fetch applications if user is owner
      let appsData: Application[] = [];
      let hasAppliedFlag = false;
      if (user && jobData.user_id === user.id) {
        const { data: apps, error: appsErr } = await supabase
          .from('applications')
          .select(`*, mechanic:mechanics(business_name, id, rating, verified)`)
          .eq('job_id', jobId)
          .order('created_at', { ascending: false });
        if (!appsErr) appsData = apps || [];
      } else if (user && mechanicData) {
        // Mechanic (not owner) – check if already applied
        const { data: existing } = await supabase
          .from('applications')
          .select('id')
          .eq('job_id', jobId)
          .eq('mechanic_id', mechanicData.id)
          .maybeSingle();
        hasAppliedFlag = !!existing;
      }

      setState({
        job: jobData,
        applications: appsData,
        user,
        isMechanic: !!mechanicData && mechanicData.verified === true,
        mechanicId: mechanicData?.id || null,
        loading: false,
        error: null,
        hasApplied: hasAppliedFlag,
      });

      // 5. Fetch related affiliate products based on vehicle/job
      await fetchRelatedProducts(jobData);
    } catch (err: any) {
      console.error('JobDetail fetch error:', err);
      setState(prev => ({ ...prev, loading: false, error: err.message || 'Failed to load job details' }));
    }
  }, [jobId]);

  const fetchRelatedProducts = async (job: Job) => {
    try {
      setLoadingProducts(true);
      let searchQuery = job.title; // Default to job title

      // Better search query using vehicle make/model
      if (job.vehicle?.make && job.vehicle?.model) {
        searchQuery = `${job.vehicle.make} ${job.vehicle.model} parts`;
      }

      const { data: products, error } = await supabase
        .from('affiliate_products')
        .select('*')
        .eq('active', true)
        .textSearch('name', searchQuery, { type: 'websearch' })
        .limit(3);

      if (!error && products) {
        setRelatedProducts(products);
      }
    } catch (err) {
      console.warn('Failed to load related products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const initiateAcceptance = (app: Application) => {
    if (!state.job || state.job.status !== 'open') {
      alert('Job is no longer open for acceptance');
      return;
    }
    setSelectedApp({
      id: app.id,
      mechanicId: app.mechanic_id,
      amount: app.bid_amount || state.job.budget,
    });
    setTimeout(() => {
      document.getElementById('payment-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handlePaymentSuccess = async () => {
    setPaymentProcessing(true);
    try {
      // After payment confirms escrow, update job status to 'assigned' and set mechanic
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'assigned',
          assigned_mechanic_id: selectedApp?.mechanicId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      if (error) throw error;

      // Update application status to 'accepted'
      if (selectedApp) {
        await supabase
          .from('applications')
          .update({ status: 'accepted' })
          .eq('id', selectedApp.id);
      }

      // Track job acceptance in analytics
      try {
        await fetch('/api/analytics/job-accepted', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            mechanicId: selectedApp?.mechanicId,
            budget: selectedApp?.amount,
          }),
        });
      } catch (e) {
        console.warn('Analytics tracking failed:', e);
      }

      setSelectedApp(null);
      await fetchData(); // refresh UI
    } catch (err: any) {
      alert(`Payment completed but job update failed: ${err.message}`);
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleViewAffiliate = (product: any) => {
    window.open(product.affiliate_link, '_blank', 'noopener,noreferrer');
    
    // Track affiliate click from job page
    try {
      fetch('/api/affiliate/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          platform: product.platform,
          destinationUrl: product.affiliate_link,
          source: 'job_detail',
          jobId,
        }),
      }).catch(() => {});
    } catch (e) {
      console.warn('Affiliate tracking failed:', e);
    }
  };

  const { job, user, applications, isMechanic, mechanicId, loading, error, hasApplied } = state;
  const isOwner = user?.id === job?.user_id;
  const isAssigned = job?.assigned_mechanic_id === mechanicId;
  const showChat = job?.status === 'assigned' && (isOwner || isAssigned);

  // Status color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#22c55e';
      case 'assigned': return '#3b82f6';
      case 'in_progress': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'cancelled': return '#64748b';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={styles.centered}>
        <Loader2 className="animate-spin" size={40} color={theme.colors.primary} />
        <p style={{ marginTop: 12, color: theme.colors.text.secondary }}>Loading job details...</p>
        <style>{` .animate-spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } `}</style>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div style={styles.centered}>
        <AlertCircle size={48} color={theme.colors.status.critical} />
        <p style={{ margin: '16px 0', color: theme.colors.text.primary }}>{error || "Job not found"}</p>
        <button onClick={() => router.back()} style={styles.backButton}>← Go Back</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <header style={styles.header}>
        <button onClick={() => router.push('/marketplace/jobs')} style={styles.backButton}>← Browse Jobs</button>
        <div style={styles.statusGroup}>
          <span style={{
            ...styles.badge,
            background: getStatusColor(job.status),
            color: '#fff'
          }}>
            {job.status.toUpperCase()}
          </span>
        </div>
      </header>

      <div style={styles.grid}>
        {/* Left Column: Job Details */}
        <section style={styles.mainCard}>
          <h1 style={styles.title}>{job.title}</h1>
          <div style={styles.metaRow}>
            <div style={styles.iconTag}><DollarSign size={16} /> £{job.budget?.toLocaleString()}</div>
            <div style={styles.iconTag}><MapPin size={16} /> {job.location || 'Remote'}</div>
            <div style={styles.iconTag}><Calendar size={16} /> {new Date(job.created_at).toLocaleDateString()}</div>
          </div>
          <hr style={styles.divider} />
          <p style={styles.description}>{job.description}</p>
          
          {job.vehicle && (
            <div style={styles.vehicleBox}>
              <h4 style={{ margin: '0 0 8px 0', color: theme.colors.text.primary }}>Vehicle Specification</h4>
              <p style={{ color: theme.colors.text.secondary }}>
                {job.vehicle.make} {job.vehicle.model}
                {job.vehicle.year && ` (${job.vehicle.year})`}
                {job.vehicle.fuel_type && ` • ${job.vehicle.fuel_type}`}
              </p>
              <p style={{ ...styles.plate, display: 'inline-block', marginTop: 8 }}>{job.vehicle.license_plate}</p>
            </div>
          )}

          {/* Related Products Section */}
          {relatedProducts.length > 0 && (
            <div style={styles.relatedProductsSection}>
              <div style={styles.sectionHeader}>
                <TrendingUp size={18} />
                <h3 style={{ margin: 0 }}>Recommended Parts & Accessories</h3>
              </div>
              <p style={styles.relatedProductsSubtitle}>Parts commonly needed for this job</p>
              <div style={styles.productGrid}>
                {relatedProducts.map(product => (
                  <div key={product.id} style={styles.productCard}>
                    <div style={styles.productImage}>
                      <img 
                        src={product.image_url || '/placeholder-car.png'} 
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={styles.productInfo}>
                      <p style={styles.productName}>{product.name}</p>
                      <p style={styles.productPrice}>£{product.price?.toFixed(2)}</p>
                      <button 
                        onClick={() => handleViewAffiliate(product)}
                        style={styles.affiliateBtn}
                      >
                        View Deal
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p style={styles.disclaimerSmall}>
                <Shield size={12} style={{ display: 'inline', marginRight: 4 }} />
                We earn commission from affiliate purchases at no cost to you.
              </p>
            </div>
          )}
        </section>

        {/* Right Column: Applications or Actions */}
        <aside style={styles.sideCard}>
          {isOwner ? (
            <div style={styles.ownerView}>
              <h3 style={styles.sectionTitle}>Mechanic Applications ({applications.length})</h3>
              {applications.length === 0 ? (
                <div style={styles.emptyState}>Waiting for bids...</div>
              ) : (
                <div style={styles.appList}>
                  {applications.map(app => (
                    <motion.div 
                      key={app.id}
                      whileHover={{ scale: 1.02 }}
                      style={{
                        ...styles.appItem,
                        border: selectedApp?.id === app.id ? `2px solid ${theme.colors.primary}` : `1px solid ${theme.colors.border.light}`
                      }}
                    >
                      <div style={styles.appHeader}>
                        <div>
                          <strong style={{ display: 'block' }}>{app.mechanic?.business_name || "Professional Mechanic"}</strong>
                          {app.mechanic?.verified && (
                            <span style={styles.verifiedBadge}>✓ Verified</span>
                          )}
                          {app.mechanic?.rating && (
                            <span style={styles.ratingBadge}>⭐ {app.mechanic.rating.toFixed(1)}</span>
                          )}
                        </div>
                        <span style={styles.priceTag}>£{app.bid_amount}</span>
                      </div>
                      <p style={styles.appText}>{app.message}</p>
                      {job.status === 'open' && (
                        <button onClick={() => initiateAcceptance(app)} style={styles.selectBtn}>
                          Select Mechanic & Escrow
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={styles.mechanicView}>
              {job.status === 'open' && isMechanic && !hasApplied && (
                <button onClick={() => router.push(`/marketplace/jobs/${jobId}/apply`)} style={styles.primaryBtn}>
                  Submit Quote
                </button>
              )}
              {hasApplied && job.status === 'open' && (
                <div style={styles.infoBanner}>
                  <CheckCircle size={16} /> Application submitted – owner will review
                </div>
              )}
              {job.status !== 'open' && (
                <div style={styles.infoBanner}>
                  This job is no longer accepting applications.
                </div>
              )}
              {!isMechanic && (
                <div style={styles.infoBanner}>
                  Register as a mechanic to bid on jobs.
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Payment & Escrow Section */}
      <AnimatePresence>
        {isOwner && selectedApp && job.status === 'open' && !paymentProcessing && (
          <motion.section
            id="payment-section"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.paymentContainer}
          >
            <div style={styles.paymentHeader}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', color: theme.colors.text.primary }}>Secure Escrow Payment</h2>
                <p style={{ ...styles.mutedText, margin: 0 }}>Funds held safely until job completion</p>
              </div>
              <button onClick={() => setSelectedApp(null)} style={styles.closeBtn}>✕</button>
            </div>
            <p style={styles.mutedText}>
              You are authorising £{selectedApp.amount.toFixed(2)}. Funds are held securely and only released to the mechanic upon your completion approval.
            </p>
            <div style={styles.formWrapper}>
  <PaymentForm
    amount={selectedApp.amount * 100}  // already in pence
    currency="gbp"
    jobId={jobId}
    mechanicId={selectedApp.mechanicId}
    onSuccess={handlePaymentSuccess}
    // ❌ Remove onError – not needed; errors are shown inside the form
  />
</div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Chat Section */}
      {showChat && (
        <section style={styles.chatWrapper}>
          <div style={styles.chatHeader}>
            <MessageSquare size={20} />
            <span>Secure Job Communication</span>
          </div>
          <ChatWindow
            jobId={job.id}
            currentUserId={user.id}
            otherUserId={isOwner ? job.assigned_mechanic_id! : job.user_id}
            otherUserName={isOwner ? 'Assigned Mechanic' : 'Vehicle Owner'}
          />
        </section>
      )}
    </motion.div>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px 5%', background: theme.colors.background.main, minHeight: '100vh', fontFamily: theme.fontFamilies.sans },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 32 },
  mainCard: { background: theme.colors.background.card, padding: 32, borderRadius: 24, border: `1px solid ${theme.colors.border.light}` },
  sideCard: { background: theme.colors.background.card, padding: 24, borderRadius: 24, border: `1px solid ${theme.colors.border.light}`, height: 'fit-content' },
  title: { fontSize: '2.5rem', fontWeight: 800, margin: '0 0 16px 0', color: theme.colors.text.primary },
  metaRow: { display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 24, color: theme.colors.text.secondary },
  iconTag: { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' },
  badge: { padding: '6px 16px', borderRadius: 100, fontWeight: 700, fontSize: '0.75rem', letterSpacing: 1 },
  description: { fontSize: '1.1rem', lineHeight: 1.7, color: theme.colors.text.secondary, whiteSpace: 'pre-line' },
  vehicleBox: { marginTop: 32, padding: 20, background: theme.colors.background.subtle, borderRadius: 16, border: `1px solid ${theme.colors.border.light}` },
  plate: { background: '#fbbf24', color: '#000', padding: '4px 12px', borderRadius: 6, fontWeight: 'bold', fontSize: '0.85rem' },
  divider: { margin: '24px 0', border: 0, borderTop: `1px solid ${theme.colors.border.light}` },
  appList: { display: 'flex', flexDirection: 'column', gap: 16 },
  appItem: { padding: 16, borderRadius: 16, background: theme.colors.background.subtle, transition: 'all 0.2s ease' },
  appHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' },
  priceTag: { color: theme.colors.primary, fontWeight: 700, fontSize: '1.2rem' },
  appText: { fontSize: '0.9rem', color: theme.colors.text.muted, margin: '8px 0' },
  verifiedBadge: { fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginLeft: 4 },
  ratingBadge: { fontSize: '0.75rem', color: theme.colors.primary, fontWeight: 600, marginLeft: 8 },
  selectBtn: { width: '100%', padding: '10px', borderRadius: 12, border: 'none', background: theme.colors.primary, color: '#fff', fontWeight: 600, cursor: 'pointer', marginTop: 8, transition: 'all 0.2s' },
  primaryBtn: { width: '100%', padding: '16px', borderRadius: 16, border: 'none', background: theme.colors.primary, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' },
  paymentContainer: { marginTop: 40, padding: 32, background: theme.colors.background.card, borderRadius: 24, border: `2px solid ${theme.colors.primary}`, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' },
  paymentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  formWrapper: { maxWidth: 500, margin: '24px 0' },
  chatWrapper: { marginTop: 40, borderRadius: 24, overflow: 'hidden', border: `1px solid ${theme.colors.border.light}`, background: theme.colors.background.card },
  chatHeader: { padding: '16px 24px', background: theme.colors.background.subtle, display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, color: theme.colors.text.primary },
  backButton: { background: 'none', border: `1px solid ${theme.colors.border.medium}`, padding: '8px 16px', borderRadius: 12, cursor: 'pointer', color: theme.colors.text.secondary, transition: 'all 0.2s' },
  centered: { minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  infoBanner: { padding: 16, textAlign: 'center', borderRadius: 12, background: theme.colors.background.subtle, color: theme.colors.text.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyState: { textAlign: 'center', padding: 40, color: theme.colors.text.muted },
  closeBtn: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: theme.colors.text.muted },
  mutedText: { color: theme.colors.text.muted, fontSize: '0.95rem' },
  sectionTitle: { fontSize: '1.2rem', fontWeight: 700, marginBottom: 16, color: theme.colors.text.primary },
  ownerView: { display: 'flex', flexDirection: 'column' },
  mechanicView: { display: 'flex', flexDirection: 'column', gap: 12 },
  
  // Related products section
  relatedProductsSection: { marginTop: 40, padding: 24, background: theme.colors.background.subtle, borderRadius: 16, border: `1px solid ${theme.colors.border.light}` },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  relatedProductsSubtitle: { color: theme.colors.text.muted, fontSize: '0.9rem', margin: 0 },
  productGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16, marginTop: 16 },
  productCard: { background: theme.colors.background.card, borderRadius: 12, overflow: 'hidden', border: `1px solid ${theme.colors.border.light}`, transition: 'all 0.2s' },
  productImage: { width: '100%', height: '120px', overflow: 'hidden', background: theme.colors.background.main },
  productInfo: { padding: 12 },
  productName: { fontSize: '0.85rem', fontWeight: 600, color: theme.colors.text.primary, margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  productPrice: { fontSize: '0.9rem', fontWeight: 700, color: theme.colors.primary, margin: '4px 0 8px 0' },
  affiliateBtn: { width: '100%', padding: '6px 12px', borderRadius: 8, border: 'none', background: theme.colors.primary, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s' },
  disclaimerSmall: { fontSize: '0.75rem', color: theme.colors.text.muted, marginTop: 12, display: 'flex', alignItems: 'center', gap: 4 },
  statusGroup: { display: 'flex', gap: 12 },
};
