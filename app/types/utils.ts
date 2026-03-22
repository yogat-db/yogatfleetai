export interface Coordinates {
  lat: number
  lng: number
}

export interface Address {
  line1: string
  line2?: string
  city: string
  postcode: string
  country: string
}

export interface DateRange {
  start: string
  end: string
}

export interface FilterOptions {
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}