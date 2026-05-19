'use client';

import { useEffect, useState, useCallback, useMemo, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Briefcase,
  Calendar,
  Car,
  ChevronDown,
  MapPin,
  PoundSterling,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import toast from 'react-hot-toast';

interface VehiclePreview {
  make: string | null;
  model: string | null;
  license_plate: string | null;
}

interface Job {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  status: string;
  location: string | null;
  user_id: string;
  created_at: string;
  vehicle?: VehiclePreview;
}

interface JobQueryRow {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  status: string;
  location: string | null;
  user_id: string;
  created_at: string;
  vehicle?: VehiclePreview | VehiclePreview[] | null;
}

const CATEGORIES = [
  'Engine & Mechanical',
  'Brakes & Suspension',
  'Electrical & Electronics',
  'Transmission & Drivetrain',
  'Exhaust & Emissions',
  'Heating & Cooling',
  'Bodywork & Paint',
  'Tyres & Wheels',
  'Diagnostic only',
  'Other',
] as const;

const URGENCY_OPTIONS = [
  { value: 'immediate', label: 'Immediate', days: 1 },
  { value: 'week', label: 'Within a week', days: 7 },
  { value: 'month', label: 'Within a month', days: 30 },
  { value: 'flexible', label: 'Flexible', days: null },
] as const;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'budget_high', label: 'Highest budget' },
  { value: 'budget_low', label: 'Lowest budget' },
  { value: 'urgent', label: 'Most urgent' },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];
type UrgencyValue = (typeof URGENCY_OPTIONS)[number]['value'] | '';

const normalizeVehicle = (
  vehicle: VehiclePreview | VehiclePreview[] | null | undefined
): VehiclePreview | undefined => {
  if (!vehicle) return undefined;
  return Array.isArray(vehicle) ? vehicle[0] : vehicle;
};

export default function MarketplaceJobsPage() {
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMechanic, setIsMechanic] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState<UrgencyValue>('');
  const [budgetMax, setBudgetMax] = useState<number>(1000);
  const [sortBy, setSortBy] = useState<SortValue>('newest');

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory) count += 1;
    if (selectedUrgency) count += 1;
    if (budgetMax < 1000) count += 1;
    if (searchTerm.trim()) count += 1;
    return count;
  }, [budgetMax, searchTerm, selectedCategory, selectedUrgency]);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session) {
        router.push('/login');
        return;
      }

      const { data: mechanic, error: mechError } = await supabase
        .from('mechanics')
        .select('id, verified')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (mechError) {
        throw new Error(mechError.message);
      }

      if (!mechanic) {
        setIsMechanic(false);
        setJobs([]);
        return;
      }

      setIsMechanic(true);

      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          description,
          budget,
          status,
          location,
          user_id,
          created_at,
          vehicle:vehicles(make, model, license_plate)
        `)
        .eq('status', 'open')
        .neq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (jobsError) {
        throw new Error(jobsError.message);
      }

      const normalized: Job[] = ((jobsData as JobQueryRow[] | null) ?? []).map((job) => ({
        id: job.id,
        title: job.title,
        description: job.description,
        budget: job.budget ?? null,
        status: job.status,
        location: job.location ?? null,
        user_id: job.user_id,
        created_at: job.created_at,
        vehicle: normalizeVehicle(job.vehicle),
      }));

      setJobs(normalized);
    } catch (err) {
      console.error('Fetch jobs error:', err);
      const message = err instanceof Error ? err.message : 'Failed to load jobs';
      setError(message);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const extractCategory = (title: string): string | null => {
    const match = title.match(/^\[(.*?)\]/);
    return match ? match[1] : null;
  };

  const getUrgency = (job: Job): UrgencyValue => {
    const text = `${job.title || ''} ${job.description || ''}`.toLowerCase();
    if (text.includes('urgent') || text.includes('asap') || text.includes('immediately')) return 'immediate';
    if (text.includes('week')) return 'week';
    if (text.includes('month')) return 'month';
    return 'flexible';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedUrgency('');
    setBudgetMax(1000);
    setSortBy('newest');
  };

  const filteredJobs = useMemo(() => {
    return [...jobs]
      .filter((job) => {
        const term = searchTerm.trim().toLowerCase();

        if (term) {
          const haystack = [job.title, job.description ?? '', job.location ?? '']
            .join(' ')
            .toLowerCase();

          if (!haystack.includes(term)) return false;
        }

        const jobCategory = extractCategory(job.title);
        if (selectedCategory && jobCategory !== selectedCategory) return false;

        if (budgetMax && job.budget !== null && job.budget > budgetMax) return false;

        const urgency = getUrgency(job);
        if (selectedUrgency && urgency !== selectedUrgency) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }

        if (sortBy === 'budget_high') {
          return (b.budget || 0) - (a.budget || 0);
        }

        if (sortBy === 'budget_low') {
          return (a.budget || 0) - (b.budget || 0);
        }

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
  }, [jobs, searchTerm, selectedCategory, selectedUrgency, budgetMax, sortBy]);

  if (loading) return <LoadingSkeleton />;

  if (isMechanic === false) {
    return (
      <div style={styles.centered}>
        <div style={styles.alertCard}>
          <AlertCircle size={40} color={theme.colors.primary} />
          <h2 style={styles.alertTitle}>Mechanic Access Required</h2>
          <p style={styles.alertBody}>
            To view and apply for repair jobs, you need to register as a mechanic first.
          </p>
          <button
            onClick={() => router.push('/marketplace/mechanics/register')}
            style={styles.registerButton}
            type="button"
          >
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
        <button onClick={() => void fetchJobs()} style={styles.retryButton} type="button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Available Jobs</h1>
          <p style={styles.subtitle}>
            Find repair opportunities near you and grow your business.
          </p>
        </div>

        <div style={styles.headerMeta}>
          <span style={styles.resultPill}>
            {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      <section style={styles.toolbarCard}>
        <div style={styles.topToolbar}>
          <div style={styles.searchInputWrapper}>
            <Search size={18} color={theme.colors.text.muted} />
            <input
              type="text"
              placeholder="Search title, location, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.toolbarActions}>
            <button
              onClick={() => setShowFilters((v) => !v)}
              style={styles.filterButton}
              type="button"
              aria-expanded={showFilters}
              aria-label="Open filters"
            >
              <SlidersHorizontal size={18} />
              <span>Filters</span>
              {activeFilterCount > 0 && <span style={styles.filterCount}>{activeFilterCount}</span>}
            </button>

            <div style={styles.sortDropdownWrap}>
              <label htmlFor="sort-by" style={styles.sortLabel}>
                Sort
              </label>
              <div style={styles.selectWrap}>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortValue)}
                  style={styles.sortSelect}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} style={styles.selectIcon} />
              </div>
            </div>
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div style={styles.activeChipsRow}>
            {searchTerm.trim() && (
              <ActiveChip label={`Search: ${searchTerm.trim()}`} onRemove={() => setSearchTerm('')} />
            )}
            {selectedCategory && (
              <ActiveChip label={selectedCategory} onRemove={() => setSelectedCategory('')} />
            )}
            {selectedUrgency && (
              <ActiveChip
                label={URGENCY_OPTIONS.find((u) => u.value === selectedUrgency)?.label || selectedUrgency}
                onRemove={() => setSelectedUrgency('')}
              />
            )}
            {budgetMax < 1000 && (
              <ActiveChip label={`Up to £${budgetMax}`} onRemove={() => setBudgetMax(1000)} />
            )}
            <button type="button" onClick={clearFilters} style={styles.clearInlineButton}>
              Clear all
            </button>
          </div>
        )}
      </section>

      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={styles.backdrop}
              onClick={() => setShowFilters(false)}
            />

            <motion.aside
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.2 }}
              style={styles.filterSheet}
              aria-label="Filters"
            >
              <div style={styles.filterSheetHeader}>
                <div>
                  <h2 style={styles.filterSheetTitle}>Refine jobs</h2>
                  <p style={styles.filterSheetSubtitle}>
                    Narrow results by category, urgency, and budget.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  style={styles.closeButton}
                  aria-label="Close filters"
                >
                  <X size={18} />
                </button>
              </div>

              <div style={styles.filterGrid}>
                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel} htmlFor="category-filter">
                    Category
                  </label>
                  <div style={styles.selectWrap}>
                    <select
                      id="category-filter"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      style={styles.filterSelect}
                    >
                      <option value="">All categories</option>
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} style={styles.selectIcon} />
                  </div>
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel} htmlFor="urgency-filter">
                    Urgency
                  </label>
                  <div style={styles.selectWrap}>
                    <select
                      id="urgency-filter"
                      value={selectedUrgency}
                      onChange={(e) => setSelectedUrgency(e.target.value as UrgencyValue)}
                      style={styles.filterSelect}
                    >
                      <option value="">Any urgency</option>
                      {URGENCY_OPTIONS.map((urgency) => (
                        <option key={urgency.value} value={urgency.value}>
                          {urgency.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} style={styles.selectIcon} />
                  </div>
                </div>

                <div style={styles.filterGroupFull}>
                  <div style={styles.sliderHeader}>
                    <label style={styles.filterLabel} htmlFor="budget-filter">
                      Max budget
                    </label>
                    <strong style={styles.sliderValue}>£{budgetMax}</strong>
                  </div>
                  <input
                    id="budget-filter"
                    type="range"
                    min="0"
                    max="2000"
                    step="50"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(Number(e.target.value))}
                    style={styles.budgetSlider}
                  />
                </div>
              </div>

              <div style={styles.filterSheetFooter}>
                <button type="button" onClick={clearFilters} style={styles.clearFiltersBtn}>
                  Clear all
                </button>
                <button type="button" onClick={() => setShowFilters(false)} style={styles.applyFiltersBtn}>
                  Show {filteredJobs.length} result{filteredJobs.length !== 1 ? 's' : ''}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {filteredJobs.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={styles.empty}
          >
            <Briefcase size={48} style={{ opacity: 0.22 }} />
            <p>No jobs match your filters. Try broadening your search.</p>
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters} style={styles.resetButton}>
                Reset all filters
              </button>
            )}
          </motion.div>
        ) : (
          <div style={styles.grid}>
            {filteredJobs.map((job, idx) => {
              const category = extractCategory(job.title);
              const urgency = getUrgency(job);
              const urgencyDisplay =
                URGENCY_OPTIONS.find((u) => u.value === urgency)?.label || 'Flexible';

              const urgencyColor =
                urgency === 'immediate'
                  ? '#ef4444'
                  : urgency === 'week'
                  ? '#f59e0b'
                  : urgency === 'month'
                  ? '#3b82f6'
                  : '#64748b';

              const cleanTitle = job.title.replace(/^\[.*?\]\s*/, '');

              return (
                <motion.article
                  key={job.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  style={styles.card}
                >
                  <div>
                    <div style={styles.cardHeader}>
                      <div style={styles.iconBadge}>
                        <Briefcase size={18} />
                      </div>
                      <h2 style={styles.jobTitle}>{cleanTitle}</h2>
                    </div>

                    <div style={styles.chipRow}>
                      {category && <span style={styles.categoryChip}>{category}</span>}
                      <span
                        style={{
                          ...styles.urgencyChip,
                          background: `${urgencyColor}18`,
                          color: urgencyColor,
                        }}
                      >
                        {urgencyDisplay}
                      </span>
                    </div>

                    <p style={styles.description}>
                      {job.description && job.description.length > 140
                        ? `${job.description.slice(0, 140)}...`
                        : job.description || 'No description provided.'}
                    </p>

                    <div style={styles.meta}>
                      <span style={styles.metaItem}>
                        <PoundSterling size={13} />
                        {job.budget ? `£${job.budget}` : 'TBD'}
                      </span>
                      <span style={styles.metaItem}>
                        <MapPin size={13} />
                        {job.location || 'Remote / TBD'}
                      </span>
                    </div>

                    {job.vehicle && (
                      <div style={styles.vehicleTag}>
                        <Car size={12} />
                        <span>
                          {[job.vehicle.make, job.vehicle.model].filter(Boolean).join(' ')}
                          {job.vehicle.license_plate ? ` (${job.vehicle.license_plate})` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={styles.footer}>
                    <span style={styles.date}>
                      <Calendar size={12} />
                      {new Date(job.created_at).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => router.push(`/marketplace/jobs/${job.id}`)}
                      style={styles.applyButton}
                    >
                      View & Apply
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActiveChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span style={styles.activeChip}>
      <span>{label}</span>
      <button type="button" onClick={onRemove} style={styles.activeChipButton} aria-label={`Remove ${label}`}>
        <X size={12} />
      </button>
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div style={styles.page}>
      <div style={{ width: '240px', height: '38px', background: '#1e293b', borderRadius: '10px', marginBottom: '30px' }} />
      <div style={styles.skeletonToolbar}>
        <div style={{ flex: 1, minHeight: '52px', background: '#0f172a', borderRadius: '18px' }} />
        <div style={{ width: '120px', minHeight: '52px', background: '#0f172a', borderRadius: '18px' }} />
        <div style={{ width: '150px', minHeight: '52px', background: '#0f172a', borderRadius: '18px' }} />
      </div>
      <div style={styles.grid}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              ...styles.card,
              minHeight: '280px',
              background: '#0f172a',
              opacity: 0.5,
            }}
          />
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    padding: 'clamp(16px, 3vw, 32px)',
    background: theme.colors.background.main,
    minHeight: '100vh',
    fontFamily: theme.fontFamilies.sans,
  },
  header: {
    marginBottom: 20,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 'clamp(28px, 5vw, 40px)',
    fontWeight: 800,
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.04em',
    margin: 0,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    marginTop: 6,
    fontSize: 15,
    lineHeight: 1.6,
  },
  headerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  resultPill: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 14px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    color: theme.colors.text.secondary,
  },
  toolbarCard: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: 24,
    padding: 16,
    marginBottom: 24,
  },
  topToolbar: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: 12,
    alignItems: 'center',
  },
  toolbarActions: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  searchInputWrapper: {
    minHeight: 52,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: 18,
    padding: '0 16px',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: theme.colors.text.primary,
    outline: 'none',
    fontSize: 14,
  },
  filterButton: {
    position: 'relative',
    minHeight: 52,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: 16,
    padding: '0 16px',
    color: theme.colors.text.primary,
    cursor: 'pointer',
    fontWeight: 700,
  },
  filterCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px',
    background: theme.colors.primary,
    color: '#020617',
    fontSize: 11,
    fontWeight: 800,
  },
  sortDropdownWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 180,
  },
  sortLabel: {
    fontSize: 12,
    color: theme.colors.text.muted,
    fontWeight: 600,
  },
  selectWrap: {
    position: 'relative',
  },
  sortSelect: {
    appearance: 'none',
    WebkitAppearance: 'none',
    width: '100%',
    minHeight: 52,
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: 16,
    padding: '0 40px 0 14px',
    color: theme.colors.text.primary,
    cursor: 'pointer',
    outline: 'none',
    fontSize: 14,
  },
  selectIcon: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    color: theme.colors.text.muted,
  },
  activeChipsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  activeChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.light}`,
    color: theme.colors.text.secondary,
    borderRadius: 999,
    padding: '8px 10px 8px 12px',
    fontSize: 12,
    fontWeight: 600,
  },
  activeChipButton: {
    width: 20,
    height: 20,
    border: 'none',
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    color: theme.colors.text.muted,
    cursor: 'pointer',
  },
  clearInlineButton: {
    border: 'none',
    background: 'transparent',
    color: theme.colors.primary,
    cursor: 'pointer',
    fontWeight: 700,
    padding: '8px 4px',
    fontSize: 13,
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(2, 6, 23, 0.55)',
    zIndex: 40,
  },
  filterSheet: {
    position: 'fixed',
    left: '50%',
    bottom: 16,
    transform: 'translateX(-50%)',
    width: 'min(720px, calc(100vw - 24px))',
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: 28,
    padding: 20,
    zIndex: 50,
    boxShadow: '0 20px 80px rgba(0,0,0,0.35)',
  },
  filterSheetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  filterSheetTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
    color: theme.colors.text.primary,
  },
  filterSheetSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 1.6,
  },
  closeButton: {
    width: 40,
    height: 40,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: 14,
    background: theme.colors.background.subtle,
    color: theme.colors.text.primary,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 16,
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  filterGroupFull: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: theme.colors.text.secondary,
  },
  filterSelect: {
    appearance: 'none',
    WebkitAppearance: 'none',
    width: '100%',
    minHeight: 48,
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: 14,
    padding: '0 40px 0 14px',
    color: theme.colors.text.primary,
    outline: 'none',
    cursor: 'pointer',
    fontSize: 14,
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  sliderValue: {
    color: theme.colors.text.primary,
    fontSize: 14,
  },
  budgetSlider: {
    width: '100%',
  },
  filterSheetFooter: {
    marginTop: 20,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  clearFiltersBtn: {
    minHeight: 48,
    padding: '0 16px',
    borderRadius: 14,
    border: `1px solid ${theme.colors.border.light}`,
    background: 'transparent',
    color: theme.colors.text.primary,
    fontWeight: 700,
    cursor: 'pointer',
  },
  applyFiltersBtn: {
    minHeight: 48,
    padding: '0 18px',
    borderRadius: 14,
    border: 'none',
    background: theme.colors.primary,
    color: '#020617',
    fontWeight: 800,
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 18,
  },
  card: {
    background: theme.colors.background.card,
    borderRadius: 22,
    padding: 20,
    border: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 280,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  iconBadge: {
    background: `${theme.colors.primary}15`,
    padding: 10,
    borderRadius: 12,
    color: theme.colors.primary,
    flexShrink: 0,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 750,
    color: '#fff',
    margin: 0,
    lineHeight: 1.25,
  },
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 11,
    fontWeight: 700,
    padding: '6px 10px',
    borderRadius: 999,
    background: `${theme.colors.primary}20`,
    color: theme.colors.primary,
  },
  urgencyChip: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 11,
    fontWeight: 700,
    padding: '6px 10px',
    borderRadius: 999,
  },
  description: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    lineHeight: 1.65,
    marginBottom: 16,
  },
  meta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    fontSize: 13,
    color: theme.colors.text.primary,
    fontWeight: 500,
    marginBottom: 14,
  },
  metaItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  vehicleTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#1e293b',
    padding: '6px 10px',
    borderRadius: 10,
    fontSize: 12,
    color: '#94a3b8',
    width: 'fit-content',
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 'auto',
    paddingTop: 16,
    borderTop: `1px solid ${theme.colors.border.light}`,
    flexWrap: 'wrap',
  },
  date: {
    fontSize: 12,
    color: theme.colors.text.muted,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  },
  applyButton: {
    minHeight: 42,
    background: theme.colors.primary,
    border: 'none',
    padding: '0 16px',
    borderRadius: 12,
    fontWeight: 800,
    cursor: 'pointer',
    color: '#020617',
    fontSize: 13,
  },
  centered: {
    minHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 16,
  },
  alertCard: {
    maxWidth: 420,
    background: '#0f172a',
    padding: 32,
    borderRadius: 24,
    border: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  alertTitle: {
    color: '#fff',
    margin: '16px 0 8px',
    fontSize: 24,
    fontWeight: 800,
  },
  alertBody: {
    textAlign: 'center',
    marginBottom: 24,
    color: theme.colors.text.secondary,
    lineHeight: 1.6,
  },
  registerButton: {
    width: '100%',
    minHeight: 48,
    padding: '0 12px',
    background: theme.colors.primary,
    border: 'none',
    borderRadius: 14,
    fontWeight: 700,
    cursor: 'pointer',
    color: '#020617',
  },
  empty: {
    textAlign: 'center',
    padding: '80px 0',
    color: theme.colors.text.muted,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  resetButton: {
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: 999,
    padding: '10px 16px',
    color: theme.colors.text.primary,
    cursor: 'pointer',
    fontWeight: 700,
  },
  retryButton: {
    background: theme.colors.primary,
    border: 'none',
    borderRadius: 10,
    padding: '10px 20px',
    color: '#020617',
    cursor: 'pointer',
    fontWeight: 700,
  },
  skeletonToolbar: {
    display: 'flex',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
};