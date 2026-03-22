// app/types/marketplace.ts

export type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';
export type UserRole = 'client' | 'freelancer' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  email?: string;
  website?: string;
  logo?: string;
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  budget?: number;
  category?: string;
  status: JobStatus;
  client_id: string;
  company_id?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
  client_feedback?: string;
  // Relations (optional)
  client?: User;
  company?: Company;
  applications?: Application[];
}

export interface Application {
  id: string;
  job_id: string;
  user_id: string;
  cover_letter?: string;
  resume_url?: string;
  status: ApplicationStatus;
  applied_at: string;
  notes?: string;
  // Relations
  job?: Job;
  user?: User;
}

export interface CreateJobPayload {
  title: string;
  description: string;
  budget?: number;
  category?: string;
  client_id: string;
  company_id?: string;
}

export interface CreateApplicationPayload {
  job_id: string;
  user_id: string;
  cover_letter?: string;
  resume_url?: string;
  additional_info?: Record<string, unknown>;
}

export interface UpdateJobPayload {
  title?: string;
  description?: string;
  budget?: number;
  category?: string;
  status?: JobStatus;
  client_feedback?: string;
}

export interface UpdateApplicationPayload {
  status?: ApplicationStatus;
  notes?: string;
}

// For API responses
export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// For paginated responses
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}