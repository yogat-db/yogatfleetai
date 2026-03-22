export type NotificationType = 
  | 'job_application'
  | 'job_status'
  | 'application_status'
  | 'message'
  | 'system'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  data: any
  read: boolean
  created_at: string
}
