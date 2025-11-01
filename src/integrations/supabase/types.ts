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
      booking_charges: {
        Row: {
          amount: number
          booking_id: string
          charge_type: string
          charged_at: string | null
          charged_by: string | null
          created_at: string | null
          department: string | null
          description: string
          guest_id: string
          id: string
          location_id: string | null
          metadata: Json | null
          provider_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          booking_id: string
          charge_type: string
          charged_at?: string | null
          charged_by?: string | null
          created_at?: string | null
          department?: string | null
          description: string
          guest_id: string
          id?: string
          location_id?: string | null
          metadata?: Json | null
          provider_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          booking_id?: string
          charge_type?: string
          charged_at?: string | null
          charged_by?: string | null
          created_at?: string | null
          department?: string | null
          description?: string
          guest_id?: string
          id?: string
          location_id?: string | null
          metadata?: Json | null
          provider_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_charges_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_charges_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_charges_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "finance_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_charges_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "finance_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_charges_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "v_finance_overview_summary"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "booking_charges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          action_id: string | null
          booking_reference: string | null
          check_in: string
          check_out: string
          created_at: string | null
          guest_id: string
          id: string
          metadata: Json | null
          notes: string | null
          organization_id: string | null
          room_id: string
          source: string | null
          status: string | null
          tenant_id: string
          total_amount: number | null
        }
        Insert: {
          action_id?: string | null
          booking_reference?: string | null
          check_in: string
          check_out: string
          created_at?: string | null
          guest_id: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          organization_id?: string | null
          room_id: string
          source?: string | null
          status?: string | null
          tenant_id: string
          total_amount?: number | null
        }
        Update: {
          action_id?: string | null
          booking_reference?: string | null
          check_in?: string
          check_out?: string
          created_at?: string | null
          guest_id?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          organization_id?: string | null
          room_id?: string
          source?: string | null
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
            foreignKeyName: "bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      finance_analytics_snapshots: {
        Row: {
          created_at: string | null
          date: string
          department: string | null
          discrepancy: number | null
          generated_by: string | null
          id: string
          matched_txn_count: number | null
          overpayment_count: number | null
          tenant_id: string
          total_expense: number | null
          total_income: number | null
          unmatched_txn_count: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          department?: string | null
          discrepancy?: number | null
          generated_by?: string | null
          id?: string
          matched_txn_count?: number | null
          overpayment_count?: number | null
          tenant_id: string
          total_expense?: number | null
          total_income?: number | null
          unmatched_txn_count?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          department?: string | null
          discrepancy?: number | null
          generated_by?: string | null
          id?: string
          matched_txn_count?: number | null
          overpayment_count?: number | null
          tenant_id?: string
          total_expense?: number | null
          total_income?: number | null
          unmatched_txn_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_analytics_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_audit_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json | null
          target_id: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          target_id?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          target_id?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_locations: {
        Row: {
          created_at: string | null
          created_by: string | null
          department: string | null
          id: string
          name: string
          provider_id: string | null
          status: string | null
          tenant_id: string
          wallet_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          id?: string
          name: string
          provider_id?: string | null
          status?: string | null
          tenant_id: string
          wallet_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          id?: string
          name?: string
          provider_id?: string | null
          status?: string | null
          tenant_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_locations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "finance_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_locations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "v_finance_overview_summary"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "finance_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_locations_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_provider_rules: {
        Row: {
          auto_reconcile: boolean | null
          created_at: string | null
          created_by: string | null
          department: string | null
          id: string
          location_id: string | null
          max_txn_limit: number | null
          provider_id: string
          tenant_id: string
        }
        Insert: {
          auto_reconcile?: boolean | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          id?: string
          location_id?: string | null
          max_txn_limit?: number | null
          provider_id: string
          tenant_id: string
        }
        Update: {
          auto_reconcile?: boolean | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          id?: string
          location_id?: string | null
          max_txn_limit?: number | null
          provider_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_provider_rules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "finance_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_provider_rules_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "finance_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_provider_rules_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "v_finance_overview_summary"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "finance_provider_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_providers: {
        Row: {
          api_key: string | null
          api_secret: string | null
          created_at: string | null
          created_by: string | null
          fee_bearer: string | null
          fee_percent: number | null
          id: string
          meta: Json | null
          name: string
          status: string | null
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          created_at?: string | null
          created_by?: string | null
          fee_bearer?: string | null
          fee_percent?: number | null
          id?: string
          meta?: Json | null
          name: string
          status?: string | null
          tenant_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          created_at?: string | null
          created_by?: string | null
          fee_bearer?: string | null
          fee_percent?: number | null
          id?: string
          meta?: Json | null
          name?: string
          status?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_providers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_reconciliation_audit: {
        Row: {
          action: string
          created_at: string | null
          id: string
          performed_by: string | null
          reconciliation_id: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          performed_by?: string | null
          reconciliation_id?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          performed_by?: string | null
          reconciliation_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_reconciliation_audit_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "finance_reconciliation_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_reconciliation_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_reconciliation_records: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          internal_txn_id: string | null
          matched_by: string | null
          provider_id: string | null
          raw_data: Json | null
          reconciled_at: string | null
          reference: string
          source: string
          status: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          internal_txn_id?: string | null
          matched_by?: string | null
          provider_id?: string | null
          raw_data?: Json | null
          reconciled_at?: string | null
          reference: string
          source: string
          status?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          internal_txn_id?: string | null
          matched_by?: string | null
          provider_id?: string | null
          raw_data?: Json | null
          reconciled_at?: string | null
          reference?: string
          source?: string
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_reconciliation_records_internal_txn_id_fkey"
            columns: ["internal_txn_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_reconciliation_records_internal_txn_id_fkey"
            columns: ["internal_txn_id"]
            isOneToOne: false
            referencedRelation: "v_today_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_reconciliation_records_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "finance_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_reconciliation_records_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "v_finance_overview_summary"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "finance_reconciliation_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_communications: {
        Row: {
          created_at: string | null
          direction: string
          guest_id: string
          id: string
          message: string | null
          sent_by: string | null
          status: string | null
          subject: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          direction: string
          guest_id: string
          id?: string
          message?: string | null
          sent_by?: string | null
          status?: string | null
          subject?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string | null
          direction?: string
          guest_id?: string
          id?: string
          message?: string | null
          sent_by?: string | null
          status?: string | null
          subject?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_communications_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_communications_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_communications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
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
          last_stay_date: string | null
          name: string
          notes: string | null
          phone: string | null
          status: string | null
          tags: Json | null
          tenant_id: string
          total_bookings: number | null
          total_spent: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          id_number?: string | null
          last_stay_date?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          tags?: Json | null
          tenant_id: string
          total_bookings?: number | null
          total_spent?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          id_number?: string | null
          last_stay_date?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          tags?: Json | null
          tenant_id?: string
          total_bookings?: number | null
          total_spent?: number | null
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
          favicon_url: string | null
          font_body: string | null
          font_heading: string | null
          headline: string | null
          hero_image: string | null
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
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          headline?: string | null
          hero_image?: string | null
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
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          headline?: string | null
          hero_image?: string | null
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
      hotel_config_snapshots: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          label: string | null
          notes: string | null
          snapshot_data: Json
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          snapshot_data: Json
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          snapshot_data?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_config_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
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
          rounding: string | null
          service_charge: number
          service_charge_inclusive: boolean
          symbol_position: string
          tenant_id: string
          thousand_separator: string
          updated_at: string
          vat_applied_on: string | null
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
          rounding?: string | null
          service_charge?: number
          service_charge_inclusive?: boolean
          symbol_position?: string
          tenant_id: string
          thousand_separator?: string
          updated_at?: string
          vat_applied_on?: string | null
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
          rounding?: string | null
          service_charge?: number
          service_charge_inclusive?: boolean
          symbol_position?: string
          tenant_id?: string
          thousand_separator?: string
          updated_at?: string
          vat_applied_on?: string | null
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
      hotel_meta: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          hotel_name: string | null
          id: string
          social_links: Json | null
          tagline: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          hotel_name?: string | null
          id?: string
          social_links?: Json | null
          tagline?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          hotel_name?: string | null
          id?: string
          social_links?: Json | null
          tagline?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_meta_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_payment_preferences: {
        Row: {
          allow_checkout_with_debt: boolean | null
          auto_apply_wallet_on_booking: boolean | null
          created_at: string | null
          id: string
          large_overpayment_threshold: number | null
          manager_approval_threshold: number | null
          overpayment_default_action: string | null
          receivable_aging_days: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allow_checkout_with_debt?: boolean | null
          auto_apply_wallet_on_booking?: boolean | null
          created_at?: string | null
          id?: string
          large_overpayment_threshold?: number | null
          manager_approval_threshold?: number | null
          overpayment_default_action?: string | null
          receivable_aging_days?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          allow_checkout_with_debt?: boolean | null
          auto_apply_wallet_on_booking?: boolean | null
          created_at?: string | null
          id?: string
          large_overpayment_threshold?: number | null
          manager_approval_threshold?: number | null
          overpayment_default_action?: string | null
          receivable_aging_days?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_payment_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_permissions: {
        Row: {
          allowed: boolean | null
          created_at: string | null
          id: string
          metadata: Json | null
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allowed?: boolean | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          allowed?: boolean | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          added_by: string | null
          created_at: string
          guest_id: string
          id: string
          organization_id: string
          role: string | null
          tenant_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          guest_id: string
          id?: string
          organization_id: string
          role?: string | null
          tenant_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          guest_id?: string
          id?: string
          organization_id?: string
          role?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_service_rules: {
        Row: {
          allowed_services: Json
          created_at: string | null
          created_by: string | null
          id: string
          organization_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allowed_services?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          organization_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          allowed_services?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          organization_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_service_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_service_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_wallet_rules: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          entity_ref: string | null
          id: string
          limit_amount: number
          organization_id: string
          period: string
          rule_type: string
          tenant_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          entity_ref?: string | null
          id?: string
          limit_amount: number
          organization_id: string
          period: string
          rule_type: string
          tenant_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          entity_ref?: string | null
          id?: string
          limit_amount?: number
          organization_id?: string
          period?: string
          rule_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_wallet_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_wallet_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          active: boolean | null
          allow_negative_balance: boolean | null
          contact_email: string | null
          contact_person: string | null
          created_at: string | null
          credit_limit: number | null
          id: string
          name: string
          tenant_id: string
          wallet_id: string | null
        }
        Insert: {
          active?: boolean | null
          allow_negative_balance?: boolean | null
          contact_email?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          id?: string
          name: string
          tenant_id: string
          wallet_id?: string | null
        }
        Update: {
          active?: boolean | null
          allow_negative_balance?: boolean | null
          contact_email?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          id?: string
          name?: string
          tenant_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          charged_to_organization: boolean | null
          created_at: string | null
          currency: string | null
          department: string | null
          expected_amount: number | null
          guest_id: string | null
          id: string
          location: string | null
          metadata: Json | null
          method: string | null
          method_provider: string | null
          organization_id: string | null
          payment_type: string | null
          provider_reference: string | null
          recorded_by: string | null
          status: string | null
          tenant_id: string
          transaction_ref: string | null
          wallet_id: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          charged_to_organization?: boolean | null
          created_at?: string | null
          currency?: string | null
          department?: string | null
          expected_amount?: number | null
          guest_id?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          method?: string | null
          method_provider?: string | null
          organization_id?: string | null
          payment_type?: string | null
          provider_reference?: string | null
          recorded_by?: string | null
          status?: string | null
          tenant_id: string
          transaction_ref?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          charged_to_organization?: boolean | null
          created_at?: string | null
          currency?: string | null
          department?: string | null
          expected_amount?: number | null
          guest_id?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          method?: string | null
          method_provider?: string | null
          organization_id?: string | null
          payment_type?: string | null
          provider_reference?: string | null
          recorded_by?: string | null
          status?: string | null
          tenant_id?: string
          transaction_ref?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
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
      receipt_print_logs: {
        Row: {
          booking_id: string | null
          id: string
          payment_id: string | null
          print_method: string | null
          printed_at: string | null
          printed_by: string | null
          receipt_data: Json | null
          receipt_settings_id: string | null
          receipt_type: string
          tenant_id: string
        }
        Insert: {
          booking_id?: string | null
          id?: string
          payment_id?: string | null
          print_method?: string | null
          printed_at?: string | null
          printed_by?: string | null
          receipt_data?: Json | null
          receipt_settings_id?: string | null
          receipt_type: string
          tenant_id: string
        }
        Update: {
          booking_id?: string | null
          id?: string
          payment_id?: string | null
          print_method?: string | null
          printed_at?: string | null
          printed_by?: string | null
          receipt_data?: Json | null
          receipt_settings_id?: string | null
          receipt_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_print_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_print_logs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_print_logs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "v_today_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_print_logs_receipt_settings_id_fkey"
            columns: ["receipt_settings_id"]
            isOneToOne: false
            referencedRelation: "receipt_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_print_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_sequences: {
        Row: {
          created_at: string | null
          id: string
          next_number: number
          receipt_type: string
          tenant_id: string
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          next_number?: number
          receipt_type: string
          tenant_id: string
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          next_number?: number
          receipt_type?: string
          tenant_id?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "receipt_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_settings: {
        Row: {
          alignment: string | null
          auto_print_on_checkout: boolean | null
          auto_print_on_payment: boolean | null
          created_at: string | null
          created_by: string | null
          font_size: string | null
          footer_text: string | null
          header_text: string | null
          id: string
          include_service_charge: boolean | null
          location_id: string | null
          logo_url: string | null
          paper_size: string
          printer_endpoint: string | null
          printer_name: string | null
          receipt_number_length: number | null
          receipt_number_prefix: string | null
          reset_sequence_yearly: boolean | null
          show_provider_fee: boolean | null
          show_qr_code: boolean | null
          show_vat_breakdown: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          alignment?: string | null
          auto_print_on_checkout?: boolean | null
          auto_print_on_payment?: boolean | null
          created_at?: string | null
          created_by?: string | null
          font_size?: string | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          include_service_charge?: boolean | null
          location_id?: string | null
          logo_url?: string | null
          paper_size?: string
          printer_endpoint?: string | null
          printer_name?: string | null
          receipt_number_length?: number | null
          receipt_number_prefix?: string | null
          reset_sequence_yearly?: boolean | null
          show_provider_fee?: boolean | null
          show_qr_code?: boolean | null
          show_vat_breakdown?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          alignment?: string | null
          auto_print_on_checkout?: boolean | null
          auto_print_on_payment?: boolean | null
          created_at?: string | null
          created_by?: string | null
          font_size?: string | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          include_service_charge?: boolean | null
          location_id?: string | null
          logo_url?: string | null
          paper_size?: string
          printer_endpoint?: string | null
          printer_name?: string | null
          receipt_number_length?: number | null
          receipt_number_prefix?: string | null
          reset_sequence_yearly?: boolean | null
          show_provider_fee?: boolean | null
          show_qr_code?: boolean | null
          show_vat_breakdown?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "finance_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          amount: number
          approved_by: string | null
          booking_id: string | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          guest_id: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          paid_at: string | null
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          booking_id?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          guest_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          paid_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          booking_id?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          guest_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          paid_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receivables_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      room_categories: {
        Row: {
          amenities: Json | null
          base_rate: number | null
          created_at: string | null
          description: string | null
          id: string
          max_occupancy: number | null
          name: string
          short_code: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amenities?: Json | null
          base_rate?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_occupancy?: number | null
          name: string
          short_code: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amenities?: Json | null
          base_rate?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_occupancy?: number | null
          name?: string
          short_code?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      room_status_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          new_status: string
          old_status: string | null
          reason: string | null
          room_id: string
          tenant_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status: string
          old_status?: string | null
          reason?: string | null
          room_id: string
          tenant_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status?: string
          old_status?: string | null
          reason?: string | null
          room_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_status_history_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number | null
          category_id: string | null
          created_at: string | null
          current_guest_id: string | null
          current_reservation_id: string | null
          floor: number | null
          housekeeping_status: string | null
          id: string
          notes: string | null
          number: string
          rate: number | null
          status: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          capacity?: number | null
          category_id?: string | null
          created_at?: string | null
          current_guest_id?: string | null
          current_reservation_id?: string | null
          floor?: number | null
          housekeeping_status?: string | null
          id?: string
          notes?: string | null
          number: string
          rate?: number | null
          status?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          capacity?: number | null
          category_id?: string | null
          created_at?: string | null
          current_guest_id?: string | null
          current_reservation_id?: string | null
          floor?: number | null
          housekeeping_status?: string | null
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
            foreignKeyName: "rooms_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "room_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_current_guest_id_fkey"
            columns: ["current_guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_current_reservation_id_fkey"
            columns: ["current_reservation_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
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
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string | null
          created_by: string | null
          department: string | null
          description: string | null
          id: string
          metadata: Json | null
          payment_id: string | null
          source: string | null
          tenant_id: string
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_id?: string | null
          source?: string | null
          tenant_id: string
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_id?: string | null
          source?: string | null
          tenant_id?: string
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "v_today_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string | null
          currency: string
          department: string | null
          id: string
          last_transaction_at: string | null
          name: string | null
          owner_id: string | null
          tenant_id: string
          updated_at: string | null
          wallet_type: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          currency?: string
          department?: string | null
          id?: string
          last_transaction_at?: string | null
          name?: string | null
          owner_id?: string | null
          tenant_id: string
          updated_at?: string | null
          wallet_type: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          currency?: string
          department?: string | null
          id?: string
          last_transaction_at?: string | null
          name?: string | null
          owner_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          wallet_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_debtors_creditors: {
        Row: {
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          last_activity: string | null
          tenant_id: string | null
          total_amount: number | null
          transaction_count: number | null
          type: string | null
        }
        Relationships: []
      }
      v_finance_overview_summary: {
        Row: {
          department: string | null
          last_transaction_at: string | null
          net_balance: number | null
          provider_id: string | null
          provider_name: string | null
          source: string | null
          tenant_id: string | null
          total_inflow: number | null
          total_outflow: number | null
          transaction_count: number | null
          transaction_day: string | null
          type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_today_payments: {
        Row: {
          amount: number | null
          booking_id: string | null
          created_at: string | null
          department: string | null
          guest_id: string | null
          guest_name: string | null
          id: string | null
          method: string | null
          method_provider: string | null
          org_name: string | null
          organization_id: string | null
          payment_type: string | null
          room_number: string | null
          staff_name: string | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      generate_receipt_number: {
        Args: { p_receipt_type: string; p_tenant_id: string }
        Returns: string
      }
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
      validate_org_limits: {
        Args: {
          _amount: number
          _department: string
          _guest_id: string
          _org_id: string
        }
        Returns: Json
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
