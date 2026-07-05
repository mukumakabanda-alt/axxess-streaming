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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      customer_points: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_phone: string
          id: string
          points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_phone: string
          id?: string
          points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string
          id?: string
          points?: number
          updated_at?: string
        }
        Relationships: []
      }
      netflix_accounts: {
        Row: {
          account_email: string
          account_password: string
          created_at: string
          id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_email: string
          account_password: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_email?: string
          account_password?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      netflix_profiles: {
        Row: {
          account_id: string
          assigned_customer: string | null
          created_at: string
          default_pin: string | null
          id: string
          is_vulnerable: boolean
          pin: string | null
          profile_index: number
          profile_name: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          assigned_customer?: string | null
          created_at?: string
          default_pin?: string | null
          id?: string
          is_vulnerable?: boolean
          pin?: string | null
          profile_index: number
          profile_name?: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          assigned_customer?: string | null
          created_at?: string
          default_pin?: string | null
          id?: string
          is_vulnerable?: boolean
          pin?: string | null
          profile_index?: number
          profile_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "netflix_profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "netflix_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      news_engagement: {
        Row: {
          article_key: string
          category: string | null
          first_seen_at: string
          headline: string
          last_seen_at: string
          like_count: number
          likes_today: number
          share_count: number
          shares_today: number
          view_count: number
          views_today: number
        }
        Insert: {
          article_key: string
          category?: string | null
          first_seen_at?: string
          headline?: string
          last_seen_at?: string
          like_count?: number
          likes_today?: number
          share_count?: number
          shares_today?: number
          view_count?: number
          views_today?: number
        }
        Update: {
          article_key?: string
          category?: string | null
          first_seen_at?: string
          headline?: string
          last_seen_at?: string
          like_count?: number
          likes_today?: number
          share_count?: number
          shares_today?: number
          view_count?: number
          views_today?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          admin_notes: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          duration_days: number | null
          expires_at: string | null
          id: string
          notes: string | null
          payment_status: string
          price_snapshot: number
          referral_code: string | null
          service_id: string | null
          service_name_snapshot: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          payment_status?: string
          price_snapshot: number
          referral_code?: string | null
          service_id?: string | null
          service_name_snapshot: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          payment_status?: string
          price_snapshot?: number
          referral_code?: string | null
          service_id?: string | null
          service_name_snapshot?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      page_visits: {
        Row: {
          created_at: string
          id: string
          path: string
          referer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          path?: string
          referer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          referer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      point_events: {
        Row: {
          created_at: string
          customer_phone: string
          delta: number
          id: string
          reason: string
        }
        Insert: {
          created_at?: string
          customer_phone: string
          delta: number
          id?: string
          reason: string
        }
        Update: {
          created_at?: string
          customer_phone?: string
          delta?: number
          id?: string
          reason?: string
        }
        Relationships: []
      }
      prime_accounts: {
        Row: {
          account_email: string
          account_password: string
          created_at: string
          id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_email: string
          account_password: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_email?: string
          account_password?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      prime_profiles: {
        Row: {
          account_id: string
          assigned_customer: string | null
          created_at: string
          default_pin: string | null
          id: string
          is_vulnerable: boolean
          pin: string | null
          profile_index: number
          profile_name: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          assigned_customer?: string | null
          created_at?: string
          default_pin?: string | null
          id?: string
          is_vulnerable?: boolean
          pin?: string | null
          profile_index: number
          profile_name?: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          assigned_customer?: string | null
          created_at?: string
          default_pin?: string | null
          id?: string
          is_vulnerable?: boolean
          pin?: string | null
          profile_index?: number
          profile_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prime_profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "prime_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      public_messages: {
        Row: {
          created_at: string
          id: string
          is_approved: boolean
          message: string
          name: string
          phone: string | null
          rating: number | null
          screenshot_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_approved?: boolean
          message: string
          name: string
          phone?: string | null
          rating?: number | null
          screenshot_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_approved?: boolean
          message?: string
          name?: string
          phone?: string | null
          rating?: number | null
          screenshot_url?: string | null
        }
        Relationships: []
      }
      referral_visits: {
        Row: {
          code: string
          created_at: string
          id: string
          referer: string | null
          referral_id: string | null
          user_agent: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          referer?: string | null
          referral_id?: string | null
          user_agent?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          referer?: string | null
          referral_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_visits_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          owner_name: string
          owner_phone: string
          reward_days_earned: number
          uses_count: number
          visits_count: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          owner_name: string
          owner_phone: string
          reward_days_earned?: number
          uses_count?: number
          visits_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          owner_name?: string
          owner_phone?: string
          reward_days_earned?: number
          uses_count?: number
          visits_count?: number
        }
        Relationships: []
      }
      reservations: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          note: string | null
          service_id: string | null
          service_name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone: string
          id?: string
          note?: string | null
          service_id?: string | null
          service_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          note?: string | null
          service_id?: string | null
          service_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      reward_unlocks: {
        Row: {
          acknowledged: boolean
          created_at: string
          customer_name: string | null
          customer_phone: string
          id: string
          tier_label: string
          tier_points: number
        }
        Insert: {
          acknowledged?: boolean
          created_at?: string
          customer_name?: string | null
          customer_phone: string
          id?: string
          tier_label: string
          tier_points: number
        }
        Update: {
          acknowledged?: boolean
          created_at?: string
          customer_name?: string | null
          customer_phone?: string
          id?: string
          tier_label?: string
          tier_points?: number
        }
        Relationships: []
      }
      services: {
        Row: {
          accent_color: string | null
          badge: string | null
          billing_period: string
          created_at: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          is_full: boolean
          name: string
          price_kwacha: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          badge?: string | null
          billing_period?: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_full?: boolean
          name: string
          price_kwacha: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          badge?: string | null
          billing_period?: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_full?: boolean
          name?: string
          price_kwacha?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string
          end_date: string
          id: string
          is_active: boolean
          order_id: string | null
          service_name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone: string
          end_date: string
          id?: string
          is_active?: boolean
          order_id?: string | null
          service_name: string
          start_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string
          end_date?: string
          id?: string
          is_active?: boolean
          order_id?: string | null
          service_name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          created_at: string
          customer_name: string
          id: string
          is_approved: boolean
          message: string
          rating: number | null
          screenshot_url: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          customer_name: string
          id?: string
          is_approved?: boolean
          message: string
          rating?: number | null
          screenshot_url?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          customer_name?: string
          id?: string
          is_approved?: boolean
          message?: string
          rating?: number | null
          screenshot_url?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      updates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_published: boolean
          like_count: number
          likes_today: number
          share_count: number
          shares_today: number
          title: string
          updated_at: string
          view_count: number
          views_today: number
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_published?: boolean
          like_count?: number
          likes_today?: number
          share_count?: number
          shares_today?: number
          title: string
          updated_at?: string
          view_count?: number
          views_today?: number
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_published?: boolean
          like_count?: number
          likes_today?: number
          share_count?: number
          shares_today?: number
          title?: string
          updated_at?: string
          view_count?: number
          views_today?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      award_points: {
        Args: { _delta: number; _name: string; _phone: string; _reason: string }
        Returns: number
      }
      claim_first_admin: { Args: never; Returns: boolean }
      get_customer_points: {
        Args: { _phone: string }
        Returns: {
          customer_name: string
          points: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_news_like: {
        Args: { _category: string; _headline: string; _key: string }
        Returns: undefined
      }
      increment_news_share: {
        Args: { _category: string; _headline: string; _key: string }
        Returns: undefined
      }
      increment_news_view: {
        Args: { _category: string; _headline: string; _key: string }
        Returns: undefined
      }
      increment_update_like: { Args: { _id: string }; Returns: undefined }
      increment_update_share: { Args: { _id: string }; Returns: undefined }
      increment_update_view: { Args: { _id: string }; Returns: undefined }
      log_page_visit: {
        Args: { _path: string; _referer: string; _session: string; _ua: string }
        Returns: undefined
      }
      record_referral_visit: {
        Args: { _code: string; _referer: string; _user_agent: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status: "pending" | "approved" | "completed" | "rejected"
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
    Enums: {
      app_role: ["admin", "user"],
      order_status: ["pending", "approved", "completed", "rejected"],
    },
  },
} as const
