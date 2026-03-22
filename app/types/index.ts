// ----------------------------------------------------------------------
// Central export file for all shared types
// Import anywhere using: import type { Vehicle, Job } from '@/app/types'
// ----------------------------------------------------------------------

// Fleet management types
export type {
  Vehicle,
  VehicleAI,
  ServiceEvent,
  DiagnosticScan,
  MaintenanceItem,
  MaintenanceSchedule,
  BreakdownPrediction,
} from './fleet'

// Marketplace types
export type {
  Job,
  JobStatus,
  Application,
  ApplicationStatus,
  Mechanic,
  MechanicProfile,
  SubscriptionPlan,
} from './marketplace'

// Notification types
export type {
  Notification,
  NotificationType,
} from './notification'

// User & settings types
export type {
  UserPreferences,
  UserProfile,
} from './user'

// API response types
export type {
  ApiResponse,
  PaginatedResponse,
} from './api'

// Utility types
export type {
  Coordinates,
  Address,
  DateRange,
  FilterOptions,
} from './utils'