export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      automation_events: {
        Row: {
          agent_id: string | null
          call_id: string | null
          contact_id: string | null
          created_at: string
          error: string | null
          event_type: string
          id: string
          message: string
          metadata: Json
          org_id: string
          phone_number: string | null
          source: string
          status: string
        }
        Insert: {
          agent_id?: string | null
          call_id?: string | null
          contact_id?: string | null
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          message: string
          metadata?: Json
          org_id: string
          phone_number?: string | null
          source: string
          status: string
        }
        Update: {
          agent_id?: string | null
          call_id?: string | null
          contact_id?: string | null
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          message?: string
          metadata?: Json
          org_id?: string
          phone_number?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "voice_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_events_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      },
      inbox_reviews: {
        Row: {
          created_at: string
          id: string
          item_key: string
          item_type: string
          org_id: string
          reviewed_at: string
          reviewed_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_key: string
          item_type: string
          org_id: string
          reviewed_at?: string
          reviewed_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_key?: string
          item_type?: string
          org_id?: string
          reviewed_at?: string
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbox_reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_tasks: {
        Row: {
          agent_id: string | null
          call_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          org_id: string
          priority: string
          source: string
          source_event_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          call_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          org_id: string
          priority?: string
          source?: string
          source_event_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          call_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          org_id?: string
          priority?: string
          source?: string
          source_event_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "voice_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_tasks_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_tasks_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "automation_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          agent_id: string | null
          booking_result: Json | null
          created_at: string
          credits_used: number | null
          direction: string
          duration_seconds: number | null
          ended_at: string | null
          ended_reason: string | null
          from_number: string | null
          id: string
          org_id: string
          phone_number_id: string | null
          recording_url: string | null
          sentiment: string | null
          sms_status: Json
          started_at: string | null
          status: string
          summary: string | null
          to_number: string | null
          transcript: Json | null
          updated_at: string
          vapi_call_id: string | null
        }
        Insert: {
          agent_id?: string | null
          booking_result?: Json | null
          created_at?: string
          credits_used?: number | null
          direction: string
          duration_seconds?: number | null
          ended_at?: string | null
          ended_reason?: string | null
          from_number?: string | null
          id?: string
          org_id: string
          phone_number_id?: string | null
          recording_url?: string | null
          sentiment?: string | null
          sms_status?: Json
          started_at?: string | null
          status?: string
          summary?: string | null
          to_number?: string | null
          transcript?: Json | null
          updated_at?: string
          vapi_call_id?: string | null
        }
        Update: {
          agent_id?: string | null
          booking_result?: Json | null
          created_at?: string
          credits_used?: number | null
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          ended_reason?: string | null
          from_number?: string | null
          id?: string
          org_id?: string
          phone_number_id?: string | null
          recording_url?: string | null
          sentiment?: string | null
          sms_status?: Json
          started_at?: string | null
          status?: string
          summary?: string | null
          to_number?: string | null
          transcript?: Json | null
          updated_at?: string
          vapi_call_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "phone_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_voice_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "voice_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          consent_given_at: string | null
          created_at: string
          do_not_call: boolean
          email: string | null
          first_name: string | null
          id: string
          language_preference: string
          last_call_at: string | null
          last_name: string | null
          lead_score: number
          notes: string | null
          org_id: string
          phone: string | null
          tags: string[]
          total_calls: number
          updated_at: string
        }
        Insert: {
          company?: string | null
          consent_given_at?: string | null
          created_at?: string
          do_not_call?: boolean
          email?: string | null
          first_name?: string | null
          id?: string
          language_preference?: string
          last_call_at?: string | null
          last_name?: string | null
          lead_score?: number
          notes?: string | null
          org_id: string
          phone?: string | null
          tags?: string[]
          total_calls?: number
          updated_at?: string
        }
        Update: {
          company?: string | null
          consent_given_at?: string | null
          created_at?: string
          do_not_call?: boolean
          email?: string | null
          first_name?: string | null
          id?: string
          language_preference?: string
          last_call_at?: string | null
          last_name?: string | null
          lead_score?: number
          notes?: string | null
          org_id?: string
          phone?: string | null
          tags?: string[]
          total_calls?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          business_email: string | null
          business_hours: Json
          business_phone: string | null
          booking_enabled: boolean
          calcom_api_key: string | null
          calcom_event_type_id: string | null
          calcom_username: string | null
          created_at: string
          credits_balance: number
          default_language: string
          default_max_call_duration_minutes: number
          default_voice_id: string | null
          default_voice_provider: string
          id: string
          name: string
          owner_notification_phone: string | null
          slug: string
          sms_booking_confirmation_template: string | null
          sms_enabled: boolean
          sms_followup_template: string | null
          sms_missed_call_template: string | null
          sms_sender_number: string | null
          sms_sender_phone_number_id: string | null
          updated_at: string
          timezone: string
          voice_minutes_used: number
          website_url: string | null
        }
        Insert: {
          business_email?: string | null
          business_hours?: Json
          business_phone?: string | null
          booking_enabled?: boolean
          calcom_api_key?: string | null
          calcom_event_type_id?: string | null
          calcom_username?: string | null
          created_at?: string
          credits_balance?: number
          default_language?: string
          default_max_call_duration_minutes?: number
          default_voice_id?: string | null
          default_voice_provider?: string
          id?: string
          name: string
          owner_notification_phone?: string | null
          slug: string
          sms_booking_confirmation_template?: string | null
          sms_enabled?: boolean
          sms_followup_template?: string | null
          sms_missed_call_template?: string | null
          sms_sender_number?: string | null
          sms_sender_phone_number_id?: string | null
          updated_at?: string
          timezone?: string
          voice_minutes_used?: number
          website_url?: string | null
        }
        Update: {
          business_email?: string | null
          business_hours?: Json
          business_phone?: string | null
          booking_enabled?: boolean
          calcom_api_key?: string | null
          calcom_event_type_id?: string | null
          calcom_username?: string | null
          created_at?: string
          credits_balance?: number
          default_language?: string
          default_max_call_duration_minutes?: number
          default_voice_id?: string | null
          default_voice_provider?: string
          id?: string
          name?: string
          owner_notification_phone?: string | null
          slug?: string
          sms_booking_confirmation_template?: string | null
          sms_enabled?: boolean
          sms_followup_template?: string | null
          sms_missed_call_template?: string | null
          sms_sender_number?: string | null
          sms_sender_phone_number_id?: string | null
          updated_at?: string
          timezone?: string
          voice_minutes_used?: number
          website_url?: string | null
        }
        Relationships: []
      }
      phone_numbers: {
        Row: {
          agent_id: string | null
          area_code: string | null
          capabilities: Json
          country: string
          created_at: string
          friendly_name: string | null
          id: string
          is_active: boolean
          monthly_cost: number | null
          monthly_cost_currency: string | null
          org_id: string
          phone_number: string
          provisioning_error: string | null
          provisioning_status: string
          twilio_sid: string | null
          updated_at: string
          vapi_phone_number_id: string | null
        }
        Insert: {
          agent_id?: string | null
          area_code?: string | null
          capabilities?: Json
          country?: string
          created_at?: string
          friendly_name?: string | null
          id?: string
          is_active?: boolean
          monthly_cost?: number | null
          monthly_cost_currency?: string | null
          org_id: string
          phone_number: string
          provisioning_error?: string | null
          provisioning_status?: string
          twilio_sid?: string | null
          updated_at?: string
          vapi_phone_number_id?: string | null
        }
        Update: {
          agent_id?: string | null
          area_code?: string | null
          capabilities?: Json
          country?: string
          created_at?: string
          friendly_name?: string | null
          id?: string
          is_active?: boolean
          monthly_cost?: number | null
          monthly_cost_currency?: string | null
          org_id?: string
          phone_number?: string
          provisioning_error?: string | null
          provisioning_status?: string
          twilio_sid?: string | null
          updated_at?: string
          vapi_phone_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_numbers_voice_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "voice_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_agents: {
        Row: {
          created_at: string
          first_message: string | null
          id: string
          knowledge_base: Json
          language: string
          max_call_duration_minutes: number
          name: string
          org_id: string
          status: string
          system_prompt: string | null
          transfer_phone_number: string | null
          updated_at: string
          vapi_assistant_id: string | null
          vertical: string
          voice_id: string | null
          voice_provider: string
        }
        Insert: {
          created_at?: string
          first_message?: string | null
          id?: string
          knowledge_base?: Json
          language?: string
          max_call_duration_minutes?: number
          name: string
          org_id: string
          status?: string
          system_prompt?: string | null
          transfer_phone_number?: string | null
          updated_at?: string
          vapi_assistant_id?: string | null
          vertical?: string
          voice_id?: string | null
          voice_provider?: string
        }
        Update: {
          created_at?: string
          first_message?: string | null
          id?: string
          knowledge_base?: Json
          language?: string
          max_call_duration_minutes?: number
          name?: string
          org_id?: string
          status?: string
          system_prompt?: string | null
          transfer_phone_number?: string | null
          updated_at?: string
          vapi_assistant_id?: string | null
          vertical?: string
          voice_id?: string | null
          voice_provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_agents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_ids: { Args: never; Returns: string[] }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
