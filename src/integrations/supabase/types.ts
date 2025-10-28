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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          check_in: string
          check_out: string
          created_at: string | null
          guest_id: string
          id: string
          room_id: string
          status: string | null
          tenant_id: string
          total_amount: number | null
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string | null
          guest_id: string
          id?: string
          room_id: string
          status?: string | null
          tenant_id: string
          total_amount?: number | null
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string | null
          guest_id?: string
          id?: string
          room_id?: string
          status?: string | null
          tenant_id?: string
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          created_at: string
          format: string
          id: string
          include_qr: boolean
          include_signature: boolean
          next_number: number
          number_length: number
          prefix: string
          template_data: Json
          template_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          format?: string
          id?: string
          include_qr?: boolean
          include_signature?: boolean
          next_number?: number
          number_length?: number
          prefix?: string
          template_data?: Json
          template_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          include_qr?: boolean
          include_signature?: boolean
          next_number?: number
          number_length?: number
          prefix?: string
          template_data?: Json
          template_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_settings: {
        Row: {
          created_at: string
          email_branding_enabled: boolean
          from_email: string
          from_name: string
          id: string
          reply_to: string | null
          smtp_enabled: boolean
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_user: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_branding_enabled?: boolean
          from_email?: string
          from_name?: string
          id?: string
          reply_to?: string | null
          smtp_enabled?: boolean
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_branding_enabled?: boolean
          from_email?: string
          from_name?: string
          id?: string
          reply_to?: string | null
          smtp_enabled?: boolean
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          id_number: string | null
          name: string
          phone: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          id_number?: string | null
          name: string
          phone?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          id_number?: string | null
          name?: string
          phone?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_audit_logs: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          id: string
          ip_address: string | null
          record_id: string | null
          table_name: string
          tenant_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name: string
          tenant_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name?: string
          tenant_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_branding: {
        Row: {
          accent_color: string | null
          created_at: string
          font_body: string | null
          font_heading: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          receipt_footer: string | null
          receipt_header: string | null
          secondary_color: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          font_body?: string | null
          font_heading?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          receipt_footer?: string | null
          receipt_header?: string | null
          secondary_color?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          font_body?: string | null
          font_heading?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          receipt_footer?: string | null
          receipt_header?: string | null
          secondary_color?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_branding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_configurations: {
        Row: {
          created_at: string
          id: string
          key: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "hotel_configurations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_domains: {
        Row: {
          certificate_status: string | null
          created_at: string | null
          dns_instructions: Json | null
          domain: string
          error_message: string | null
          id: string
          last_check: string | null
          status: string
          tenant_id: string
          vercel_domain_config: Json | null
          vercel_project_id: string | null
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          certificate_status?: string | null
          created_at?: string | null
          dns_instructions?: Json | null
          domain: string
          error_message?: string | null
          id?: string
          last_check?: string | null
          status?: string
          tenant_id: string
          vercel_domain_config?: Json | null
          vercel_project_id?: string | null
          verification_token?: string
          verified_at?: string | null
        }
        Update: {
          certificate_status?: string | null
          created_at?: string | null
          dns_instructions?: Json | null
          domain?: string
          error_message?: string | null
          id?: string
          last_check?: string | null
          status?: string
          tenant_id?: string
          vercel_domain_config?: Json | null
          vercel_project_id?: string | null
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_financials: {
        Row: {
          created_at: string
          currency: string
          currency_symbol: string
          decimal_places: number
          decimal_separator: string
          id: string
          service_charge: number
          service_charge_inclusive: boolean
          symbol_position: string
          tenant_id: string
          thousand_separator: string
          updated_at: string
          vat_inclusive: boolean
          vat_rate: number
        }
        Insert: {
          created_at?: string
          currency?: string
          currency_symbol?: string
          decimal_places?: number
          decimal_separator?: string
          id?: string
          service_charge?: number
          service_charge_inclusive?: boolean
          symbol_position?: string
          tenant_id: string
          thousand_separator?: string
          updated_at?: string
          vat_inclusive?: boolean
          vat_rate?: number
        }
        Update: {
          created_at?: string
          currency?: string
          currency_symbol?: string
          decimal_places?: number
          decimal_separator?: string
          id?: string
          service_charge?: number
          service_charge_inclusive?: boolean
          symbol_position?: string
          tenant_id?: string
          thousand_separator?: string
          updated_at?: string
          vat_inclusive?: boolean
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "hotel_financials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      requests: {
        Row: {
          created_at: string | null
          guest_id: string | null
          id: string
          note: string | null
          room_id: string | null
          status: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          guest_id?: string | null
          id?: string
          note?: string | null
          room_id?: string | null
          status?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string | null
          guest_id?: string | null
          id?: string
          note?: string | null
          room_id?: string | null
          status?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string | null
          floor: number | null
          id: string
          notes: string | null
          number: string
          rate: number | null
          status: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          floor?: number | null
          id?: string
          notes?: string | null
          number: string
          rate?: number | null
          status?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string | null
          floor?: number | null
          id?: string
          notes?: string | null
          number?: string
          rate?: number | null
          status?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          brand_color: string | null
          created_at: string | null
          domain: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          brand_color?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          brand_color?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_tenant_by_domain: { Args: { _domain: string }; Returns: string }
      get_user_tenant: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "owner"
        | "manager"
        | "frontdesk"
        | "housekeeping"
        | "maintenance"
        | "guest"
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
      app_role: [
        "owner",
        "manager",
        "frontdesk",
        "housekeeping",
        "maintenance",
        "guest",
      ],
    },
  },
} as const
