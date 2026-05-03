// app/marketplace/jobs/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, MapPin, PoundSterling, Car, Calendar, AlertCircle, Search, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import toast from 'react-hot-toast';

interface Job {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  status: string;
  location?: string;
  user_id: string;
  created_at: string;
  vehicle?: { make: string; model: string; license_plate: string };
}

// Static filter options (mirror post page)
const CATEGORIES = [
  'Engine & Mechanical', 'Brakes & Suspension', 'Electrical & Electronics',
  'Transmission & Drivetrain', 'Exhaust & Emissions', 'Heating & Cooling',
  'Bodywork & Paint', 'Tyres & Wheels', 'Diagnostic only', 'Other'
];
const URGENCY_OPTIONS = [
  { value: 'immediate', label: 'Immediate', days: 1 },
  { value: 'week', label: 'Within a week', days: 7 },
  { value: 'month', label: 'Within a month', days: 30 },
  { value: 'flexible', label: 'Flexible', days: null }
];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'budget_high', label: 'Highest budget' },
  { value: 'budget_low', label: 'Lowest budget' },
  { value: 'urgent', label: 'Most urgent' }
];

export default function MarketplaceJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMechanic, setIsMechanic] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('');
  const [budgetMax, setBudgetMax] = useState<number>(1000);
  const [sortBy, setSortBy] = useState('newest');

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // 1. Check if user is a mechanic
      const { data: mechanic, error: mechError } = await supabase
        .from('mechanics')
        .select('id, verified')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (mechError) throw mechError;
      if (!mechanic) {
        setIsMechanic(false);
        setLoading(false);
        return;
      }
      setIsMechanic(true);

      // 2. Fetch open jobs NOT posted by current user
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select(`*, vehicle:vehicles(make, model, license_plate)`)
        .eq('status', 'open')
        .neq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);
    } catch (err: any) {
      console.error('Fetch jobs error:', err);
      setError(err.message);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Helper functions
  const extractCategory = (title: string): string | null => {
    const match = title.match(/^\[(.*?)\]/);
    return match ? match[1] : null;
  };

  const getUrgency = (job: Job): string => {
    const text = (job.title + ' ' + (job.description || '')).toLowerCase();
    if (text.includes('urgent')) return 'immediate';
    if (text.includes('week')) return 'week';
    if (text.includes('month')) return 'month';
    return 'flexible';
  };

  // Filter + sort logic
  const filteredJobs = jobs
    .filter(job => {
      // Search
      const matchesSearch = !searchTerm ||
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.location && job.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (job.description && job.description.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;
      
      // Category
      const jobCategory = extractCategory(job.title);
      if (selectedCategory && jobCategory !== selectedCategory) return false;
      
      // Budget
      if (budgetMax && job.budget !== null && job.budget > budgetMax) return false;
      
      // Urgency
      const urgency = getUrgency(job);
      if (selectedUrgency && urgency !== selectedUrgency) return false;
      
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'budget_high') return (b.budget || 0) - (a.budget || 0);
      if (sortBy === 'budget_low') return (a.budget || 0) - (b.budget || 0);
      if (sortBy === 'urgent') {
        const urgencyValue = (job: Job) => {
          const u = getUrgency(job);
          if (u === 'immediate') return 1;
          if (u === 'week') return 2;
          if (u === 'month') return 3;
          return 4;
        };
        return urgencyValue(a) - urgencyValue(b);
      }
      return 0;
    });

  if (loading) return <LoadingSkeleton />;
  if (isMechanic === false) {
    return (
      <div style={styles.centered}>
        <div style={styles.alertCard}>
          <AlertCircle size={40} color={theme.colors.primary} />
          <h2 style={{ color: '#fff', margin: '16px 0 8px' }}>Mechanic Access Required</h2>
          <p style={{ textAlign: 'center', marginBottom: '24px' }}>
            To view and apply for repair jobs, you must first register as a mechanic.
          </p>
          <button onClick={() => router.push('/marketplace/mechanics/register')} style={styles.registerButton}>
            Register as Mechanic
          </button>
        </div>
      </div>
    );
  }
  if (error && jobs.length === 0) {
    return (
      <div style={styles.centered}>
        <p style={{ color: '#ef4444' }}>Error: {error}</p>
        <button onClick={fetchJobs} style={styles.retryButton}>Retry</button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Available Jobs</h1>
        <p style={styles.subtitle}>Find repair opportunities near you and grow your business.</p>
      </header>

      {/* Search + Filters */}
      <div style={styles.searchBar}>
        <div style={styles.searchInputWrapper}>
          <Search size={18} color={theme.colors.text.muted} />
          <input
            type="text"
            placeholder="Search by title, location, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} style={styles.filterButton}>
          <SlidersHorizontal size={18} /> Filters
          {(selectedCategory || selectedUrgency || budgetMax < 1000) && <span style={styles.filterDot} />}
        </button>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={styles.sortSelect}>
          {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <div style={styles.resultCount}>{filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Expandable filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={styles.filterPanel}
          >
            <div style={styles.filterRow}>
              <div style={styles.filterGroup}>
                <label>Category</label>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={styles.filterSelect}>
                  <option value="">All categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={styles.filterGroup}>
                <label>Urgency</label>
                <select value={selectedUrgency} onChange={(e) => setSelectedUrgency(e.target.value)} style={styles.filterSelect}>
                  <option value="">Any</option>
                  {URGENCY_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
              <div style={styles.filterGroup}>
                <label>Max Budget (£)</label>
                <input type="range" min="0" max="2000" step="50" value={budgetMax} onChange={(e) => setBudgetMax(Number(e.target.value))} style={styles.budgetSlider} />
                <span>£{budgetMax}</span>
              </div>
              <button onClick={() => { setSelectedCategory(''); setSelectedUrgency(''); setBudgetMax(1000); setSearchTerm(''); }} style={styles.clearFiltersBtn}>
                Clear all
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Job grid */}
      <AnimatePresence mode="wait">
        {filteredJobs.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.empty}>
            <Briefcase size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p>No jobs match your filters. Try adjusting criteria.</p>
            {(searchTerm || selectedCategory || selectedUrgency || budgetMax < 1000) && (
              <button onClick={() => { setSearchTerm(''); setSelectedCategory(''); setSelectedUrgency(''); setBudgetMax(1000); }} style={styles.resetButton}>
                Reset all filters
              </button>
            )}
          </motion.div>
        ) : (
          <div style={styles.grid}>
            {filteredJobs.map((job, idx) => {
              const category = extractCategory(job.title);
              const urgency = getUrgency(job);
              const urgencyDisplay = URGENCY_OPTIONS.find(u => u.value === urgency)?.label || 'Flexible';
              const urgencyColor = urgency === 'immediate' ? '#ef4444' : urgency === 'week' ? '#f59e0b' : urgency === 'month' ? '#3b82f6' : '#64748b';
              const cleanTitle = job.title.replace(/^\[.*?\]\s*/, '');
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  style={styles.card}
                >
                  <div style={styles.cardHeader}>
                    <div style={styles.iconBadge}><Briefcase size={18} /></div>
                    <h2 style={styles.jobTitle}>{cleanTitle}</h2>
                  </div>
                  {category && <span style={styles.categoryChip}>{category}</span>}
                  <p style={styles.description}>
                    {job.description?.length > 140 ? `${job.description.slice(0, 140)}...` : job.description || 'No description provided.'}
                  </p>
                  <div style={styles.meta}>
                    <span><PoundSterling size={13} /> {job.budget ? `£${job.budget}` : 'TBD'}</span>
                    <span><MapPin size={13} /> {job.location || 'Remote/TBD'}</span>
                    <span style={{ color: urgencyColor }}><AlertCircle size={13} /> {urgencyDisplay}</span>
                  </div>
                  {job.vehicle && (
                    <div style={styles.vehicleTag}>
                      <Car size={12} /> {job.vehicle.make} {job.vehicle.model} ({job.vehicle.license_plate})
                    </div>
                  )}
                  <div style={styles.footer}>
                    <span style={styles.date}><Calendar size={12} /> {new Date(job.created_at).toLocaleDateString()}</span>
                    <button onClick={() => router.push(`/marketplace/jobs/${job.id}`)} style={styles.applyButton}>
                      View & Apply
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div style={styles.page}>
      <div style={{ width: '260px', height: '40px', background: '#1e293b', borderRadius: '8px', marginBottom: '40px' }} />
      <div style={{ display: 'flex', gap: '16px', marginBottom: '30px' }}>
        <div style={{ flex: 1, height: '48px', background: '#0f172a', borderRadius: '48px' }} />
        <div style={{ width: '100px', height: '48px', background: '#0f172a', borderRadius: '48px' }} />
        <div style={{ width: '120px', height: '48px', background: '#0f172a', borderRadius: '48px' }} />
      </div>
      <div style={styles.grid}>
        {[1, 2, 3].map(i => <div key={i} style={{ ...styles.card, height: '260px', background: '#0f172a', opacity: 0.5 }} />)}
      </div>
    </div>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  page: { padding: '40px', background: theme.colors.background.main, minHeight: '100vh', fontFamily: theme.fontFamilies.sans },
  header: { marginBottom: '40px' },
  title: { fontSize: '36px', fontWeight: 800, background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' },
  subtitle: { color: theme.colors.text.secondary, marginTop: '4px' },
  searchBar: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' },
  searchInputWrapper: { flex: 2, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '8px', background: theme.colors.background.subtle, border: `1px solid ${theme.colors.border.light}`, borderRadius: '48px', padding: '8px 16px' },
  searchInput: { flex: 1, background: 'transparent', border: 'none', color: theme.colors.text.primary, outline: 'none' },
  filterButton: { position: 'relative', display: 'flex', alignItems: 'center', gap: '6px', background: theme.colors.background.card, border: `1px solid ${theme.colors.border.light}`, borderRadius: '40px', padding: '8px 20px', color: theme.colors.text.primary, cursor: 'pointer' },
  filterDot: { position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: theme.colors.primary, borderRadius: '50%' },
  sortSelect: { background: theme.colors.background.card, border: `1px solid ${theme.colors.border.light}`, borderRadius: '40px', padding: '8px 16px', color: theme.colors.text.primary, cursor: 'pointer' },
  resultCount: { fontSize: '13px', color: theme.colors.text.muted, marginLeft: 'auto' },
  filterPanel: { overflow: 'hidden', marginBottom: '24px', background: theme.colors.background.card, borderRadius: '24px', border: `1px solid ${theme.colors.border.light}`, padding: '20px' },
  filterRow: { display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end' },
  filterGroup: { flex: 1, minWidth: '150px' },
  filterSelect: { width: '100%', background: theme.colors.background.subtle, border: `1px solid ${theme.colors.border.medium}`, borderRadius: '12px', padding: '8px 12px', color: theme.colors.text.primary, marginTop: '4px' },
  budgetSlider: { width: '100%', marginTop: '8px' },
  clearFiltersBtn: { background: 'transparent', border: 'none', color: theme.colors.primary, cursor: 'pointer', padding: '8px 12px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' },
  card: { background: theme.colors.background.card, borderRadius: '20px', padding: '24px', border: `1px solid ${theme.colors.border.light}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' },
  iconBadge: { background: `${theme.colors.primary}15`, padding: '8px', borderRadius: '10px', color: theme.colors.primary },
  jobTitle: { fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 },
  categoryChip: { display: 'inline-block', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', marginBottom: '12px', background: `${theme.colors.primary}20`, color: theme.colors.primary, width: 'fit-content' },
  description: { color: theme.colors.text.secondary, fontSize: '14px', lineHeight: 1.6, marginBottom: '16px' },
  meta: { display: 'flex', gap: '16px', fontSize: '13px', color: theme.colors.text.primary, fontWeight: 500, flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' },
  vehicleTag: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1e293b', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: '#94a3b8', width: 'fit-content', marginBottom: '20px' },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '16px', borderTop: `1px solid ${theme.colors.border.light}` },
  date: { fontSize: '11px', color: theme.colors.text.muted, display: 'flex', alignItems: 'center', gap: '4px' },
  applyButton: { background: theme.colors.primary, border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', color: '#020617', fontSize: '13px', transition: 'opacity 0.2s' },
  centered: { minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', gap: '16px' },
  alertCard: { maxWidth: '400px', background: '#0f172a', padding: '40px', borderRadius: '24px', border: `1px solid ${theme.colors.border.light}`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  registerButton: { width: '100%', padding: '12px', background: theme.colors.primary, border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', color: '#020617' },
  empty: { gridColumn: '1 / -1', textAlign: 'center', padding: '100px 0', color: theme.colors.text.muted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  resetButton: { background: 'transparent', border: `1px solid ${theme.colors.border.medium}`, borderRadius: '24px', padding: '8px 16px', color: theme.colors.text.primary, cursor: 'pointer' },
  retryButton: { background: theme.colors.primary, border: 'none', borderRadius: '8px', padding: '8px 20px', color: '#020617', cursor: 'pointer' },
};