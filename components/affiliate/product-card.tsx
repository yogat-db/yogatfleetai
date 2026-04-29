'use client';

import Link from 'next/link';
import ImageWithFallback from './image-with-fallback';

type Product = {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  image_url?: string | null;
  affiliate_link: string;
  category?: string | null;
  platform?: string | null;
};

function formatPrice(price?: number | null) {
  if (!price || price <= 0) return null;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 2,
  }).format(price);
}

function ctaLabel(platform?: string | null) {
  if (platform === 'ebay') return 'Shop on eBay';
  if (platform === 'channel3') return 'View deal';
  return 'View product';
}

export default function ProductCard({ product }: { product: Product }) {
  const priceLabel = formatPrice(product.price);

  return (
    <article className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm transition hover:border-emerald-400/40 hover:bg-white/7">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
        <ImageWithFallback
          src={product.image_url || '/placeholder-car.png'}
          alt={product.name}
          fill
          className="object-cover transition duration-300 group-hover:scale-[1.02]"
          sizes="(max-width: 768px) 100vw, 33vw"
          fallbackSrc="/placeholder-car.png"
        />
      </div>

      <div className="space-y-4 p-5">
        <div className="space-y-2">
          {product.category ? (
            <div className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
              {product.category}
            </div>
          ) : null}

          <h3 className="line-clamp-2 text-lg font-semibold text-white">
            {product.name}
          </h3>

          {product.description ? (
            <p className="line-clamp-2 text-sm text-slate-300">
              {product.description}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            {priceLabel ? (
              <p className="text-base font-semibold text-white">{priceLabel}</p>
            ) : (
              <p className="text-sm text-slate-400">See latest price</p>
            )}
          </div>

          <Link
            href={product.affiliate_link}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
          >
            {ctaLabel(product.platform)}
          </Link>
        </div>
      </div>
    </article>
  );
}