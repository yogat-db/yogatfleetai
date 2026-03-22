'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export interface BreakdownProvider {
  id: string
  name: string
  logo: string
  description: string
  monthlyPrice: number
  annualPrice: number
  coverage: string[]
  rating: number
  affiliateUrl: string
}

// Mock data – replace with API call or static import
const providers: BreakdownProvider[] = [
  {
    id: 'aa',
    name: 'AA Breakdown',
    logo: '/logos/aa.png',
    description: '24/7 roadside assistance with nationwide coverage.',
    monthlyPrice: 12.99,
    annualPrice: 129.99,
    coverage: ['Roadside', 'Recovery', 'At home', 'Onward travel'],
    rating: 4.5,
    affiliateUrl: 'https://www.theaa.com/breakdown-cover',
  },
  {
    id: 'rac',
    name: 'RAC Breakdown',
    logo: '/logos/rac.png',
    description: 'Comprehensive cover including European breakdown.',
    monthlyPrice: 14.99,
    annualPrice: 149.99,
    coverage: ['Roadside', 'Recovery', 'At home', 'European cover'],
    rating: 4.7,
    affiliateUrl: 'https://www.rac.co.uk/breakdown-cover',
  },
  {
    id: 'greenflag',
    name: 'Green Flag',
    logo: '/logos/greenflag.png',
    description: 'Award‑winning breakdown cover with flexible options.',
    monthlyPrice: 9.99,
    annualPrice: 99.99,
    coverage: ['Roadside', 'Recovery', 'Nationwide'],
    rating: 4.3,
    affiliateUrl: 'https://www.greenflag.com/breakdown-cover',
  },
]

export default function BreakdownCoverPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Simulate data fetching (replace with real API call if needed)
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  const handleSelect = (url: string) => {
    // In production, you might track the click and then redirect
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p>Loading breakdown cover options...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <p style={{ color: '#ef4444' }}>Error: {error}</p>
        <button onClick={() => window.location.reload()} style={styles.retryButton}>
          Retry
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
      <h1 style={styles.title}>Breakdown Cover</h1>
      <p style={styles.subtitle}>
        Compare roadside assistance plans from trusted providers.
      </p>

      <div style={styles.grid}>
        {providers.map((provider, index) => (
          <motion.div
            key={provider.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            style={styles.card}
          >
            <div style={styles.cardHeader}>
              {provider.logo && (
                <Image
                  src={provider.logo}
                  alt={provider.name}
                  width={60}
                  height={40}
                  style={styles.logo}
                />
              )}
              <span style={styles.rating}>★ {provider.rating}</span>
            </div>

            <h2 style={styles.providerName}>{provider.name}</h2>
            <p style={styles.description}>{provider.description}</p>

            <div style={styles.coverageList}>
              {provider.coverage.map((item) => (
                <span key={item} style={styles.coverageItem}>
                  ✓ {item}
                </span>
              ))}
            </div>

            <div style={styles.pricing}>
              <div>
                <span style={styles.price}>£{provider.monthlyPrice}</span>
                <span style={styles.pricePeriod}>/mo</span>
              </div>
              <div>
                <span style={styles.price}>£{provider.annualPrice}</span>
                <span style={styles.pricePeriod}>/yr</span>
              </div>
            </div>

            <button
              onClick={() => handleSelect(provider.affiliateUrl)}
              style={styles.selectButton}
            >
              Select Plan
            </button>
          </motion.div>
        ))}
      </div>

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
  title: {
    fontSize: '32px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #94a3b8, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#94a3b8',
    marginBottom: '32px',
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  card: {
    background: '#0f172a',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  logo: {
    objectFit: 'contain',
  },
  rating: {
    background: '#1e293b',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#fbbf24',
  },
  providerName: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  description: {
    color: '#94a3b8',
    fontSize: '14px',
    marginBottom: '16px',
  },
  coverageList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '16px',
  },
  coverageItem: {
    background: '#1e293b',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#cbd5e1',
  },
  pricing: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  price: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#22c55e',
  },
  pricePeriod: {
    fontSize: '14px',
    color: '#64748b',
    marginLeft: '4px',
  },
  selectButton: {
    width: '100%',
    background: 'transparent',
    border: '1px solid #22c55e',
    color: '#22c55e',
    padding: '10px',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: 'auto',
  },
}