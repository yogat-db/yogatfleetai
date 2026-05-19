'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowUpRight,
  Car,
  Check,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
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

type BasketItem = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  affiliate_link: string;
  platform: string;
  quantity: number;
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
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showVehicleFilter, setShowVehicleFilter] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

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
      list = list.filter((p) => (p.category || '') === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) =>
        `${p.name} ${p.description || ''} ${p.category || ''} ${p.platform}`.toLowerCase().includes(q)
      );
    }

    if (showVehicleFilter && make.trim()) {
      const mk = make.toLowerCase();
      list = list.filter((p) => {
        const text = `${p.name} ${p.description || ''} ${p.category || ''}`.toLowerCase();
        if (mk.includes('audi')) return /brake|filter|oil|sensor|headlight|wiper/.test(text);
        if (mk.includes('bmw')) return /filter|sensor|brake|suspension|oil/.test(text);
        return true;
      });
    }

    return list;
  }, [products, selectedCategory, searchQuery, showVehicleFilter, make, model, year]);

  const basketCount = useMemo(
    () => basket.reduce((sum, item) => sum + item.quantity, 0),
    [basket]
  );

  const basketSubtotal = useMemo(
    () => basket.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [basket]
  );

  const handleAddToBasket = (product: Product) => {
    const safePrice = Number(product.price || 0);

    setBasket((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...current,
        {
          id: product.id,
          name: product.name,
          price: safePrice,
          image_url: product.image_url,
          affiliate_link: product.affiliate_link,
          platform: product.platform,
          quantity: 1,
        },
      ];
    });

    setJustAddedId(product.id);
    window.setTimeout(() => setJustAddedId(null), 1400);
  };

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
          Discover parts, accessories, and workshop essentials with fast search,
          category filters, and a cleaner route into your basket.
        </p>

        <div className={styles.disclosureBanner}>
          Disclosure: This page contains affiliate links. If you purchase through
          them, we may earn a commission at no extra cost to you.
        </div>

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

      <section className={styles.stickyToolbar}>
        <div className={styles.toolbarSummary}>
          <span>{filteredProducts.length} products</span>
          <span className={styles.toolbarDot}>•</span>
          <span>{selectedCategory === 'all' ? 'All categories' : selectedCategory}</span>
        </div>

        <button type="button" className={styles.basketButton}>
          <ShoppingBag size={16} />
          Basket ({basketCount})
          <span className={styles.basketPrice}>£{basketSubtotal.toFixed(2)}</span>
        </button>
      </section>

      <section className={styles.controls}>
        <div className={styles.searchBar}>
          <Search size={18} />
          <input
            className={styles.searchInput}
            placeholder="Search products, brands, categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.categoryGrid}>
          {categoryOptions.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`${styles.categoryBtn} ${
                selectedCategory === cat ? styles.categoryActive : ''
              }`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'all' ? 'All items' : cat}
            </button>
          ))}
        </div>

        {showVehicleFilter ? (
          <div className={styles.vehicleCard}>
            <div className={styles.vehicleHead}>
              <SlidersHorizontal size={16} />
              <h2>Vehicle filter</h2>
            </div>

            <p>
              Use make, model, and year as a relevance layer until full fitment
              data is connected.
            </p>

            <div className={styles.vehicleInputGroup}>
              <input
                className={styles.vehicleInput}
                placeholder="Make e.g. Audi"
                value={make}
                onChange={(e) => setMake(e.target.value)}
              />
              <input
                className={styles.vehicleInput}
                placeholder="Model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
              <input
                className={styles.vehicleInput}
                placeholder="Year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </section>

      {loading ? (
        <section className={styles.productGrid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </section>
      ) : error ? (
        <div className={styles.errorBox} role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {filteredProducts.length === 0 ? (
            <div className={styles.emptyContainer}>
              <ShoppingBag size={42} />
              <h2>No products found</h2>
              <p>Try a different search term, category, or vehicle filter.</p>
            </div>
          ) : (
            <motion.section layout className={styles.productGrid}>
              {filteredProducts.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={idx}
                  added={justAddedId === product.id}
                  onOpen={() => onOpen(product)}
                  onAddToBasket={() => handleAddToBasket(product)}
                />
              ))}
            </motion.section>
          )}
        </AnimatePresence>
      )}

      <footer className={styles.footer}>
        <p>
          We may earn a commission when you purchase through links on this page.
          Products are shown to help users compare accessories, tools, and parts
          more quickly.
        </p>
      </footer>
    </main>
  );
}

function ProductCard({
  product,
  index,
  onOpen,
  onAddToBasket,
  added,
}: {
  product: Product;
  index: number;
  onOpen: () => void;
  onAddToBasket: () => void;
  added: boolean;
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
            <span className={styles.rating}>
              <Star size={12} fill="currentColor" /> {product.rating.toFixed(1)}
            </span>
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
        </div>

        <div className={styles.actionRow}>
          <button
            type="button"
            className={`${styles.secondaryButton} ${added ? styles.addedButton : ''}`}
            onClick={onAddToBasket}
          >
            {added ? <Check size={14} /> : <ShoppingBag size={14} />}
            {added ? 'Added' : 'Add to basket'}
          </button>

          <button type="button" className={styles.actionButton} onClick={onOpen}>
            View deal <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}