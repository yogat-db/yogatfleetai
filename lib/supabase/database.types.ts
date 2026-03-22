export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          bid_amount: number | null
          created_at: string | null
          id: string
          job_id: string
          mechanic_id: string
          message: string | null
          status: string | null
        }
        Insert: {
          bid_amount?: number | null
          created_at?: string | null
          id?: string
          job_id: string
          mechanic_id: string
          message?: string | null
          status?: string | null
        }
        Update: {
          bid_amount?: number | null
          created_at?: string | null
          id?: string
          job_id?: string
          mechanic_id?: string
          message?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
        ]
      }
      breakdown_offers: {
        Row: {
          affiliate_link: string | null
          created_at: string | null
          description: string | null
          features: string[] | null
          id: string
          price_monthly: number | null
          provider: string
        }
        Insert: {
          affiliate_link?: string | null
          created_at?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          price_monthly?: number | null
          provider: string
        }
        Update: {
          affiliate_link?: string | null
          created_at?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          price_monthly?: number | null
          provider?: string
        }
        Relationships: []
      }
      diagnostic_scans: {
        Row: {
          codes: string[] | null
          created_at: string
          id: string
          scanned_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          codes?: string[] | null
          created_at?: string
          id?: string
          scanned_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          codes?: string[] | null
          created_at?: string
          id?: string
          scanned_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_scans_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          bid_amount: number | null
          created_at: string | null
          id: string
          job_id: string | null
          mechanic_id: string | null
          message: string | null
          status: string | null
        }
        Insert: {
          bid_amount?: number | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          mechanic_id?: string | null
          message?: string | null
          status?: string | null
        }
        Update: {
          bid_amount?: number | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          mechanic_id?: string | null
          message?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          budget: number | null
          budget_max: number | null
          budget_min: number | null
          complexity: string | null
          created_at: string | null
          description: string
          dtc_code: string | null
          dtc_codes: string[] | null
          id: string
          lat: number
          lng: number
          location: string | null
          status: string | null
          title: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          budget?: number | null
          budget_max?: number | null
          budget_min?: number | null
          complexity?: string | null
          created_at?: string | null
          description: string
          dtc_code?: string | null
          dtc_codes?: string[] | null
          id?: string
          lat: number
          lng: number
          location?: string | null
          status?: string | null
          title: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          budget?: number | null
          budget_max?: number | null
          budget_min?: number | null
          complexity?: string | null
          created_at?: string | null
          description?: string
          dtc_code?: string | null
          dtc_codes?: string[] | null
          id?: string
          lat?: number
          lng?: number
          location?: string | null
          status?: string | null
          title?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanic_profiles: {
        Row: {
          address: string | null
          bio: string | null
          business_name: string
          created_at: string | null
          id: string
          lat: number | null
          lng: number | null
          phone: string | null
          specialties: string[] | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          years_experience: number | null
        }
        Insert: {
          address?: string | null
          bio?: string | null
          business_name: string
          created_at?: string | null
          id: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          specialties?: string[] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          years_experience?: number | null
        }
        Update: {
          address?: string | null
          bio?: string | null
          business_name?: string
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          specialties?: string[] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      mechanics: {
        Row: {
          address: string | null
          business_name: string
          created_at: string | null
          id: string
          lat: number | null
          lng: number | null
          phone: string | null
          service_radius: number | null
          stripe_customer_id: string | null
          stripe_onboarding_complete: boolean | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          address?: string | null
          business_name: string
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          service_radius?: number | null
          stripe_customer_id?: string | null
          stripe_onboarding_complete?: boolean | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          address?: string | null
          business_name?: string
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          service_radius?: number | null
          stripe_customer_id?: string | null
          stripe_onboarding_complete?: boolean | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          application_id: string
          content: string
          created_at: string | null
          id: string
          sender_id: string
        }
        Insert: {
          application_id: string
          content: string
          created_at?: string | null
          id?: string
          sender_id: string
        }
        Update: {
          application_id?: string
          content?: string
          created_at?: string | null
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          job_id: string | null
          mechanic_id: string | null
          rating: number | null
          reviewer_id: string | null
          to_mechanic_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          mechanic_id?: string | null
          rating?: number | null
          reviewer_id?: string | null
          to_mechanic_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          mechanic_id?: string | null
          rating?: number | null
          reviewer_id?: string | null
          to_mechanic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_to_mechanic_id_fkey"
            columns: ["to_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
        ]
      }
      service_events: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          mileage: number | null
          occurred_at: string
          title: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          mileage?: number | null
          occurred_at?: string
          title: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          mileage?: number | null
          occurred_at?: string
          title?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_accounts: {
        Row: {
          charges_enabled: boolean | null
          created_at: string | null
          details_submitted: boolean | null
          id: string
          mechanic_id: string
          stripe_account_id: string
        }
        Insert: {
          charges_enabled?: boolean | null
          created_at?: string | null
          details_submitted?: boolean | null
          id?: string
          mechanic_id: string
          stripe_account_id: string
        }
        Update: {
          charges_enabled?: boolean | null
          created_at?: string | null
          details_submitted?: boolean | null
          id?: string
          mechanic_id?: string
          stripe_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_accounts_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: true
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          job_id: string
          mechanic_id: string
          platform_fee: number
          released_at: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          job_id: string
          mechanic_id: string
          platform_fee: number
          released_at?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          job_id?: string
          mechanic_id?: string
          platform_fee?: number
          released_at?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string | null
          health_score: number | null
          id: string
          image_url: string | null
          lat: number | null
          license_plate: string
          lng: number | null
          make: string | null
          mileage: number | null
          model: string | null
          user_id: string
          year: number | null
        }
        Insert: {
          created_at?: string | null
          health_score?: number | null
          id?: string
          image_url?: string | null
          lat?: number | null
          license_plate: string
          lng?: number | null
          make?: string | null
          mileage?: number | null
          model?: string | null
          user_id: string
          year?: number | null
        }
        Update: {
          created_at?: string | null
          health_score?: number | null
          id?: string
          image_url?: string | null
          lat?: number | null
          license_plate?: string
          lng?: number | null
          make?: string | null
          mileage?: number | null
          model?: string | null
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

