// app/marketplace/mechanics/register/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Phone, Building, AlertCircle, CheckCircle, ArrowLeft,
  Wrench, Zap, TrendingUp, Shield, FileCheck, Users, Award
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

// Service categories available for mechanics
const SERVICE_CATEGORIES = [
  { id: 'brakes', label: 'Brakes & Suspension', emoji: '🛑' },
  { id: 'engine', label: 'Engine Repairs', emoji: '⚙️' },
  { id: 'electrical', label: 'Electrical Systems', emoji: '⚡' },
  { id: 'transmission', label: 'Transmission', emoji: '🔧' },
  { id: 'exhaust', label: 'Exhaust Systems', emoji: '💨' },
  { id: 'diagnostic', label: 'Diagnostics', emoji: '🔍' },
  { id: 'maintenance', label: 'General Maintenance', emoji: '🧹' },
  { id: 'bodywork', label: 'Bodywork & Paint', emoji: '🎨' },
];

// Subscription tiers
const SUBSCRIPTION_TIERS = [
  {
    id: 'free',
    name: 'Starter',
    price: 0,
    description: 'Perfect to get started',
    features: [
      'Up to 3 active job applications',
      'Basic profile',
      'Email support',
      '10% commission on jobs',
    ],
    color: '#64748b',
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 29.99,
    description: 'For growing businesses',
    features: [
      'Unlimited job applications',
      'Advanced profile with ratings',
      'Priority job matching',
      '5% commission on jobs',
      'Monthly analytics',
    ],
    color: '#3b82f6',
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 99.99,
    description: 'For established professionals',
    features: [
      'All Pro features',
      'Featured in search results',
      'Dedicated account manager',
      '2% commission on jobs',
      'Advanced analytics & insights',
      'Marketing materials included',
    ],
    color: '#fbbf24',
  },
];

export default function MechanicRegisterPage() {
  const router = useRouter();
  
  // Form fields
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTier, setSelectedTier] = useState<string>('pro');
  const [yearsExperience, setYearsExperience] = useState<number | string>('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<'details' | 'services' | 'subscription' | 'review'>(
    'details'
  );

  // Calculate estimated earnings based on tier
  const estimatedMonthlyEarnings = useMemo(() => {
    const baseEarnings = 2000; // Assume £2000 in monthly jobs average
    const tier = SUBSCRIPTION_TIERS.find(t => t.id === selectedTier);
    if (!tier) return 0;
    
    // Extract commission percentage from description (e.g., "10% commission")
    const commissionMatch = tier.features
      .find(f => f.includes('commission'))
      ?.match(/(\d+)%/);
    const commission = commissionMatch ? parseInt(commissionMatch[1]) : 10;
    
    return Math.round((baseEarnings * commission) / 100);
  }, [selectedTier]);

  // Geocode address
  const geocodeAddress = async (addr: string): Promise<{ lat: number | null; lng: number | null }> => {
    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(addr)}`);
      if (!response.ok) return { lat: null, lng: null };
      const data = await response.json();
      return data.lat && data.lng ? { lat: data.lat, lng: data.lng } : { lat: null, lng: null };
    } catch (err) {
      console.warn('Geocoding failed:', err);
      return { lat: null, lng: null };
    }
  };

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Validate current step
  const validateStep = (currentStep: string): boolean => {
    switch (currentStep) {
      case 'details':
        return !!(
          businessName.trim() &&
          address.trim() &&
          (yearsExperience === '' || parseInt(String(yearsExperience)) >= 0)
        );
      case 'services':
        return selectedCategories.length > 0;
      case 'subscription':
        return !!selectedTier;
      case 'review':
        return agreeTerms;
      default:
        return false;
    }
  };

  // Move to next step
  const nextStep = () => {
    if (!validateStep(step)) {
      setError(`Please complete all required fields on this step`);
      return;
    }
    setError(null);
    const steps: ('details' | 'services' | 'subscription' | 'review')[] = ['details', 'services', 'subscription', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  // Move to previous step
  const prevStep = () => {
    const steps: ('details' | 'services' | 'subscription' | 'review')[] = ['details', 'services', 'subscription', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  // Submit registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validation
      if (!businessName.trim()) throw new Error('Business name is required');
      if (!address.trim()) throw new Error('Business address is required');
      if (selectedCategories.length === 0) throw new Error('Select at least one service category');
      if (!agreeTerms) throw new Error('You must agree to the terms and conditions');

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('You must be logged in to register');

      // Check if mechanic profile already exists
      const { data: existing, error: checkError } = await supabase
        .from('mechanics')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) throw new Error('You have already registered as a mechanic');

      // Geocode address
      const { lat, lng } = await geocodeAddress(address);

      // Insert mechanic profile
      const { data: mechanic, error: insertError } = await supabase
        .from('mechanics')
        .insert({
          user_id: user.id,
          business_name: businessName.trim(),
          phone: phone.trim() || null,
          address: address.trim(),
          description: description.trim() || null,
          service_categories: selectedCategories,
          years_experience: yearsExperience ? parseInt(String(yearsExperience)) : null,
          lat,
          lng,
          verified: false,
          subscription_status: selectedTier === 'free' ? 'active' : 'pending_payment',
          subscription_tier: selectedTier,
          rating: 5.0, // New mechanics start with 5.0
          total_jobs: 0,
          profile_completion: 75,
        })
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);

      // Create affiliate account link (optional)
      try {
        await fetch('/api/affiliate/mechanic-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mechanicId: mechanic.id,
            userId: user.id,
            businessName: businessName.trim(),
          }),
        });
      } catch (err) {
        console.warn('Affiliate account creation failed (non-blocking):', err);
      }

      setSuccess(true);
      
      // Redirect based on tier
      setTimeout(() => {
        if (selectedTier === 'free') {
          router.push('/marketplace/mechanics/dashboard');
        } else {
          // Redirect to payment page for Pro/Premium
          router.push(`/marketplace/mechanics/payment?tier=${selectedTier}&mechanicId=${mechanic.id}`);
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.page}>
      <div style={styles.container}>
        <button onClick={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={16} /> Back
        </button>

        <div style={styles.card}>
          {/* Header */}
          <div style={styles.header}>
            <h1 style={styles.title}>Join Our Mechanic Network</h1>
            <p style={styles.subtitle}>Get access to local repair jobs and grow your business</p>
          </div>

          {/* Step Indicator */}
          <div style={styles.stepIndicator}>
            {['details', 'services', 'subscription', 'review'].map((s, idx) => (
              <div key={s} style={styles.stepContainer}>
                <div
                  style={{
                    ...styles.stepCircle,
                    background:
                      ['details', 'services', 'subscription', 'review'].indexOf(step) >= idx
                        ? theme.colors.primary
                        : theme.colors.border.light,
                  }}
                >
                  {idx + 1}
                </div>
                <span style={styles.stepLabel}>
                  {s === 'details' && 'Details'}
                  {s === 'services' && 'Services'}
                  {s === 'subscription' && 'Plan'}
                  {s === 'review' && 'Review'}
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <AnimatePresence mode="wait">
              {/* Step 1: Business Details */}
              {step === 'details' && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  style={styles.stepContent}
                >
                  <h2 style={styles.stepTitle}>Business Information</h2>

                  <div style={styles.field}>
                    <label style={styles.label}>
                      <Building size={16} /> Business Name *
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      style={styles.input}
                      required
                      disabled={loading}
                      placeholder="e.g., Smith Auto Repairs"
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>
                      <Phone size={16} /> Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={styles.input}
                      disabled={loading}
                      placeholder="e.g., 020 1234 5678"
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>
                      <MapPin size={16} /> Business Address *
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g., 123 High Street, Leicester, LE1 1AA"
                      style={styles.input}
                      required
                      disabled={loading}
                    />
                    <p style={styles.helpText}>
                      We'll use this to match you with local jobs and show your location.
                    </p>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>
                      <Award size={16} /> Years of Experience
                    </label>
                    <input
                      type="number"
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(e.target.value)}
                      style={styles.input}
                      disabled={loading}
                      placeholder="e.g., 5"
                      min="0"
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>
                      <FileCheck size={16} /> About Your Business
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      style={{ ...styles.input, minHeight: '100px', resize: 'vertical' }}
                      disabled={loading}
                      placeholder="Tell customers about your business, specialties, and what makes you unique..."
                    />
                    <p style={styles.helpText}>
                      This will appear on your public profile (max 300 characters)
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Service Categories */}
              {step === 'services' && (
                <motion.div
                  key="services"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  style={styles.stepContent}
                >
                  <h2 style={styles.stepTitle}>Service Categories</h2>
                  <p style={{ color: theme.colors.text.secondary, marginBottom: '24px' }}>
                    Select the services you offer. You'll receive job matching based on these.
                  </p>

                  <div style={styles.categoryGrid}>
                    {SERVICE_CATEGORIES.map(cat => (
                      <motion.button
                        key={cat.id}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleCategory(cat.id)}
                        style={{
                          ...styles.categoryButton,
                          background: selectedCategories.includes(cat.id)
                            ? `${theme.colors.primary}20`
                            : theme.colors.background.subtle,
                          borderColor: selectedCategories.includes(cat.id)
                            ? theme.colors.primary
                            : theme.colors.border.light,
                        }}
                      >
                        <span style={{ fontSize: '24px' }}>{cat.emoji}</span>
                        <span style={styles.categoryLabel}>{cat.label}</span>
                        {selectedCategories.includes(cat.id) && (
                          <CheckCircle size={16} color={theme.colors.primary} />
                        )}
                      </motion.button>
                    ))}
                  </div>

                  {selectedCategories.length === 0 && (
                    <div style={styles.helpBox}>
                      <AlertCircle size={16} />
                      Select at least one service category
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 3: Subscription Tier */}
              {step === 'subscription' && (
                <motion.div
                  key="subscription"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  style={styles.stepContent}
                >
                  <h2 style={styles.stepTitle}>Choose Your Plan</h2>
                  <p style={{ color: theme.colors.text.secondary, marginBottom: '24px' }}>
                    Start with Starter and upgrade anytime. All plans include job matching.
                  </p>

                  <div style={styles.tiersGrid}>
                    {SUBSCRIPTION_TIERS.map(tier => (
                      <motion.div
                        key={tier.id}
                        whileHover={{ y: -8 }}
                        onClick={() => setSelectedTier(tier.id)}
                        style={{
                          ...styles.tierCard,
                          borderColor:
                            selectedTier === tier.id
                              ? theme.colors.primary
                              : theme.colors.border.light,
                          background:
                            selectedTier === tier.id
                              ? `${theme.colors.primary}05`
                              : theme.colors.background.subtle,
                          cursor: 'pointer',
                          position: 'relative',
                        }}
                      >
                        {tier.popular && (
                          <div style={styles.popularBadge}>Most Popular</div>
                        )}

                        <h3 style={{ ...styles.tierName, color: tier.color }}>
                          {tier.name}
                        </h3>
                        <div style={styles.tierPrice}>
                          £{tier.price.toFixed(2)}
                          <span style={styles.tierPeriod}>/month</span>
                        </div>
                        <p style={styles.tierDesc}>{tier.description}</p>

                        <div style={styles.tierFeatures}>
                          {tier.features.map((feature, idx) => (
                            <div key={idx} style={styles.tierFeature}>
                              <CheckCircle size={14} color={theme.colors.primary} />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>

                        {tier.id !== 'free' && (
                          <div style={styles.earningsPreview}>
                            <TrendingUp size={14} />
                            <span>Est. £{estimatedMonthlyEarnings}/month earnings</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 4: Review & Agree */}
              {step === 'review' && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  style={styles.stepContent}
                >
                  <h2 style={styles.stepTitle}>Review & Confirm</h2>

                  <div style={styles.reviewBox}>
                    <div style={styles.reviewSection}>
                      <h4 style={styles.reviewTitle}>Business Details</h4>
                      <p>
                        <strong>{businessName}</strong> • {address}
                        {phone && ` • ${phone}`}
                      </p>
                      {yearsExperience && (
                        <p style={{ fontSize: '0.9rem', color: theme.colors.text.secondary }}>
                          {yearsExperience} years experience
                        </p>
                      )}
                    </div>

                    <div style={styles.reviewSection}>
                      <h4 style={styles.reviewTitle}>Services</h4>
                      <div style={styles.reviewTags}>
                        {selectedCategories.map(catId => {
                          const cat = SERVICE_CATEGORIES.find(c => c.id === catId);
                          return (
                            <span key={catId} style={styles.reviewTag}>
                              {cat?.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div style={styles.reviewSection}>
                      <h4 style={styles.reviewTitle}>Plan</h4>
                      <p>
                        <strong>
                          {SUBSCRIPTION_TIERS.find(t => t.id === selectedTier)?.name}
                        </strong>
                        {SUBSCRIPTION_TIERS.find(t => t.id === selectedTier)?.price ? (
                          <>
                            {' '}
                            - £
                            {SUBSCRIPTION_TIERS.find(t => t.id === selectedTier)?.price.toFixed(2)}/month
                          </>
                        ) : (
                          ' - Free'
                        )}
                      </p>
                    </div>
                  </div>

                  <div style={styles.agreementBox}>
                    <input
                      type="checkbox"
                      id="terms"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      style={styles.checkbox}
                      disabled={loading}
                    />
                    <label htmlFor="terms" style={styles.agreementLabel}>
                      I agree to the{' '}
                      <a href="/terms" style={styles.link} target="_blank">
                        Terms of Service
                      </a>
                      {' '}and{' '}
                      <a href="/privacy" style={styles.link} target="_blank">
                        Privacy Policy
                      </a>
                      . I confirm that the information provided is accurate and I am authorized to
                      conduct business.
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error & Success Messages */}
            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={styles.successBox}>
                <CheckCircle size={16} />
                <span>Registration successful! Redirecting...</span>
              </div>
            )}

            {/* Navigation Buttons */}
            <div style={styles.buttonGroup}>
              {step !== 'details' && (
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={loading}
                  style={{ ...styles.secondaryButton, opacity: loading ? 0.5 : 1 }}
                >
                  ← Back
                </button>
              )}

              {step !== 'review' ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={loading}
                  style={{ ...styles.primaryButton, opacity: loading ? 0.5 : 1 }}
                >
                  Next →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !agreeTerms}
                  style={{
                    ...styles.primaryButton,
                    opacity: loading || !agreeTerms ? 0.5 : 1,
                    cursor: loading || !agreeTerms ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Registering...' : 'Complete Registration'}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Benefits Section */}
        <div style={styles.benefitsSection}>
          <h3 style={styles.benefitsTitle}>Why Join YogatFleet?</h3>
          <div style={styles.benefitsGrid}>
            <div style={styles.benefitCard}>
              <Users size={24} color={theme.colors.primary} />
              <h4>Local Job Matching</h4>
              <p>Get matched with repair jobs near you based on your location and specialties.</p>
            </div>
            <div style={styles.benefitCard}>
              <TrendingUp size={24} color={theme.colors.primary} />
              <h4>Grow Your Revenue</h4>
              <p>Earn commissions on every completed job. Higher tier = lower commission.</p>
            </div>
            <div style={styles.benefitCard}>
              <Shield size={24} color={theme.colors.primary} />
              <h4>Secure Payments</h4>
              <p>All payments handled securely via escrow. Get paid within 48 hours.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ==================== STYLES ====================
const styles: Record<string, React.CSSProperties> = {
  page: {
    background: theme.colors.background.main,
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    fontFamily: theme.fontFamilies.sans,
    padding: '40px 20px',
  },
  container: {
    maxWidth: '700px',
    width: '100%',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    color: theme.colors.text.secondary,
    padding: '8px 16px',
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
    marginBottom: '24px',
  },
  card: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius['2xl'],
    padding: '40px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
  },
  header: { marginBottom: '40px' },
  title: {
    fontSize: '32px',
    fontWeight: 800,
    marginBottom: '8px',
    color: theme.colors.text.primary,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    fontSize: '16px',
  },
  stepIndicator: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '40px',
    gap: '20px',
  },
  stepContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 },
  stepCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    transition: 'all 0.3s',
  },
  stepLabel: { fontSize: '12px', color: theme.colors.text.secondary, textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '24px' },
  stepContent: { minHeight: '400px' },
  stepTitle: { fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: theme.colors.text.primary },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: theme.colors.text.primary,
  },
  input: {
    width: '100%',
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.md,
    padding: '12px 16px',
    color: theme.colors.text.primary,
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  helpText: { fontSize: '12px', color: theme.colors.text.muted, marginTop: '4px' },
  helpBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    background: `${theme.colors.status.warning}15`,
    border: `1px solid ${theme.colors.status.warning}`,
    borderRadius: theme.borderRadius.md,
    color: theme.colors.status.warning,
    fontSize: '14px',
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '12px',
  },
  categoryButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    padding: '20px 16px',
    borderRadius: theme.borderRadius.lg,
    border: '2px solid',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  categoryLabel: { fontSize: '13px', fontWeight: 600, color: theme.colors.text.primary },
  tiersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' },
  tierCard: {
    padding: '24px',
    borderRadius: theme.borderRadius.lg,
    border: '2px solid',
    transition: 'all 0.3s',
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: '-12px',
    right: '20px',
    background: theme.colors.primary,
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 700,
  },
  tierName: { fontSize: '18px', fontWeight: 800, marginBottom: '8px' },
  tierPrice: { fontSize: '28px', fontWeight: 900, marginBottom: '4px', color: theme.colors.text.primary },
  tierPeriod: { fontSize: '14px', fontWeight: 400, color: theme.colors.text.secondary },
  tierDesc: { fontSize: '13px', color: theme.colors.text.secondary, marginBottom: '16px' },
  tierFeatures: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
  tierFeature: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: theme.colors.text.secondary,
  },
  earningsPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    background: `${theme.colors.primary}15`,
    borderRadius: theme.borderRadius.md,
    color: theme.colors.primary,
    fontSize: '12px',
    fontWeight: 600,
  },
  reviewBox: { padding: '20px', background: theme.colors.background.subtle, borderRadius: theme.borderRadius.lg, marginBottom: '24px' },
  reviewSection: { marginBottom: '16px' },
  reviewTitle: { fontSize: '13px', fontWeight: 700, color: theme.colors.text.secondary, marginBottom: '8px' },
  reviewTags: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  reviewTag: {
    display: 'inline-block',
    padding: '4px 12px',
    background: theme.colors.primary,
    color: '#fff',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
  },
  agreementBox: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    background: theme.colors.background.subtle,
    borderRadius: theme.borderRadius.lg,
    marginBottom: '24px',
  },
  checkbox: { width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0, marginTop: '2px' },
  agreementLabel: { fontSize: '14px', color: theme.colors.text.secondary, cursor: 'pointer', lineHeight: 1.5 },
  link: { color: theme.colors.primary, textDecoration: 'none' },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: `1px solid ${theme.colors.status.critical}`,
    borderRadius: theme.borderRadius.md,
    padding: '12px 16px',
    color: theme.colors.status.critical,
    fontSize: '14px',
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(34, 197, 94, 0.1)',
    border: `1px solid ${theme.colors.primary}`,
    borderRadius: theme.borderRadius.md,
    padding: '12px 16px',
    color: theme.colors.primary,
    fontSize: '14px',
  },
  buttonGroup: { display: 'flex', gap: '12px', marginTop: '24px' },
  primaryButton: {
    flex: 1,
    background: theme.colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    padding: '14px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  secondaryButton: {
    flex: 1,
    background: 'transparent',
    color: theme.colors.text.secondary,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.borderRadius.md,
    padding: '14px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  benefitsSection: {
    marginTop: '60px',
    paddingTop: '40px',
    borderTop: `1px solid ${theme.colors.border.light}`,
  },
  benefitsTitle: {
    fontSize: '24px',
    fontWeight: 800,
    marginBottom: '32px',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  benefitsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
  },
  benefitCard: {
    padding: '24px',
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: theme.borderRadius.lg,
    textAlign: 'center',
  },
};
