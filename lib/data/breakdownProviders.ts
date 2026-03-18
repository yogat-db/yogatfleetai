export interface BreakdownProvider {
  id: string
  name: string
  logo: string
  description: string
  monthlyPrice: number
  annualPrice: number
  coverage: string[]
  rating: number
}

export const providers: BreakdownProvider[] = [
  {
    id: 'aa',
    name: 'AA Breakdown',
    logo: '/logos/aa.png',
    description: '24/7 roadside assistance with nationwide coverage.',
    monthlyPrice: 12.99,
    annualPrice: 129.99,
    coverage: ['Roadside', 'Recovery', 'At home', 'Onward travel'],
    rating: 4.5,
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
  },
  {
    id: 'greenflag',
    name: 'Green Flag',
    logo: '/logos/greenflag.png',
    description: 'Award-winning breakdown cover with flexible options.',
    monthlyPrice: 9.99,
    annualPrice: 99.99,
    coverage: ['Roadside', 'Recovery', 'Nationwide'],
    rating: 4.3,
  },
]