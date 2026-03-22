export interface ApiResponse<T = any> {
  data?: T
  error?: string
  status: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}