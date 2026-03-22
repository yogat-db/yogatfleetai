export interface BreakdownProvider {
  id: string
  name: string
  logo: string
  description: string
  monthlyPrice: number
  annualPrice: number
  coverage: string[]           // e.g., ['Roadside', 'Recovery', 'At home', 'European']
  features: string[]            // additional features (e.g., 'Courtesy car', 'Mobile mechanic')
  rating: number                // average rating (0-5)
  ratingCount: number           // number of ratings
  affiliateUrl: string          // direct affiliate link
  phone?: string                // optional phone number for inquiries
  sponsored?: boolean           // true if this is a paid/sponsored listing
  badge?: string                // optional badge like "Best Value" or "Top Rated"
}

// Monetisation strategies:
// - Affiliate commissions: each click-through via affiliateUrl earns a commission (typically £10–£25 per sale)
// - Sponsored listings: providers pay for higher placement or a "sponsored" badge
// - Premium placement: featured listings at the top
// - Compare and buy: integrate with comparison engines that pay per lead

export const providers: BreakdownProvider[] = [
  {
    id: 'aa',
    name: 'AA Breakdown',
    logo: '/logos/aa.png',
    description: 'The UK’s most trusted breakdown provider with 24/7 roadside assistance and nationwide coverage.',
    monthlyPrice: 12.99,
    annualPrice: 129.99,
    coverage: ['Roadside', 'Recovery', 'At home', 'Onward travel'],
    features: ['Mobile mechanic', 'Courtesy car', 'Free app'],
    rating: 4.5,
    ratingCount: 12453,
    affiliateUrl: 'https://www.theaa.com/affiliate?ref=yogat',
    phone: '0800 123 456',
    sponsored: true,
    badge: 'Most Trusted',
  },
  {
    id: 'rac',
    name: 'RAC Breakdown',
    logo: '/logos/rac.png',
    description: 'Comprehensive cover including European breakdown and a network of 1,500 approved garages.',
    monthlyPrice: 14.99,
    annualPrice: 149.99,
    coverage: ['Roadside', 'Recovery', 'At home', 'European cover'],
    features: ['Battery replacement', 'Key assist', 'Online tracking'],
    rating: 4.7,
    ratingCount: 9876,
    affiliateUrl: 'https://www.rac.co.uk/affiliate?ref=yogat',
    phone: '0330 159 789',
    badge: 'Top Rated',
  },
  {
    id: 'greenflag',
    name: 'Green Flag',
    logo: '/logos/greenflag.png',
    description: 'Award-winning breakdown cover with flexible options and no call-out fee.',
    monthlyPrice: 9.99,
    annualPrice: 99.99,
    coverage: ['Roadside', 'Recovery', 'Nationwide'],
    features: ['No call-out fee', 'Named driver cover', '24/7 helpline'],
    rating: 4.3,
    ratingCount: 6543,
    affiliateUrl: 'https://www.greenflag.com/affiliate?ref=yogat',
    phone: '0345 246 870',
    badge: 'Best Value',
  },
  {
    id: 'startrescue',
    name: 'Start Rescue',
    logo: '/logos/startrescue.png',
    description: 'Multi-award winning breakdown cover with a 4.8 Trustpilot rating.',
    monthlyPrice: 8.99,
    annualPrice: 89.99,
    coverage: ['Roadside', 'Recovery', 'At home', 'European'],
    features: ['Courtesy car', 'Mobile app', 'RAC approved'],
    rating: 4.8,
    ratingCount: 3210,
    affiliateUrl: 'https://www.startrescue.co.uk/affiliate?ref=yogat',
    sponsored: true,
  },
  {
    id: 'lv',
    name: 'LV= Britannia Rescue',
    logo: '/logos/lv.png',
    description: 'Defaqto 5-star rated breakdown cover with comprehensive protection.',
    monthlyPrice: 11.99,
    annualPrice: 119.99,
    coverage: ['Roadside', 'Recovery', 'At home', 'European'],
    features: ['Family cover', 'Key cover', 'Mobile mechanic'],
    rating: 4.4,
    ratingCount: 2789,
    affiliateUrl: 'https://www.lv.com/breakdown/affiliate?ref=yogat',
  },
  {
    id: 'axa',
    name: 'AXA Breakdown',
    logo: '/logos/axa.png',
    description: 'Reliable breakdown cover with optional European extension.',
    monthlyPrice: 10.49,
    annualPrice: 104.99,
    coverage: ['Roadside', 'Recovery', 'At home'],
    features: ['Courtesy car', 'National network'],
    rating: 4.2,
    ratingCount: 1567,
    affiliateUrl: 'https://www.axa.co.uk/breakdown/affiliate?ref=yogat',
  },
  {
    id: 'admiral',
    name: 'Admiral Breakdown',
    logo: '/logos/admiral.png',
    description: 'Multi-car discounts and flexible cover options.',
    monthlyPrice: 9.49,
    annualPrice: 94.99,
    coverage: ['Roadside', 'Recovery'],
    features: ['Multi-car', 'Named driver'],
    rating: 4.1,
    ratingCount: 1890,
    affiliateUrl: 'https://www.admiral.com/breakdown/affiliate?ref=yogat',
  },
]

// Helper functions
export function getProviderById(id: string): BreakdownProvider | undefined {
  return providers.find(p => p.id === id)
}

export function searchProviders(query: string): BreakdownProvider[] {
  const lower = query.toLowerCase()
  return providers.filter(p =>
    p.name.toLowerCase().includes(lower) ||
    p.description.toLowerCase().includes(lower) ||
    p.coverage.some(c => c.toLowerCase().includes(lower)) ||
    p.features.some(f => f.toLowerCase().includes(lower))
  )
}

export function filterByCoverage(coverageType: string): BreakdownProvider[] {
  return providers.filter(p =>
    p.coverage.some(c => c.toLowerCase() === coverageType.toLowerCase())
  )
}

export function sortByPrice(ascending = true): BreakdownProvider[] {
  return [...providers].sort((a, b) =>
    ascending ? a.monthlyPrice - b.monthlyPrice : b.monthlyPrice - a.monthlyPrice
  )
}

export function sortByRating(ascending = false): BreakdownProvider[] {
  return [...providers].sort((a, b) =>
    ascending ? a.rating - b.rating : b.rating - a.rating
  )
}

// Revenue generation: affiliate links + sponsored placements
// Sponsored providers are marked with sponsored:true and can be boosted in the UI
export function getSponsoredProviders(): BreakdownProvider[] {
  return providers.filter(p => p.sponsored)
}

// For a "Compare" page, you can integrate with a comparison engine that pays per click
export function getComparisonUrl(providerIds: string[]): string {
  // This could generate a link to a comparison site like GoCompare or MoneySuperMarket
  // with affiliate parameters
  const base = 'https://www.gocompare.com/breakdown?providers='
  return base + providerIds.join(',') + '&aff=yogat'
}