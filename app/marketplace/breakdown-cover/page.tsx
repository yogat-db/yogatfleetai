'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { providers, searchProviders, sortByPrice, sortByRating } from '@/lib/data/breakdownProviders'

export default function BreakdownCoverPage() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)

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
        {providers.map((provider) => (
          <motion.div
            key={provider.id}
            whileHover={{ scale: 1.02 }}
            style={{
              ...styles.card,
              borderColor: selectedProvider === provider.id ? '#22c55e' : '#1e293b',
            }}
            onClick={() => setSelectedProvider(provider.id)}
          >
            <div style={styles.cardHeader}>
              <Image
                src={provider.logo}
                alt={provider.name}
                width={60}
                height={40}
                style={styles.logo}
              />
              <span style={styles.rating}>★ {provider.rating}</span>
            </div>
            <h3 style={styles.providerName}>{provider.name}</h3>
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
            <button style={styles.selectButton}>
              {selectedProvider === provider.id ? 'Selected' : 'Select Plan'}
            </button>
          </motion.div>
        ))}
      </div>
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  card: {
    background: '#0f172a',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid',
    cursor: 'pointer',
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
  },
}
