export type NotificationType = 
  | 'job_application'   // Someone applied for your job
  | 'job_status'        // A job you posted changed (e.g., Completed)
  | 'application_status' // A job you applied for changed (e.g., Accepted)
  | 'message'           // New chat message
  | 'system'            // System alerts (e.g., Subscription expiring)

/**
 * Define the structure of the 'data' field to prevent runtime crashes
 */
export interface NotificationMetadata {
  job_id?: string;
  application_id?: string;
  sender_id?: string;
  chat_id?: string;
  external_url?: string;
  status_change?: {
    from: string;
    to: string;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  /** * Strict typing for metadata ensures the IDE helps you 
   * write 'data.job_id' safely.
   */
  data: NotificationMetadata | null; 
  read: boolean;
  created_at: string;
}

/**
 * Helper for the unread badge in your Bell component
 */
export interface NotificationSummary {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}