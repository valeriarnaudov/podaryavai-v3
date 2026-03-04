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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      concierge_orders: {
        Row: {
          created_at: string
          delivery_address: string | null
          gift_idea_id: string | null
          id: string
          payment_method: string | null
          recipient_name: string | null
          recipient_phone: string | null
          status: string | null
          total_price: number | null
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_address?: string | null
          gift_idea_id?: string | null
          id?: string
          payment_method?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: string | null
          total_price?: number | null
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_address?: string | null
          gift_idea_id?: string | null
          id?: string
          payment_method?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: string | null
          total_price?: number | null
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_orders_gift_idea_id_fkey"
            columns: ["gift_idea_id"]
            isOneToOne: false
            referencedRelation: "gift_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          age_group: string | null
          avatar_url: string | null
          budget_preference: string | null
          created_at: string
          dislikes: string | null
          favorite_color: string | null
          favorite_vibe: string | null
          first_name: string | null
          id: string
          interests: string | null
          last_name: string | null
          name: string
          notes: string | null
          personality: string | null
          relationship: string | null
          style: string | null
          updated_at: string
          user_id: string
          weekend_activity: string | null
        }
        Insert: {
          age_group?: string | null
          avatar_url?: string | null
          budget_preference?: string | null
          created_at?: string
          dislikes?: string | null
          favorite_color?: string | null
          favorite_vibe?: string | null
          first_name?: string | null
          id?: string
          interests?: string | null
          last_name?: string | null
          name: string
          notes?: string | null
          personality?: string | null
          relationship?: string | null
          style?: string | null
          updated_at?: string
          user_id: string
          weekend_activity?: string | null
        }
        Update: {
          age_group?: string | null
          avatar_url?: string | null
          budget_preference?: string | null
          created_at?: string
          dislikes?: string | null
          favorite_color?: string | null
          favorite_vibe?: string | null
          first_name?: string | null
          id?: string
          interests?: string | null
          last_name?: string | null
          name?: string
          notes?: string | null
          personality?: string | null
          relationship?: string | null
          style?: string | null
          updated_at?: string
          user_id?: string
          weekend_activity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          subject: string
          trigger_days: number
          updated_at: string
        }
        Insert: {
          body_html: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          trigger_days: number
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          trigger_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          ai_recommendations: Json | null
          contact_id: string
          created_at: string
          event_date: string
          event_type: string | null
          id: string
          is_recurring: boolean | null
          title: string
          user_id: string
        }
        Insert: {
          ai_recommendations?: Json | null
          contact_id: string
          created_at?: string
          event_date: string
          event_type?: string | null
          id?: string
          is_recurring?: boolean | null
          title: string
          user_id: string
        }
        Update: {
          ai_recommendations?: Json | null
          contact_id?: string
          created_at?: string
          event_date?: string
          event_type?: string | null
          id?: string
          is_recurring?: boolean | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_ideas: {
        Row: {
          contact_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_manual: boolean | null
          is_rejected: boolean | null
          is_saved: boolean | null
          price_range: string | null
          source_url: string | null
          title: string
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_manual?: boolean | null
          is_rejected?: boolean | null
          is_saved?: boolean | null
          price_range?: string | null
          source_url?: string | null
          title: string
          user_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_manual?: boolean | null
          is_rejected?: boolean | null
          is_saved?: boolean | null
          price_range?: string | null
          source_url?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_ideas_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_ideas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      global_gifts: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_vip: boolean | null
          price: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_vip?: boolean | null
          price?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_vip?: boolean | null
          price?: string | null
          title?: string
        }
        Relationships: []
      }
      karma_rewards: {
        Row: {
          cost_points: number
          created_at: string
          description: string | null
          duration_days: number
          id: string
          is_active: boolean
          reward_metadata: Json | null
          reward_type: string
          reward_value: string
          title: string
        }
        Insert: {
          cost_points?: number
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          reward_metadata?: Json | null
          reward_type?: string
          reward_value: string
          title: string
        }
        Update: {
          cost_points?: number
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          reward_metadata?: Json | null
          reward_type?: string
          reward_value?: string
          title?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: string
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          features: Json
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          plan_key: string
          price: number
          price_annual: number | null
          stripe_price_id: string | null
          stripe_price_id_annual: string | null
        }
        Insert: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          plan_key: string
          price?: number
          price_annual?: number | null
          stripe_price_id?: string | null
          stripe_price_id_annual?: string | null
        }
        Update: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          plan_key?: string
          price?: number
          price_annual?: number | null
          stripe_price_id?: string | null
          stripe_price_id_annual?: string | null
        }
        Relationships: []
      }
      user_active_rewards: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          reward_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          reward_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_active_rewards_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "karma_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_active_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_karma_history: {
        Row: {
          action_type: string
          created_at: string
          description: string
          id: string
          points: number
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description: string
          id?: string
          points: number
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string
          id?: string
          points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_karma_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          app_language: string
          app_theme: string
          avatar_url: string | null
          created_at: string
          daily_generations_count: number | null
          email: string
          free_deliveries_count: number | null
          full_name: string | null
          giftinder_preferences: Json | null
          has_golden_aura: boolean | null
          has_vip_giftinder: boolean | null
          id: string
          is_admin: boolean | null
          is_banned: boolean | null
          karma_boost_until: string | null
          karma_points: number | null
          last_giftinder_generation: string | null
          notify_email_events: boolean
          subscription_expires_at: string | null
          subscription_plan: string | null
          updated_at: string
          wallet_balance: number | null
        }
        Insert: {
          app_language?: string
          app_theme?: string
          avatar_url?: string | null
          created_at?: string
          daily_generations_count?: number | null
          email: string
          free_deliveries_count?: number | null
          full_name?: string | null
          giftinder_preferences?: Json | null
          has_golden_aura?: boolean | null
          has_vip_giftinder?: boolean | null
          id: string
          is_admin?: boolean | null
          is_banned?: boolean | null
          karma_boost_until?: string | null
          karma_points?: number | null
          last_giftinder_generation?: string | null
          notify_email_events?: boolean
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          updated_at?: string
          wallet_balance?: number | null
        }
        Update: {
          app_language?: string
          app_theme?: string
          avatar_url?: string | null
          created_at?: string
          daily_generations_count?: number | null
          email?: string
          free_deliveries_count?: number | null
          full_name?: string | null
          giftinder_preferences?: Json | null
          has_golden_aura?: boolean | null
          has_vip_giftinder?: boolean | null
          id?: string
          is_admin?: boolean | null
          is_banned?: boolean | null
          karma_boost_until?: string | null
          karma_points?: number | null
          last_giftinder_generation?: string | null
          notify_email_events?: boolean
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          updated_at?: string
          wallet_balance?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_swipe_karma: {
        Args: { gift_idea_id: string; reward_amount: number }
        Returns: boolean
      }
      get_karma_claims_history: {
        Args: never
        Returns: {
          action_type: string
          created_at: string
          description: string
          id: string
          points: number
          user_email: string
          user_full_name: string
          user_id: string
        }[]
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      redeem_karma_reward: {
        Args: { p_reward_id: string; p_user_id: string }
        Returns: boolean
      }
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
