export interface UserPreferences {
  email_notifications: boolean
  push_notifications: boolean
}

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
}