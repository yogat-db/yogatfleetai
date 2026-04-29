'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowUpRight,
  Car,
  Search,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import styles from './page.module.css';
import { SkeletonCard } from '@/components/ui/SkeletonCard';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  platform: string;
  affiliate_link: string;
  category: string | null;
  commission_rate?: number | null;
  rating?: number | null;
};

async function trackClick(productId: string, platform: string, url: string) {
  try {
    await fetch('/api/affiliate/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, platform, destinationUrl: url }),
    });
  } catch {}
}

export default function AffiliateMarketplace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showVehicleFilter, setShowVehicleFilter] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/affiliate/products', { cache: 'no-store' });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || 'Failed to load products');
        }

        if (!active) return;
        setProducts(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>(['all']);
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return [...set];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = products.slice();

    if (selectedCategory !== 'all') {
      list = list.filter(p => (p.category || '') === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        `${p.name} ${p.description || ''} ${p.category || ''}`.toLowerCase().includes(q)
      );
    }

    if (showVehicleFilter && make.trim()) {
      const mk = make.toLowerCase();
      list = list.filter(p => {
        const text = `${p.name} ${p.description || ''} ${p.category || ''}`.toLowerCase();
        if (mk.includes('audi')) return /brake|filter|oil|sensor|headlight|wiper/.test(text);
        if (mk.includes('bmw')) return /filter|sensor|brake|suspension|oil/.test(text);
        return true;
      });
    }

    return list;
  }, [products, selectedCategory, searchQuery, showVehicleFilter, make, model, year]);

  const onOpen = (product: Product) => {
    void trackClick(product.id, product.platform, product.affiliate_link);
    window.open(product.affiliate_link, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.badge}>
          <Sparkles size={14} /> Curated affiliate marketplace
        </div>
        <h1 className={styles.title}>Car Accessories & Parts</h1>
        <p className={styles.subtitle}>
          Curated deals from eBay and Channel3 with fast filtering, clear attribution, and a scalable product pipeline.
        </p>
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${!showVehicleFilter ? styles.tabBtnActive : ''}`}
            onClick={() => setShowVehicleFilter(false)}
            type="button"
          >
            <ShoppingBag size={16} /> Browse all
          </button>
          <button
            className={`${styles.tabBtn} ${showVehicleFilter ? styles.tabBtnActive : ''}`}
            onClick={() => setShowVehicleFilter(true)}
            type="button"
          >
            <Car size={16} /> Search by car
          </button>
        </div>
      </section>

      <section className={styles.controls}>
        <div className={styles.searchBar}>
          <Search size={18} />
          <input
            className={styles.searchInput}
            placeholder="Search products, brands, categories..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.categoryGrid}>
          {categoryOptions.map(cat => (
            <button
              key={cat}
              type="button"
              className={`${styles.categoryBtn} ${selectedCategory === cat ? styles.categoryActive : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'all' ? 'All items' : cat}
            </button>
          ))}
        </div>

        {showVehicleFilter ? (
          <div className={styles.vehicleCard}>
            <h2>Vehicle filter</h2>
            <p>Use this as a simple relevance filter until your vehicle-fitment data is connected.</p>
            <div className={styles.vehicleInputGroup}>
              <input
                className={styles.vehicleInput}
                placeholder="Make e.g. Audi"
                value={make}
                onChange={e => setMake(e.target.value)}
              />
              <input
                className={styles.vehicleInput}
                placeholder="Model"
                value={model}
                onChange={e => setModel(e.target.value)}
              />
              <input
                className={styles.vehicleInput}
                placeholder="Year"
                value={year}
                onChange={e => setYear(e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </section>

      {loading ? (
        <section className={styles.productGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </section>
      ) : error ? (
        <div className={styles.errorBox} role="alert">
          <AlertCircle size={18} /> <span>{error}</span>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {filteredProducts.length === 0 ? (
            <div className={styles.emptyContainer}>
              <ShoppingBag size={42} />
              <h2>No products found</h2>
              <p>Try a different search or category.</p>
            </div>
          ) : (
            <motion.section layout className={styles.productGrid}>
              {filteredProducts.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={idx}
                  onOpen={() => onOpen(product)}
                />
              ))}
            </motion.section>
          )}
        </AnimatePresence>
      )}

      <footer className={styles.footer}>
        <p>
          <strong>Affiliate disclosure:</strong> We may earn a commission when you click and purchase through links on this page.
        </p>
      </footer>
    </main>
  );
}

function ProductCard({
  product,
  index,
  onOpen,
}: {
  product: Product;
  index: number;
  onOpen: () => void;
}) {
  const platformLabel =
    product.platform.toLowerCase() === 'ebay'
      ? 'eBay Deals'
      : product.platform.toLowerCase() === 'channel3'
        ? 'Channel3'
        : product.platform;

  return (
    <motion.article
      className={styles.card}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ y: -4 }}
    >
      <div className={styles.imageWrapper}>
        <img
          className={styles.image}
          src={product.image_url || '/placeholder-car.png'}
          alt={product.name}
          loading="lazy"
        />
        <span className={styles.platformBadge}>{platformLabel}</span>
      </div>

      <div className={styles.cardContent}>
        <div className={styles.metaRow}>
          <span className={styles.catLabel}>{product.category || 'Parts'}</span>
          {typeof product.rating === 'number' ? (
            <span className={styles.rating}>★ {product.rating.toFixed(1)}</span>
          ) : null}
        </div>

        <h3 className={styles.cardTitle}>{product.name}</h3>
        <p className={styles.cardDescription}>
          {product.description || 'No description available.'}
        </p>

        <div className={styles.footerRow}>
          <div className={styles.price}>
            <span className={styles.currencySymbol}>£</span>
            <span>{Number(product.price || 0).toFixed(2)}</span>
          </div>

          <button type="button" className={styles.actionButton} onClick={onOpen}>
            View Deal <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}