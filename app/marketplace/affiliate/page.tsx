// app/marketplace/affiliate/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Star, AlertCircle, Search, Car, Info, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';
import { SkeletonCard } from '@/components/ui/SkeletonCard';

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  return matches;
};

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  platform: string;
  affiliate_link: string;
  category: string;
  rating?: number;
}

async function trackClick(productId: string, platform: string, url: string) {
  try {
    await fetch('/api/affiliate/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, platform, destinationUrl: url }),
    });
  } catch (e) { /* ignore */ }
}

export default function AffiliateMarketplace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [showVehicleFilter, setShowVehicleFilter] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');

  // Responsive grid using useMediaQuery
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(min-width: 641px) and (max-width: 1024px)');
  const gridColumns = isMobile
    ? '1fr'
    : isTablet
    ? 'repeat(2, 1fr)'
    : 'repeat(auto-fill, minmax(240px, 1fr))';
  const gap = isMobile ? '16px' : '24px';

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('affiliate_products')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        setProducts(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const categories = useMemo(() => {
    const cats = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
    return cats;
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    if (showVehicleFilter && make.trim()) {
      filtered = filtered.filter(p =>
        make.toLowerCase() === 'audi' && p.category === 'Brakes' ||
        make.toLowerCase() === 'bmw' && p.category === 'Filters'
      );
    }
    return filtered;
  }, [products, selectedCategory, searchQuery, showVehicleFilter, make, model, year]);

  const handleClick = (product: Product) => {
    trackClick(product.id, product.platform, product.affiliate_link);
    window.open(product.affiliate_link, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div style={{ ...styles.page, ...styles.centeredGrid }}>
        <div style={{ ...styles.grid, gridTemplateColumns: gridColumns, gap }}>
          {Array(6).fill(null).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <AlertCircle size={48} color={theme.colors.status.critical} />
        <p>{error}</p>
        <button onClick={() => window.location.reload()} style={styles.retryBtn}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.page}>
      <section style={styles.hero}>
        <span style={styles.preTitle}>Expert Recommendations</span>
        <h1 style={styles.title}>Car Accessories & Parts Marketplace</h1>
        <p style={styles.subtitle}>
          Browse curated deals from eBay, Channel3 and other partners.
        </p>
        <div style={styles.toggleButtons}>
          <button
            onClick={() => setShowVehicleFilter(false)}
            style={{ ...styles.toggleBtn, ...(!showVehicleFilter ? styles.toggleActive : {}) }}
          >
            <ShoppingBag size={18} /> Browse All
          </button>
          <button
            onClick={() => setShowVehicleFilter(true)}
            style={{ ...styles.toggleBtn, ...(showVehicleFilter ? styles.toggleActive : {}) }}
          >
            <Car size={18} /> Search by Car (mock)
          </button>
        </div>
      </section>

      {!showVehicleFilter && (
        <div style={styles.controlBar}>
          <div style={styles.searchBox}>
            <Search size={18} />
            <input
              placeholder="Search products..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <div style={styles.categoryScroller}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{ ...styles.filterBtn, ...(selectedCategory === cat ? styles.filterActive : {}) }}
              >
                {cat === 'all' ? 'All Items' : cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {showVehicleFilter && (
        <div style={styles.vehicleCard}>
          <h3 style={{ marginBottom: 12 }}>Enter your car details (demo)</h3>
          <div style={styles.vehicleInputGroup}>
            <input
              type="text"
              placeholder="Make e.g., Audi"
              value={make}
              onChange={e => setMake(e.target.value)}
              style={styles.vehicleInput}
            />
            <input
              type="text"
              placeholder="Model"
              value={model}
              onChange={e => setModel(e.target.value)}
              style={styles.vehicleInput}
            />
            <input
              type="text"
              placeholder="Year"
              value={year}
              onChange={e => setYear(e.target.value)}
              style={styles.vehicleInput}
            />
          </div>
          <p style={styles.vehicleHint}>
            This is a demo filter – it only shows a few example products based on make.
            In the future, real vehicle‑specific part search will be added.
          </p>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {filteredProducts.length === 0 ? (
          <EmptyState icon={<ShoppingBag size={48} />} message="No products match your selection." />
        ) : (
          <motion.div layout style={{ ...styles.grid, gridTemplateColumns: gridColumns, gap }}>
            {filteredProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                index={idx}
                onClick={() => handleClick(product)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <footer style={styles.footer}>
        <p style={styles.disclaimer}>
          <strong>Affiliate Disclosure:</strong> As an eBay Partner, Channel3 affiliate, and other partners, we earn
          from qualifying purchases. This helps support our free maintenance tools.
        </p>
      </footer>

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}

function ProductCard({ product, index, onClick }: { product: Product; index: number; onClick: () => void }) {
  const getPlatformLabel = (p: string) => {
    const platforms: Record<string, string> = {
      ebay: 'eBay Deals',
      channel3: 'Channel3',
      amazon: 'Amazon Choice',
      aliexpress: 'Global Shipping',
    };
    return platforms[p.toLowerCase()] || p;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ y: -3 }}
      style={styles.card}
    >
      <div style={styles.imageWrapper}>
        <img src={product.image_url || '/placeholder-car.png'} alt={product.name} style={styles.image} loading="lazy" />
        <div style={styles.platformOverlay}>{getPlatformLabel(product.platform)}</div>
      </div>
      <div style={styles.cardContent}>
        <span style={styles.catLabel}>{product.category}</span>
        <h3 style={styles.productName}>{product.name}</h3>
        <p style={styles.description}>
          {product.description.length > 80 ? product.description.slice(0, 80) + '…' : product.description}
        </p>
        <div style={styles.footerRow}>
          <div style={styles.priceContainer}>
            <span style={styles.currencySymbol}>£</span>
            <span style={styles.priceValue}>{product.price.toFixed(2)}</span>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onClick} style={styles.actionButton}>
            View Deal <ArrowUpRight size={12} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div style={styles.emptyContainer}>
      {icon}
      <p>{message}</p>
    </div>
  );
}

// ==================== STYLES (no inline @media) ====================
const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '32px 24px',
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: theme.colors.text.primary,
    fontFamily: theme.fontFamilies.sans,
  },
  centeredGrid: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hero: { textAlign: 'center', marginBottom: '40px' },
  preTitle: {
    color: theme.colors.primary,
    fontWeight: 800,
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    display: 'block',
    marginBottom: '8px',
  },
  title: {
    fontSize: 'clamp(28px, 6vw, 40px)',
    fontWeight: 900,
    background: theme.gradients.title,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-1px',
  },
  subtitle: {
    color: theme.colors.text.secondary,
    fontSize: 'clamp(13px, 3vw, 16px)',
    maxWidth: '600px',
    margin: '0 auto 24px auto',
    lineHeight: 1.5,
  },
  toggleButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 20px',
    borderRadius: '40px',
    border: `1px solid ${theme.colors.border.medium}`,
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    background: 'transparent',
    color: theme.colors.text.secondary,
  },
  toggleActive: {
    background: theme.colors.primary,
    color: theme.colors.background.main,
    borderColor: theme.colors.primary,
  },
  controlBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '32px',
  },
  searchBox: {
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: '40px',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    maxWidth: '400px',
    margin: '0 auto',
    width: '100%',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    padding: '12px 0',
    outline: 'none',
    color: theme.colors.text.primary,
  },
  categoryScroller: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  filterBtn: {
    background: 'transparent',
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: '30px',
    padding: '6px 16px',
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
  },
  filterActive: {
    background: theme.colors.primary,
    color: theme.colors.background.main,
    borderColor: theme.colors.primary,
  },
  vehicleCard: {
    background: theme.colors.background.card,
    borderRadius: '20px',
    padding: '24px',
    marginBottom: '32px',
    textAlign: 'center',
  },
  vehicleInputGroup: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  vehicleInput: {
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: '12px',
    padding: '8px 12px',
    color: theme.colors.text.primary,
    outline: 'none',
  },
  vehicleHint: {
    fontSize: '12px',
    color: theme.colors.text.muted,
  },
  grid: {
    display: 'grid',
    gap: '20px',
    // gridTemplateColumns is set dynamically via JSX
  },
  card: {
    background: theme.colors.background.card,
    borderRadius: '16px',
    overflow: 'hidden',
    border: `1px solid ${theme.colors.border.light}`,
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s',
  },
  imageWrapper: {
    position: 'relative',
    height: '140px',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  platformOverlay: {
    position: 'absolute',
    bottom: '8px',
    left: '8px',
    background: 'rgba(0,0,0,0.7)',
    padding: '2px 8px',
    borderRadius: '20px',
    fontSize: '10px',
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  cardContent: {
    padding: '12px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  catLabel: {
    fontSize: '10px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: theme.colors.primary,
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  productName: {
    fontSize: '15px',
    fontWeight: 700,
    marginBottom: '6px',
    lineHeight: 1.3,
  },
  description: {
    fontSize: '12px',
    color: theme.colors.text.secondary,
    lineHeight: 1.4,
    marginBottom: '12px',
    flex: 1,
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  priceContainer: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '2px',
  },
  currencySymbol: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  priceValue: {
    fontSize: '20px',
    fontWeight: 800,
    color: theme.colors.text.primary,
  },
  actionButton: {
    background: theme.colors.background.subtle,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: '8px',
    padding: '6px 10px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: theme.colors.text.primary,
  },
  centered: {
    textAlign: 'center',
    padding: '60px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  emptyContainer: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '80px 0',
    color: theme.colors.text.muted,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  footer: {
    marginTop: '60px',
    paddingTop: '24px',
    borderTop: `1px solid ${theme.colors.border.light}`,
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: '11px',
    color: theme.colors.text.muted,
    maxWidth: '600px',
    margin: '0 auto',
  },
  retryBtn: {
    background: theme.colors.primary,
    color: theme.colors.background.main,
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
  },
};