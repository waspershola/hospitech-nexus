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
      approval_logs: {
        Row: {
          action_reference: string | null
          action_type: string
          amount: number | null
          approver_id: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          pin_attempts: number | null
          pin_valid: boolean
          reason: string
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          action_reference?: string | null
          action_type: string
          amount?: number | null
          approver_id: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          pin_attempts?: number | null
          pin_valid: boolean
          reason: string
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          action_reference?: string | null
          action_type?: string
          amount?: number | null
          approver_id?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          pin_attempts?: number | null
          pin_valid?: boolean
          reason?: string
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_logs_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
          stay_folio_id: string | null
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
          stay_folio_id?: string | null
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
          stay_folio_id?: string | null
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
            foreignKeyName: "booking_charges_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_bookings"
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
            foreignKeyName: "booking_charges_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "v_guests"
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
            foreignKeyName: "booking_charges_stay_folio_id_fkey"
            columns: ["stay_folio_id"]
            isOneToOne: false
            referencedRelation: "stay_folios"
            referencedColumns: ["id"]
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
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "v_guests"
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
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_rooms"
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
      department_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          department: Database["public"]["Enums"]["department_type"]
          id: string
          issued_at: string | null
          issued_by: string | null
          items: Json
          priority: string | null
          purpose: string | null
          request_number: string
          requested_at: string | null
          requested_by: string
          status: Database["public"]["Enums"]["request_status"] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          department: Database["public"]["Enums"]["department_type"]
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          items: Json
          priority?: string | null
          purpose?: string | null
          request_number: string
          requested_at?: string | null
          requested_by: string
          status?: Database["public"]["Enums"]["request_status"] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          department?: Database["public"]["Enums"]["department_type"]
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          items?: Json
          priority?: string | null
          purpose?: string | null
          request_number?: string
          requested_at?: string | null
          requested_by?: string
          status?: Database["public"]["Enums"]["request_status"] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_requests_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      department_stock: {
        Row: {
          department: Database["public"]["Enums"]["department_type"]
          id: string
          item_id: string
          last_updated: string | null
          quantity: number
          tenant_id: string
        }
        Insert: {
          department: Database["public"]["Enums"]["department_type"]
          id?: string
          item_id: string
          last_updated?: string | null
          quantity?: number
          tenant_id: string
        }
        Update: {
          department?: Database["public"]["Enums"]["department_type"]
          id?: string
          item_id?: string
          last_updated?: string | null
          quantity?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_stock_tenant_id_fkey"
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
            referencedRelation: "v_payments"
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
      folio_routing_rules: {
        Row: {
          auto_create_folio: boolean
          charge_category: string
          created_at: string
          created_by: string | null
          department: string | null
          id: string
          is_active: boolean
          organization_id: string | null
          priority: number
          target_folio_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auto_create_folio?: boolean
          charge_category: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string | null
          priority?: number
          target_folio_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auto_create_folio?: boolean
          charge_category?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string | null
          priority?: number
          target_folio_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "folio_routing_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folio_routing_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      folio_transactions: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          department: string | null
          description: string
          folio_id: string
          id: string
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
          transaction_type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description: string
          folio_id: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
          transaction_type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string
          folio_id?: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "folio_transactions_folio_id_fkey"
            columns: ["folio_id"]
            isOneToOne: false
            referencedRelation: "stay_folios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folio_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      group_bookings: {
        Row: {
          created_at: string
          group_id: string
          group_leader: string | null
          group_name: string
          group_size: number
          id: string
          master_booking_id: string | null
          master_folio_id: string | null
          metadata: Json | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          group_leader?: string | null
          group_name: string
          group_size?: number
          id?: string
          master_booking_id?: string | null
          master_folio_id?: string | null
          metadata?: Json | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          group_leader?: string | null
          group_name?: string
          group_size?: number
          id?: string
          master_booking_id?: string | null
          master_folio_id?: string | null
          metadata?: Json | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_bookings_master_booking_id_fkey"
            columns: ["master_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_bookings_master_booking_id_fkey"
            columns: ["master_booking_id"]
            isOneToOne: false
            referencedRelation: "v_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_bookings_master_folio_id_fkey"
            columns: ["master_folio_id"]
            isOneToOne: false
            referencedRelation: "stay_folios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_bookings_tenant_id_fkey"
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
          guest_id: string | null
          id: string
          message: string | null
          metadata: Json | null
          sent_by: string | null
          status: string | null
          subject: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          direction: string
          guest_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          sent_by?: string | null
          status?: string | null
          subject?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string | null
          direction?: string
          guest_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
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
            foreignKeyName: "guest_communications_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "v_guests"
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
            foreignKeyName: "guest_communications_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "v_profiles"
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
      guest_feedback: {
        Row: {
          category: string | null
          comment: string | null
          created_at: string | null
          id: string
          qr_token: string
          rating: number | null
          request_id: string | null
          tenant_id: string
        }
        Insert: {
          category?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          qr_token: string
          rating?: number | null
          request_id?: string | null
          tenant_id: string
        }
        Update: {
          category?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          qr_token?: string
          rating?: number | null
          request_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_feedback_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_orders: {
        Row: {
          created_at: string | null
          guest_name: string | null
          id: string
          items: Json
          qr_token: string
          request_id: string | null
          room_id: string | null
          special_instructions: string | null
          status: string | null
          stay_folio_id: string | null
          subtotal: number
          tenant_id: string
          total: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          guest_name?: string | null
          id?: string
          items: Json
          qr_token: string
          request_id?: string | null
          room_id?: string | null
          special_instructions?: string | null
          status?: string | null
          stay_folio_id?: string | null
          subtotal: number
          tenant_id: string
          total: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          guest_name?: string | null
          id?: string
          items?: Json
          qr_token?: string
          request_id?: string | null
          room_id?: string | null
          special_instructions?: string | null
          status?: string | null
          stay_folio_id?: string | null
          subtotal?: number
          tenant_id?: string
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_orders_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_orders_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_orders_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_orders_stay_folio_id_fkey"
            columns: ["stay_folio_id"]
            isOneToOne: false
            referencedRelation: "stay_folios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_orders_tenant_id_fkey"
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
          qr_accent_color: string | null
          qr_primary_color: string | null
          qr_theme: string | null
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
          qr_accent_color?: string | null
          qr_primary_color?: string | null
          qr_theme?: string | null
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
          qr_accent_color?: string | null
          qr_primary_color?: string | null
          qr_theme?: string | null
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
      hotel_dashboard_defaults: {
        Row: {
          created_at: string | null
          dashboard_name: string
          default_location_id: string | null
          id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dashboard_name: string
          default_location_id?: string | null
          id?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dashboard_name?: string
          default_location_id?: string | null
          id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_dashboard_defaults_default_location_id_fkey"
            columns: ["default_location_id"]
            isOneToOne: false
            referencedRelation: "finance_locations"
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
          qr_calling_enabled: boolean | null
          qr_feedback_enabled: boolean | null
          qr_menu_enabled: boolean | null
          qr_wifi_enabled: boolean | null
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
          qr_calling_enabled?: boolean | null
          qr_feedback_enabled?: boolean | null
          qr_menu_enabled?: boolean | null
          qr_wifi_enabled?: boolean | null
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
          qr_calling_enabled?: boolean | null
          qr_feedback_enabled?: boolean | null
          qr_menu_enabled?: boolean | null
          qr_wifi_enabled?: boolean | null
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
      hotel_qr_services_catalog: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string
          display_order: number | null
          icon: string | null
          id: string
          service_key: string
          service_label: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          service_key: string
          service_label: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          service_key?: string
          service_label?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_qr_services_catalog_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_services: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["service_category"]
          created_at: string
          default_amount: number
          description: string | null
          display_order: number
          id: string
          metadata: Json | null
          name: string
          taxable: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: Database["public"]["Enums"]["service_category"]
          created_at?: string
          default_amount?: number
          description?: string | null
          display_order?: number
          id?: string
          metadata?: Json | null
          name: string
          taxable?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string
          default_amount?: number
          description?: string | null
          display_order?: number
          id?: string
          metadata?: Json | null
          name?: string
          taxable?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: Database["public"]["Enums"]["item_category"]
          cost_price: number | null
          created_at: string | null
          id: string
          is_perishable: boolean | null
          item_code: string
          item_name: string
          last_purchase_price: number | null
          metadata: Json | null
          reorder_level: number | null
          shelf_life_days: number | null
          supplier_id: string | null
          tenant_id: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["item_category"]
          cost_price?: number | null
          created_at?: string | null
          id?: string
          is_perishable?: boolean | null
          item_code: string
          item_name: string
          last_purchase_price?: number | null
          metadata?: Json | null
          reorder_level?: number | null
          shelf_life_days?: number | null
          supplier_id?: string | null
          tenant_id: string
          unit: string
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["item_category"]
          cost_price?: number | null
          created_at?: string | null
          id?: string
          is_perishable?: boolean | null
          item_code?: string
          item_name?: string
          last_purchase_price?: number | null
          metadata?: Json | null
          reorder_level?: number | null
          shelf_life_days?: number | null
          supplier_id?: string | null
          tenant_id?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      laundry_items: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_available: boolean | null
          item_name: string
          price: number
          service_type: string
          status: string | null
          tenant_id: string
          turnaround_time: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          item_name: string
          price: number
          service_type: string
          status?: string | null
          tenant_id: string
          turnaround_time?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          item_name?: string
          price?: number
          service_type?: string
          status?: string | null
          tenant_id?: string
          turnaround_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "laundry_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string | null
          currency: string | null
          description: string | null
          dietary_tags: string[] | null
          display_order: number | null
          id: string
          image_url: string | null
          is_available: boolean | null
          menu_type: string | null
          name: string
          preparation_time: string | null
          price: number
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          dietary_tags?: string[] | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          menu_type?: string | null
          name: string
          preparation_time?: string | null
          price: number
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          dietary_tags?: string[] | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          menu_type?: string | null
          name?: string
          preparation_time?: string | null
          price?: number
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      navigation_items: {
        Row: {
          allowed_departments: string[] | null
          allowed_roles: Database["public"]["Enums"]["app_role"][]
          created_at: string | null
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          order_index: number
          parent_id: string | null
          path: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allowed_departments?: string[] | null
          allowed_roles: Database["public"]["Enums"]["app_role"][]
          created_at?: string | null
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          order_index?: number
          parent_id?: string | null
          path: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          allowed_departments?: string[] | null
          allowed_roles?: Database["public"]["Enums"]["app_role"][]
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          order_index?: number
          parent_id?: string | null
          path?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "navigation_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "navigation_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navigation_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      night_audit_reports: {
        Row: {
          audit_run_id: string
          created_at: string | null
          folio_count: number | null
          folio_type: string | null
          id: string
          pdf_url: string | null
          report_data: Json
          report_type: string
          tenant_id: string
        }
        Insert: {
          audit_run_id: string
          created_at?: string | null
          folio_count?: number | null
          folio_type?: string | null
          id?: string
          pdf_url?: string | null
          report_data: Json
          report_type: string
          tenant_id: string
        }
        Update: {
          audit_run_id?: string
          created_at?: string | null
          folio_count?: number | null
          folio_type?: string | null
          id?: string
          pdf_url?: string | null
          report_data?: Json
          report_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "night_audit_reports_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "night_audit_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "night_audit_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      night_audit_runs: {
        Row: {
          audit_date: string
          completed_at: string | null
          created_at: string | null
          cutoff_time: string
          error_message: string | null
          folios_by_type: Json | null
          id: string
          metadata: Json | null
          revenue_by_folio_type: Json | null
          run_by: string | null
          started_at: string | null
          status: string
          tenant_id: string
          total_folios_processed: number | null
          total_revenue: number | null
        }
        Insert: {
          audit_date: string
          completed_at?: string | null
          created_at?: string | null
          cutoff_time: string
          error_message?: string | null
          folios_by_type?: Json | null
          id?: string
          metadata?: Json | null
          revenue_by_folio_type?: Json | null
          run_by?: string | null
          started_at?: string | null
          status?: string
          tenant_id: string
          total_folios_processed?: number | null
          total_revenue?: number | null
        }
        Update: {
          audit_date?: string
          completed_at?: string | null
          created_at?: string | null
          cutoff_time?: string
          error_message?: string | null
          folios_by_type?: Json | null
          id?: string
          metadata?: Json | null
          revenue_by_folio_type?: Json | null
          run_by?: string | null
          started_at?: string | null
          status?: string
          tenant_id?: string
          total_folios_processed?: number | null
          total_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "night_audit_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_sounds: {
        Row: {
          category: string | null
          created_at: string | null
          file_path: string
          id: string
          is_default: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          file_path: string
          id?: string
          is_default?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          file_path?: string
          id?: string
          is_default?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
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
            foreignKeyName: "organization_members_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "v_guests"
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
      password_delivery_log: {
        Row: {
          delivered_at: string | null
          delivered_by: string | null
          delivery_method: string
          delivery_status: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          delivered_at?: string | null
          delivered_by?: string | null
          delivery_method: string
          delivery_status?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          delivered_at?: string | null
          delivered_by?: string | null
          delivery_method?: string
          delivery_status?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          active: boolean
          created_at: string | null
          created_by: string | null
          display_order: number
          id: string
          metadata: Json | null
          method_name: string
          method_type: string
          provider_id: string | null
          requires_approval: boolean
          requires_reference: boolean
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          created_by?: string | null
          display_order?: number
          id?: string
          metadata?: Json | null
          method_name: string
          method_type: string
          provider_id?: string | null
          requires_approval?: boolean
          requires_reference?: boolean
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          created_by?: string | null
          display_order?: number
          id?: string
          metadata?: Json | null
          method_name?: string
          method_type?: string
          provider_id?: string | null
          requires_approval?: boolean
          requires_reference?: boolean
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "finance_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "v_finance_overview_summary"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "payment_methods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          stay_folio_id: string | null
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
          stay_folio_id?: string | null
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
          stay_folio_id?: string | null
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
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_bookings"
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
            foreignKeyName: "payments_stay_folio_id_fkey"
            columns: ["stay_folio_id"]
            isOneToOne: false
            referencedRelation: "stay_folios"
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
      platform_addon_purchases: {
        Row: {
          addon_id: string
          amount_paid: number
          id: string
          purchased_at: string
          quantity: number
          status: string
          tenant_id: string
        }
        Insert: {
          addon_id: string
          amount_paid?: number
          id?: string
          purchased_at?: string
          quantity?: number
          status?: string
          tenant_id: string
        }
        Update: {
          addon_id?: string
          amount_paid?: number
          id?: string
          purchased_at?: string
          quantity?: number
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_addon_purchases_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "platform_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_addon_purchases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_addons: {
        Row: {
          addon_type: string
          created_at: string
          description: string | null
          id: string
          key: string
          metadata: Json | null
          pricing: Json
          title: string
          units_available: number | null
          updated_at: string
        }
        Insert: {
          addon_type?: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          metadata?: Json | null
          pricing?: Json
          title: string
          units_available?: number | null
          updated_at?: string
        }
        Update: {
          addon_type?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          metadata?: Json | null
          pricing?: Json
          title?: string
          units_available?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_audit_stream: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["app_role"] | null
          created_at: string
          id: string
          payload: Json | null
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          id?: string
          payload?: Json | null
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          id?: string
          payload?: Json | null
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: []
      }
      platform_backups: {
        Row: {
          backup_type: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          s3_reference: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          backup_type: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          s3_reference?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          backup_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          s3_reference?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_backups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_billing: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string
          cycle_end: string
          cycle_start: string
          id: string
          invoice_payload: Json | null
          payment_provider_id: string | null
          sms_used: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          cycle_end: string
          cycle_start: string
          id?: string
          invoice_payload?: Json | null
          payment_provider_id?: string | null
          sms_used?: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          cycle_end?: string
          cycle_start?: string
          id?: string
          invoice_payload?: Json | null
          payment_provider_id?: string | null
          sms_used?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_billing_payment_provider_id_fkey"
            columns: ["payment_provider_id"]
            isOneToOne: false
            referencedRelation: "platform_payment_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_billing_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_email_providers: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean | null
          id: string
          is_default: boolean | null
          name: string
          provider_type: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          config: Json
          created_at?: string
          enabled?: boolean | null
          id?: string
          is_default?: boolean | null
          name: string
          provider_type: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean | null
          id?: string
          is_default?: boolean | null
          name?: string
          provider_type?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_email_templates: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string | null
          event_key: string
          id: string
          is_active: boolean | null
          language: string | null
          subject: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string | null
          event_key: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          subject: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string | null
          event_key?: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          subject?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_email_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled_globally: boolean | null
          flag_key: string
          flag_name: string
          id: string
          metadata: Json | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled_globally?: boolean | null
          flag_key: string
          flag_name: string
          id?: string
          metadata?: Json | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled_globally?: boolean | null
          flag_key?: string
          flag_name?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_fee_alert_rules: {
        Row: {
          active: boolean
          comparison_period: string | null
          created_at: string
          description: string | null
          id: string
          last_checked_at: string | null
          metric: string
          name: string
          period: string
          tenant_id: string | null
          threshold_type: string
          threshold_value: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          comparison_period?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_checked_at?: string | null
          metric: string
          name: string
          period: string
          tenant_id?: string | null
          threshold_type: string
          threshold_value: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          comparison_period?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_checked_at?: string | null
          metric?: string
          name?: string
          period?: string
          tenant_id?: string | null
          threshold_type?: string
          threshold_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_fee_alert_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_fee_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          current_value: number
          expected_value: number | null
          id: string
          message: string
          metadata: Json | null
          period_end: string
          period_start: string
          rule_id: string | null
          severity: string
          tenant_id: string | null
          threshold_value: number | null
          title: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          current_value: number
          expected_value?: number | null
          id?: string
          message: string
          metadata?: Json | null
          period_end: string
          period_start: string
          rule_id?: string | null
          severity: string
          tenant_id?: string | null
          threshold_value?: number | null
          title: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          current_value?: number
          expected_value?: number | null
          id?: string
          message?: string
          metadata?: Json | null
          period_end?: string
          period_start?: string
          rule_id?: string | null
          severity?: string
          tenant_id?: string | null
          threshold_value?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_fee_alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "platform_fee_alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_fee_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_fee_configurations: {
        Row: {
          active: boolean | null
          applies_to: string[] | null
          billing_cycle: string | null
          booking_fee: number | null
          created_at: string | null
          created_by: string | null
          fee_type: string | null
          id: string
          mode: string | null
          payer: string | null
          qr_fee: number | null
          tenant_id: string
          trial_days: number | null
          trial_exemption_enabled: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean | null
          applies_to?: string[] | null
          billing_cycle?: string | null
          booking_fee?: number | null
          created_at?: string | null
          created_by?: string | null
          fee_type?: string | null
          id?: string
          mode?: string | null
          payer?: string | null
          qr_fee?: number | null
          tenant_id: string
          trial_days?: number | null
          trial_exemption_enabled?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean | null
          applies_to?: string[] | null
          billing_cycle?: string | null
          booking_fee?: number | null
          created_at?: string | null
          created_by?: string | null
          fee_type?: string | null
          id?: string
          mode?: string | null
          payer?: string | null
          qr_fee?: number | null
          tenant_id?: string
          trial_days?: number | null
          trial_exemption_enabled?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_fee_configurations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_fee_disputes: {
        Row: {
          admin_notes: string | null
          created_at: string
          dispute_reason: string
          id: string
          ledger_ids: string[]
          requested_action: string
          requested_amount: number | null
          resolution_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          supporting_docs: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          dispute_reason: string
          id?: string
          ledger_ids: string[]
          requested_action: string
          requested_amount?: number | null
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          supporting_docs?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          dispute_reason?: string
          id?: string
          ledger_ids?: string[]
          requested_action?: string
          requested_amount?: number | null
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          supporting_docs?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_fee_disputes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_fee_ledger: {
        Row: {
          base_amount: number
          billed_at: string | null
          billing_cycle: string | null
          created_at: string | null
          failed_at: string | null
          fee_amount: number
          fee_type: string | null
          id: string
          invoice_id: string | null
          metadata: Json | null
          paid_at: string | null
          payer: string | null
          payment_id: string | null
          rate: number | null
          reference_id: string
          reference_type: string
          settled_at: string | null
          status: string | null
          tenant_id: string
          waived_at: string | null
          waived_by: string | null
          waived_reason: string | null
        }
        Insert: {
          base_amount: number
          billed_at?: string | null
          billing_cycle?: string | null
          created_at?: string | null
          failed_at?: string | null
          fee_amount: number
          fee_type?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          paid_at?: string | null
          payer?: string | null
          payment_id?: string | null
          rate?: number | null
          reference_id: string
          reference_type: string
          settled_at?: string | null
          status?: string | null
          tenant_id: string
          waived_at?: string | null
          waived_by?: string | null
          waived_reason?: string | null
        }
        Update: {
          base_amount?: number
          billed_at?: string | null
          billing_cycle?: string | null
          created_at?: string | null
          failed_at?: string | null
          fee_amount?: number
          fee_type?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          paid_at?: string | null
          payer?: string | null
          payment_id?: string | null
          rate?: number | null
          reference_id?: string
          reference_type?: string
          settled_at?: string | null
          status?: string | null
          tenant_id?: string
          waived_at?: string | null
          waived_by?: string | null
          waived_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_fee_ledger_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "platform_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "platform_fee_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_fee_payments: {
        Row: {
          created_at: string | null
          failed_at: string | null
          id: string
          ledger_ids: string[]
          metadata: Json | null
          payment_method_id: string | null
          payment_reference: string
          provider: string | null
          provider_response: Json | null
          settled_at: string | null
          status: string | null
          tenant_id: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          failed_at?: string | null
          id?: string
          ledger_ids: string[]
          metadata?: Json | null
          payment_method_id?: string | null
          payment_reference: string
          provider?: string | null
          provider_response?: Json | null
          settled_at?: string | null
          status?: string | null
          tenant_id: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          failed_at?: string | null
          id?: string
          ledger_ids?: string[]
          metadata?: Json | null
          payment_method_id?: string | null
          payment_reference?: string
          provider?: string | null
          provider_response?: Json | null
          settled_at?: string | null
          status?: string | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_fee_payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "platform_payment_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_fee_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_impersonation_sessions: {
        Row: {
          actions_performed: Json | null
          admin_id: string
          ended_at: string | null
          id: string
          impersonated_at: string | null
          ip_address: string | null
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          actions_performed?: Json | null
          admin_id: string
          ended_at?: string | null
          id?: string
          impersonated_at?: string | null
          ip_address?: string | null
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          actions_performed?: Json | null
          admin_id?: string
          ended_at?: string | null
          id?: string
          impersonated_at?: string | null
          ip_address?: string | null
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      platform_invoices: {
        Row: {
          created_at: string
          due_date: string
          id: string
          invoice_number: string
          line_items: Json
          metadata: Json | null
          paid_at: string | null
          period_end: string
          period_start: string
          status: string
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          invoice_number: string
          line_items?: Json
          metadata?: Json | null
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string
          tenant_id: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          invoice_number?: string
          line_items?: Json
          metadata?: Json | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_nav_items: {
        Row: {
          created_at: string
          departments_allowed: string[] | null
          icon: string
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          order_index: number
          parent_id: string | null
          path: string
          roles_allowed: string[]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          departments_allowed?: string[] | null
          icon: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          order_index?: number
          parent_id?: string | null
          path: string
          roles_allowed?: string[]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          departments_allowed?: string[] | null
          icon?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          order_index?: number
          parent_id?: string | null
          path?: string
          roles_allowed?: string[]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_nav_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "platform_nav_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_nav_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_navigation_items: {
        Row: {
          allowed_roles: string[] | null
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          label: string
          order_index: number | null
          parent_id: string | null
          path: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          allowed_roles?: string[] | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          order_index?: number | null
          parent_id?: string | null
          path: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          allowed_roles?: string[] | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          order_index?: number | null
          parent_id?: string | null
          path?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_navigation_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "platform_navigation_items"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_payment_providers: {
        Row: {
          api_key_encrypted: string | null
          api_secret_encrypted: string | null
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          provider_name: string
          provider_type: string
          updated_at: string | null
          webhook_secret: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          provider_name: string
          provider_type: string
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          provider_name?: string
          provider_type?: string
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Relationships: []
      }
      platform_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json
          id: string
          is_active: boolean | null
          is_public: boolean | null
          limits: Json
          metadata: Json | null
          name: string
          price_monthly: number
          price_quarterly: number | null
          price_yearly: number
          slug: string
          trial_days: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          limits?: Json
          metadata?: Json | null
          name: string
          price_monthly?: number
          price_quarterly?: number | null
          price_yearly?: number
          slug: string
          trial_days?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          limits?: Json
          metadata?: Json | null
          name?: string
          price_monthly?: number
          price_quarterly?: number | null
          price_yearly?: number
          slug?: string
          trial_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_sms_credit_pool: {
        Row: {
          allocated_credits: number
          billing_reference: string | null
          consumed_credits: number
          created_at: string
          id: string
          last_topup_at: string | null
          tenant_id: string
          total_credits: number
          updated_at: string
        }
        Insert: {
          allocated_credits?: number
          billing_reference?: string | null
          consumed_credits?: number
          created_at?: string
          id?: string
          last_topup_at?: string | null
          tenant_id: string
          total_credits?: number
          updated_at?: string
        }
        Update: {
          allocated_credits?: number
          billing_reference?: string | null
          consumed_credits?: number
          created_at?: string
          id?: string
          last_topup_at?: string | null
          tenant_id?: string
          total_credits?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_sms_credit_pool_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_sms_providers: {
        Row: {
          api_key_encrypted: string | null
          api_secret_encrypted: string | null
          created_at: string
          default_sender_id: string | null
          id: string
          is_active: boolean
          provider_settings: Json | null
          provider_type: string
          updated_at: string
        }
        Insert: {
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          created_at?: string
          default_sender_id?: string | null
          id?: string
          is_active?: boolean
          provider_settings?: Json | null
          provider_type: string
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          created_at?: string
          default_sender_id?: string | null
          id?: string
          is_active?: boolean
          provider_settings?: Json | null
          provider_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_sms_templates: {
        Row: {
          created_at: string
          event_key: string
          id: string
          is_active: boolean
          language: string
          template_body: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_key: string
          id?: string
          is_active?: boolean
          language?: string
          template_body: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_key?: string
          id?: string
          is_active?: boolean
          language?: string
          template_body?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_sms_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          priority: string
          status: string
          subject: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          subject: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          subject?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "platform_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_tenants: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          domain: string | null
          id: string
          owner_email: string
          plan_id: string | null
          settings: Json | null
          status: string
          suspension_reason: string | null
          trial_end_date: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          domain?: string | null
          id: string
          owner_email: string
          plan_id?: string | null
          settings?: Json | null
          status?: string
          suspension_reason?: string | null
          trial_end_date?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          domain?: string | null
          id?: string
          owner_email?: string
          plan_id?: string | null
          settings?: Json | null
          status?: string
          suspension_reason?: string | null
          trial_end_date?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_tenants_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_usage: {
        Row: {
          api_calls: number
          bookings_monthly: number
          created_at: string
          id: string
          last_sync: string
          rooms_total: number
          sms_sent: number
          tenant_id: string
          usage_snapshot: Json | null
        }
        Insert: {
          api_calls?: number
          bookings_monthly?: number
          created_at?: string
          id?: string
          last_sync?: string
          rooms_total?: number
          sms_sent?: number
          tenant_id: string
          usage_snapshot?: Json | null
        }
        Update: {
          api_calls?: number
          bookings_monthly?: number
          created_at?: string
          id?: string
          last_sync?: string
          rooms_total?: number
          sms_sent?: number
          tenant_id?: string
          usage_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_usage_aggregates: {
        Row: {
          created_at: string
          id: string
          metric_type: string
          period_end: string
          period_start: string
          record_count: number
          tenant_id: string
          total_quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_type: string
          period_end: string
          period_start: string
          record_count?: number
          tenant_id: string
          total_quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_type?: string
          period_end?: string
          period_start?: string
          record_count?: number
          tenant_id?: string
          total_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_usage_records: {
        Row: {
          cost: number
          created_at: string
          id: string
          metadata: Json | null
          period_end: string
          period_start: string
          quantity: number
          tenant_id: string
          updated_at: string
          usage_type: string
        }
        Insert: {
          cost?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          period_end: string
          period_start: string
          quantity?: number
          tenant_id: string
          updated_at?: string
          usage_type: string
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          period_end?: string
          period_start?: string
          quantity?: number
          tenant_id?: string
          updated_at?: string
          usage_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_usage_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          last_active: string | null
          metadata: Json | null
          password_delivery_method: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          system_locked: boolean | null
          temp_password_expires_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          last_active?: string | null
          metadata?: Json | null
          password_delivery_method?: string | null
          phone?: string | null
          role: Database["public"]["Enums"]["app_role"]
          system_locked?: boolean | null
          temp_password_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_active?: string | null
          metadata?: Json | null
          password_delivery_method?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          system_locked?: boolean | null
          temp_password_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      post_checkout_ledger: {
        Row: {
          amount: number
          booking_id: string
          created_at: string | null
          guest_id: string | null
          id: string
          notes: string | null
          payment_id: string
          reason: string
          recorded_by: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          payment_id: string
          reason: string
          recorded_by?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          payment_id?: string
          reason?: string
          recorded_by?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_checkout_ledger_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_checkout_ledger_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_checkout_ledger_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_checkout_ledger_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "v_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_checkout_ledger_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_checkout_ledger_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "v_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_checkout_ledger_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "v_today_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_checkout_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
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
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          approved_by: string | null
          created_at: string | null
          created_by: string
          delivery_date: string | null
          id: string
          items: Json
          notes: string | null
          po_number: string
          received_by: string | null
          status: string | null
          subtotal: number | null
          supplier_id: string
          tax_amount: number | null
          tenant_id: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          created_by: string
          delivery_date?: string | null
          id?: string
          items: Json
          notes?: string | null
          po_number: string
          received_by?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_id: string
          tax_amount?: number | null
          tenant_id: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string
          delivery_date?: string | null
          id?: string
          items?: Json
          notes?: string | null
          po_number?: string
          received_by?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_codes: {
        Row: {
          assigned_to: string
          created_at: string | null
          display_name: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          room_id: string | null
          scope: string
          services: Json | null
          status: string | null
          tenant_id: string
          token: string
          updated_at: string | null
          welcome_message: string | null
        }
        Insert: {
          assigned_to: string
          created_at?: string | null
          display_name?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          room_id?: string | null
          scope: string
          services?: Json | null
          status?: string | null
          tenant_id: string
          token?: string
          updated_at?: string | null
          welcome_message?: string | null
        }
        Update: {
          assigned_to?: string
          created_at?: string | null
          display_name?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          room_id?: string | null
          scope?: string
          services?: Json | null
          status?: string | null
          tenant_id?: string
          token?: string
          updated_at?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_folio_matching_log: {
        Row: {
          created_at: string
          failure_reason: string | null
          guest_contact: string | null
          id: string
          match_method: string | null
          match_success: boolean
          matched_folio_id: string | null
          qr_token: string
          request_id: string | null
          room_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          failure_reason?: string | null
          guest_contact?: string | null
          id?: string
          match_method?: string | null
          match_success?: boolean
          matched_folio_id?: string | null
          qr_token: string
          request_id?: string | null
          room_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          failure_reason?: string | null
          guest_contact?: string | null
          id?: string
          match_method?: string | null
          match_success?: boolean
          matched_folio_id?: string | null
          qr_token?: string
          request_id?: string | null
          room_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_folio_matching_log_matched_folio_id_fkey"
            columns: ["matched_folio_id"]
            isOneToOne: false
            referencedRelation: "stay_folios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_folio_matching_log_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_folio_matching_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_folio_matching_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_folio_matching_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_reply_templates: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          service_category: string
          template_text: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          service_category: string
          template_text: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          service_category?: string
          template_text?: string
          tenant_id?: string
          updated_at?: string
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
            foreignKeyName: "receipt_print_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_bookings"
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
            referencedRelation: "v_payments"
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
            foreignKeyName: "receivables_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_bookings"
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
            foreignKeyName: "receivables_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "v_guests"
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
          assigned_department: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          guest_id: string | null
          id: string
          metadata: Json | null
          note: string | null
          priority: string | null
          qr_token: string | null
          room_id: string | null
          service_category: string | null
          status: string | null
          stay_folio_id: string | null
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          assigned_department?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          guest_id?: string | null
          id?: string
          metadata?: Json | null
          note?: string | null
          priority?: string | null
          qr_token?: string | null
          room_id?: string | null
          service_category?: string | null
          status?: string | null
          stay_folio_id?: string | null
          tenant_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          assigned_department?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          guest_id?: string | null
          id?: string
          metadata?: Json | null
          note?: string | null
          priority?: string | null
          qr_token?: string | null
          room_id?: string | null
          service_category?: string | null
          status?: string | null
          stay_folio_id?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_requests_qr_token"
            columns: ["qr_token"]
            isOneToOne: false
            referencedRelation: "qr_codes"
            referencedColumns: ["token"]
          },
          {
            foreignKeyName: "requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "v_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "v_guests"
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
            foreignKeyName: "requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_stay_folio_id_fkey"
            columns: ["stay_folio_id"]
            isOneToOne: false
            referencedRelation: "stay_folios"
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
      restaurant_reservations: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          guest_contact: string | null
          guest_email: string | null
          guest_name: string
          id: string
          metadata: Json | null
          number_of_guests: number
          qr_token: string | null
          reservation_date: string
          reservation_time: string
          seated_at: string | null
          special_requests: string | null
          status: string | null
          table_number: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          guest_contact?: string | null
          guest_email?: string | null
          guest_name: string
          id?: string
          metadata?: Json | null
          number_of_guests: number
          qr_token?: string | null
          reservation_date: string
          reservation_time: string
          seated_at?: string | null
          special_requests?: string | null
          status?: string | null
          table_number?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          guest_contact?: string | null
          guest_email?: string | null
          guest_name?: string
          id?: string
          metadata?: Json | null
          number_of_guests?: number
          qr_token?: string | null
          reservation_date?: string
          reservation_time?: string
          seated_at?: string | null
          special_requests?: string | null
          status?: string | null
          table_number?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          department: string | null
          id: string
          module: string
          role: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          department?: string | null
          id?: string
          module: string
          role: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          department?: string | null
          id?: string
          module?: string
          role?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_tenant_id_fkey"
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
            foreignKeyName: "room_status_history_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_rooms"
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
          assigned_to: string | null
          capacity: number | null
          category_id: string | null
          created_at: string | null
          current_guest_id: string | null
          current_reservation_id: string | null
          floor: number | null
          housekeeping_status: string | null
          id: string
          metadata: Json | null
          notes: string | null
          number: string
          rate: number | null
          status: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          assigned_to?: string | null
          capacity?: number | null
          category_id?: string | null
          created_at?: string | null
          current_guest_id?: string | null
          current_reservation_id?: string | null
          floor?: number | null
          housekeeping_status?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          number: string
          rate?: number | null
          status?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          assigned_to?: string | null
          capacity?: number | null
          category_id?: string | null
          created_at?: string | null
          current_guest_id?: string | null
          current_reservation_id?: string | null
          floor?: number | null
          housekeeping_status?: string | null
          id?: string
          metadata?: Json | null
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
            foreignKeyName: "rooms_current_guest_id_fkey"
            columns: ["current_guest_id"]
            isOneToOne: false
            referencedRelation: "v_guests"
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
            foreignKeyName: "rooms_current_reservation_id_fkey"
            columns: ["current_reservation_id"]
            isOneToOne: false
            referencedRelation: "v_bookings"
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
      sms_logs: {
        Row: {
          booking_id: string | null
          cost_credits: number | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          event_key: string | null
          guest_id: string | null
          id: string
          message_body: string
          provider: string | null
          provider_message_id: string | null
          sent_at: string | null
          status: string
          tenant_id: string
          to_number: string
        }
        Insert: {
          booking_id?: string | null
          cost_credits?: number | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          event_key?: string | null
          guest_id?: string | null
          id?: string
          message_body: string
          provider?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          tenant_id: string
          to_number: string
        }
        Update: {
          booking_id?: string | null
          cost_credits?: number | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          event_key?: string | null
          guest_id?: string | null
          id?: string
          message_body?: string
          provider?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          tenant_id?: string
          to_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "v_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_marketplace_items: {
        Row: {
          created_at: string | null
          credits_amount: number
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          item_type: string
          key: string
          name: string
          price_amount: number
          updated_at: string | null
          validity_days: number | null
        }
        Insert: {
          created_at?: string | null
          credits_amount: number
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          item_type?: string
          key: string
          name: string
          price_amount: number
          updated_at?: string | null
          validity_days?: number | null
        }
        Update: {
          created_at?: string | null
          credits_amount?: number
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          item_type?: string
          key?: string
          name?: string
          price_amount?: number
          updated_at?: string | null
          validity_days?: number | null
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          created_at: string | null
          event_key: string
          id: string
          is_active: boolean | null
          language: string | null
          template_body: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_key: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          template_body: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_key?: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          template_body?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      spa_services: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          display_order: number | null
          duration: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          price: number
          service_name: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          display_order?: number | null
          duration?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          price: number
          service_name: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          display_order?: number | null
          duration?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          price?: number
          service_name?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spa_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          branch: string | null
          created_at: string | null
          department: string | null
          email: string
          full_name: string
          id: string
          manager_pin_hash: string | null
          metadata: Json | null
          password_reset_required: boolean | null
          phone: string | null
          pin_attempts: number | null
          pin_last_changed: string | null
          pin_locked_until: string | null
          pin_set_at: string | null
          role: string | null
          status: string | null
          supervisor_id: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          branch?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          full_name: string
          id?: string
          manager_pin_hash?: string | null
          metadata?: Json | null
          password_reset_required?: boolean | null
          phone?: string | null
          pin_attempts?: number | null
          pin_last_changed?: string | null
          pin_locked_until?: string | null
          pin_set_at?: string | null
          role?: string | null
          status?: string | null
          supervisor_id?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          branch?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          manager_pin_hash?: string | null
          metadata?: Json | null
          password_reset_required?: boolean | null
          phone?: string | null
          pin_attempts?: number | null
          pin_last_changed?: string | null
          pin_locked_until?: string | null
          pin_set_at?: string | null
          role?: string | null
          status?: string | null
          supervisor_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_activity: {
        Row: {
          action: string
          department: string | null
          description: string | null
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json | null
          role: string | null
          staff_id: string
          tenant_id: string
          timestamp: string | null
        }
        Insert: {
          action: string
          department?: string | null
          description?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          role?: string | null
          staff_id: string
          tenant_id: string
          timestamp?: string | null
        }
        Update: {
          action?: string
          department?: string | null
          description?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          role?: string | null
          staff_id?: string
          tenant_id?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_activity_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_activity_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          department: string | null
          email: string
          expires_at: string
          full_name: string
          id: string
          invitation_token: string
          invited_by: string | null
          role: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          expires_at?: string
          full_name: string
          id?: string
          invitation_token?: string
          invited_by?: string | null
          role?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invitation_token?: string
          invited_by?: string | null
          role?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stay_folios: {
        Row: {
          balance: number | null
          booking_id: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          created_by: string | null
          folio_number: string | null
          folio_snapshot: Json | null
          folio_type: string
          group_id: string | null
          guest_id: string | null
          id: string
          is_closed_for_day: boolean | null
          is_primary: boolean
          metadata: Json | null
          night_audit_day: string | null
          night_audit_status: string | null
          parent_folio_id: string | null
          posting_date: string | null
          room_id: string | null
          status: string
          tenant_id: string
          total_charges: number | null
          total_payments: number | null
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          booking_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          folio_number?: string | null
          folio_snapshot?: Json | null
          folio_type?: string
          group_id?: string | null
          guest_id?: string | null
          id?: string
          is_closed_for_day?: boolean | null
          is_primary?: boolean
          metadata?: Json | null
          night_audit_day?: string | null
          night_audit_status?: string | null
          parent_folio_id?: string | null
          posting_date?: string | null
          room_id?: string | null
          status?: string
          tenant_id: string
          total_charges?: number | null
          total_payments?: number | null
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          booking_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          folio_number?: string | null
          folio_snapshot?: Json | null
          folio_type?: string
          group_id?: string | null
          guest_id?: string | null
          id?: string
          is_closed_for_day?: boolean | null
          is_primary?: boolean
          metadata?: Json | null
          night_audit_day?: string | null
          night_audit_status?: string | null
          parent_folio_id?: string | null
          posting_date?: string | null
          room_id?: string | null
          status?: string
          tenant_id?: string
          total_charges?: number | null
          total_payments?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stay_folios_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stay_folios_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stay_folios_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stay_folios_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "v_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stay_folios_parent_folio_id_fkey"
            columns: ["parent_folio_id"]
            isOneToOne: false
            referencedRelation: "stay_folios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stay_folios_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stay_folios_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stay_folios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          approved_by: string | null
          created_at: string | null
          created_by: string
          destination: string | null
          id: string
          item_id: string
          metadata: Json | null
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          quantity: number
          reference_no: string | null
          source: string | null
          tenant_id: string
          total_value: number | null
          unit_cost: number | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          created_by: string
          destination?: string | null
          id?: string
          item_id: string
          metadata?: Json | null
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          quantity: number
          reference_no?: string | null
          source?: string | null
          tenant_id: string
          total_value?: number | null
          unit_cost?: number | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string
          destination?: string | null
          id?: string
          item_id?: string
          metadata?: Json | null
          movement_type?: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          quantity?: number
          reference_no?: string | null
          source?: string | null
          tenant_id?: string
          total_value?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_stock: {
        Row: {
          id: string
          item_id: string
          last_updated: string | null
          location: string | null
          quantity: number
          tenant_id: string
        }
        Insert: {
          id?: string
          item_id: string
          last_updated?: string | null
          location?: string | null
          quantity?: number
          tenant_id: string
        }
        Update: {
          id?: string
          item_id?: string
          last_updated?: string | null
          location?: string | null
          quantity?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_stock_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean | null
          address: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          metadata: Json | null
          name: string
          payment_terms: string | null
          phone: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          name: string
          payment_terms?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          payment_terms?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_email_usage_logs: {
        Row: {
          booking_id: string | null
          created_at: string | null
          error_message: string | null
          event_key: string | null
          failed_at: string | null
          guest_id: string | null
          id: string
          message_id: string | null
          provider: string | null
          recipient: string
          sent_at: string | null
          status: string | null
          subject: string | null
          tenant_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event_key?: string | null
          failed_at?: string | null
          guest_id?: string | null
          id?: string
          message_id?: string | null
          provider?: string | null
          recipient: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          tenant_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event_key?: string | null
          failed_at?: string | null
          guest_id?: string | null
          id?: string
          message_id?: string | null
          provider?: string | null
          recipient?: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_email_usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_onboarding: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_step: number | null
          id: string
          metadata: Json | null
          started_at: string | null
          status: string
          steps_completed: Json | null
          tenant_id: string
          total_steps: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status?: string
          steps_completed?: Json | null
          tenant_id: string
          total_steps?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status?: string
          steps_completed?: Json | null
          tenant_id?: string
          total_steps?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_onboarding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_onboarding_tasks: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          is_required: boolean | null
          metadata: Json | null
          sort_order: number | null
          task_description: string | null
          task_key: string
          task_name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          is_required?: boolean | null
          metadata?: Json | null
          sort_order?: number | null
          task_description?: string | null
          task_key: string
          task_name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          is_required?: boolean | null
          metadata?: Json | null
          sort_order?: number | null
          task_description?: string | null
          task_key?: string
          task_name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_onboarding_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_provider_assignments: {
        Row: {
          assigned_at: string
          id: string
          is_default: boolean
          provider_id: string
          sender_id: string | null
          tenant_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          is_default?: boolean
          provider_id: string
          sender_id?: string | null
          tenant_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          is_default?: boolean
          provider_id?: string
          sender_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_provider_assignments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "platform_sms_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_provider_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_sms_alert_logs: {
        Row: {
          alert_type: string
          id: string
          message: string | null
          quota_remaining: number
          quota_total: number
          recipients: Json | null
          sent_at: string
          tenant_id: string
        }
        Insert: {
          alert_type: string
          id?: string
          message?: string | null
          quota_remaining: number
          quota_total: number
          recipients?: Json | null
          sent_at?: string
          tenant_id: string
        }
        Update: {
          alert_type?: string
          id?: string
          message?: string | null
          quota_remaining?: number
          quota_total?: number
          recipients?: Json | null
          sent_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_sms_alert_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_sms_alert_settings: {
        Row: {
          alert_enabled: boolean
          alert_recipients: Json
          alert_threshold_absolute: number | null
          alert_threshold_percent: number
          created_at: string
          id: string
          last_alert_sent_at: string | null
          notify_email: boolean
          notify_sms: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          alert_enabled?: boolean
          alert_recipients?: Json
          alert_threshold_absolute?: number | null
          alert_threshold_percent?: number
          created_at?: string
          id?: string
          last_alert_sent_at?: string | null
          notify_email?: boolean
          notify_sms?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          alert_enabled?: boolean
          alert_recipients?: Json
          alert_threshold_absolute?: number | null
          alert_threshold_percent?: number
          created_at?: string
          id?: string
          last_alert_sent_at?: string | null
          notify_email?: boolean
          notify_sms?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_sms_alert_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_sms_credits: {
        Row: {
          created_at: string
          credits_available: number
          credits_used: number
          id: string
          tenant_id: string
          total_purchased: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_available?: number
          credits_used?: number
          id?: string
          tenant_id: string
          total_purchased?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_available?: number
          credits_used?: number
          id?: string
          tenant_id?: string
          total_purchased?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_sms_credits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_sms_purchases: {
        Row: {
          amount_paid: number
          credits_purchased: number
          currency: string | null
          expires_at: string | null
          id: string
          marketplace_item_id: string | null
          payment_id: string | null
          purchased_at: string | null
          purchased_by: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          amount_paid: number
          credits_purchased: number
          currency?: string | null
          expires_at?: string | null
          id?: string
          marketplace_item_id?: string | null
          payment_id?: string | null
          purchased_at?: string | null
          purchased_by?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          amount_paid?: number
          credits_purchased?: number
          currency?: string | null
          expires_at?: string | null
          id?: string
          marketplace_item_id?: string | null
          payment_id?: string | null
          purchased_at?: string | null
          purchased_by?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_sms_purchases_marketplace_item_id_fkey"
            columns: ["marketplace_item_id"]
            isOneToOne: false
            referencedRelation: "sms_marketplace_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_sms_purchases_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_sms_purchases_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "v_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_sms_purchases_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "v_today_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_sms_purchases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_sms_quota: {
        Row: {
          created_at: string | null
          id: string
          last_purchase_at: string | null
          quota_reset_date: string | null
          quota_total: number
          quota_used: number
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_purchase_at?: string | null
          quota_reset_date?: string | null
          quota_total?: number
          quota_used?: number
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_purchase_at?: string | null
          quota_reset_date?: string | null
          quota_total?: number
          quota_used?: number
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_sms_quota_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_sms_settings: {
        Row: {
          api_key_encrypted: string | null
          api_secret_encrypted: string | null
          auto_send_booking_confirmation: boolean | null
          auto_send_cancellation: boolean | null
          auto_send_checkin_reminder: boolean | null
          auto_send_checkout_confirmation: boolean | null
          auto_send_checkout_reminder: boolean | null
          auto_send_modification: boolean | null
          auto_send_payment_confirmation: boolean | null
          created_at: string | null
          enabled: boolean | null
          id: string
          provider: string
          sender_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          auto_send_booking_confirmation?: boolean | null
          auto_send_cancellation?: boolean | null
          auto_send_checkin_reminder?: boolean | null
          auto_send_checkout_confirmation?: boolean | null
          auto_send_checkout_reminder?: boolean | null
          auto_send_modification?: boolean | null
          auto_send_payment_confirmation?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          provider?: string
          sender_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          auto_send_booking_confirmation?: boolean | null
          auto_send_cancellation?: boolean | null
          auto_send_checkin_reminder?: boolean | null
          auto_send_checkout_confirmation?: boolean | null
          auto_send_checkout_reminder?: boolean | null
          auto_send_modification?: boolean | null
          auto_send_payment_confirmation?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          provider?: string
          sender_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_sms_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_sms_usage_logs: {
        Row: {
          booking_id: string | null
          cost: number
          delivered_at: string | null
          error_message: string | null
          event_key: string
          failed_at: string | null
          guest_id: string | null
          id: string
          message_preview: string | null
          metadata: Json | null
          provider: string | null
          recipient: string
          segments: number
          sent_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          booking_id?: string | null
          cost?: number
          delivered_at?: string | null
          error_message?: string | null
          event_key: string
          failed_at?: string | null
          guest_id?: string | null
          id?: string
          message_preview?: string | null
          metadata?: Json | null
          provider?: string | null
          recipient: string
          segments?: number
          sent_at?: string
          status?: string
          tenant_id: string
        }
        Update: {
          booking_id?: string | null
          cost?: number
          delivered_at?: string | null
          error_message?: string | null
          event_key?: string
          failed_at?: string | null
          guest_id?: string | null
          id?: string
          message_preview?: string | null
          metadata?: Json | null
          provider?: string | null
          recipient?: string
          segments?: number
          sent_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_sms_usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          billing_cycle: string
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          metadata: Json | null
          plan_id: string
          status: string
          tenant_id: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start?: string
          id?: string
          metadata?: Json | null
          plan_id: string
          status?: string
          tenant_id: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          metadata?: Json | null
          plan_id?: string
          status?: string
          tenant_id?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "platform_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          activated_at: string | null
          brand_color: string | null
          created_at: string | null
          deactivated_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          domain: string | null
          id: string
          logo_url: string | null
          metadata: Json | null
          name: string
          slug: string
          status: string | null
          suspended_at: string | null
          suspension_reason: string | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          brand_color?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name: string
          slug: string
          status?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          brand_color?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          slug?: string
          status?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string | null
          suspension_metadata: Json | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          status?: string | null
          suspension_metadata?: Json | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string | null
          suspension_metadata?: Json | null
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
            referencedRelation: "v_payments"
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
      wifi_credentials: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          instructions: string | null
          is_active: boolean | null
          location: string | null
          network_name: string
          password: string
          qr_data: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          location?: string | null
          network_name: string
          password: string
          qr_data?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          location?: string | null
          network_name?: string
          password?: string
          qr_data?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wifi_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      sms_analytics_summary: {
        Row: {
          avg_delivery_time_seconds: number | null
          date: string | null
          delivered: number | null
          event_key: string | null
          failed: number | null
          tenant_id: string | null
          total_cost: number | null
          total_segments: number | null
          total_sent: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_sms_usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bookings: {
        Row: {
          action_id: string | null
          booking_reference: string | null
          check_in: string | null
          check_out: string | null
          created_at: string | null
          guest_id: string | null
          id: string | null
          metadata: Json | null
          notes: string | null
          organization_id: string | null
          room_id: string | null
          source: string | null
          status: string | null
          tenant_id: string | null
          total_amount: number | null
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
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "v_guests"
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
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "v_rooms"
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
      v_daily_revenue: {
        Row: {
          payment_count: number | null
          report_date: string | null
          tenant_id: string | null
          total_revenue: number | null
          unique_bookings: number | null
          unique_guests: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
      v_department_revenue: {
        Row: {
          department: string | null
          payments_received: number | null
          report_date: string | null
          revenue: number | null
          tenant_id: string | null
          transaction_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "folio_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      v_guests: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          id_number: string | null
          last_stay_date: string | null
          name: string | null
          notes: string | null
          phone: string | null
          status: string | null
          tags: Json | null
          tenant_id: string | null
          total_bookings: number | null
          total_spent: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          id_number?: string | null
          last_stay_date?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          status?: string | null
          tags?: Json | null
          tenant_id?: string | null
          total_bookings?: number | null
          total_spent?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          id_number?: string | null
          last_stay_date?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          status?: string | null
          tags?: Json | null
          tenant_id?: string | null
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
      v_outstanding_summary: {
        Row: {
          avg_balance: number | null
          max_balance: number | null
          min_balance: number | null
          negative_balance_total: number | null
          open_folios_count: number | null
          positive_balance_total: number | null
          tenant_id: string | null
          total_outstanding: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stay_folios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_payments: {
        Row: {
          amount: number | null
          booking_id: string | null
          charged_to_organization: boolean | null
          created_at: string | null
          currency: string | null
          department: string | null
          expected_amount: number | null
          guest_id: string | null
          id: string | null
          location: string | null
          metadata: Json | null
          method: string | null
          method_provider: string | null
          organization_id: string | null
          payment_type: string | null
          provider_reference: string | null
          recorded_by: string | null
          status: string | null
          stay_folio_id: string | null
          tenant_id: string | null
          transaction_ref: string | null
          wallet_id: string | null
        }
        Insert: {
          amount?: number | null
          booking_id?: string | null
          charged_to_organization?: boolean | null
          created_at?: string | null
          currency?: string | null
          department?: string | null
          expected_amount?: number | null
          guest_id?: string | null
          id?: string | null
          location?: string | null
          metadata?: Json | null
          method?: string | null
          method_provider?: string | null
          organization_id?: string | null
          payment_type?: string | null
          provider_reference?: string | null
          recorded_by?: string | null
          status?: string | null
          stay_folio_id?: string | null
          tenant_id?: string | null
          transaction_ref?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: number | null
          booking_id?: string | null
          charged_to_organization?: boolean | null
          created_at?: string | null
          currency?: string | null
          department?: string | null
          expected_amount?: number | null
          guest_id?: string | null
          id?: string | null
          location?: string | null
          metadata?: Json | null
          method?: string | null
          method_provider?: string | null
          organization_id?: string | null
          payment_type?: string | null
          provider_reference?: string | null
          recorded_by?: string | null
          status?: string | null
          stay_folio_id?: string | null
          tenant_id?: string | null
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
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_bookings"
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
            foreignKeyName: "payments_stay_folio_id_fkey"
            columns: ["stay_folio_id"]
            isOneToOne: false
            referencedRelation: "stay_folios"
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
      v_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      v_rooms: {
        Row: {
          assigned_to: string | null
          capacity: number | null
          category_id: string | null
          created_at: string | null
          current_guest_id: string | null
          current_reservation_id: string | null
          floor: number | null
          housekeeping_status: string | null
          id: string | null
          metadata: Json | null
          notes: string | null
          number: string | null
          rate: number | null
          status: string | null
          tenant_id: string | null
          type: string | null
        }
        Insert: {
          assigned_to?: string | null
          capacity?: number | null
          category_id?: string | null
          created_at?: string | null
          current_guest_id?: string | null
          current_reservation_id?: string | null
          floor?: number | null
          housekeeping_status?: string | null
          id?: string | null
          metadata?: Json | null
          notes?: string | null
          number?: string | null
          rate?: number | null
          status?: string | null
          tenant_id?: string | null
          type?: string | null
        }
        Update: {
          assigned_to?: string | null
          capacity?: number | null
          category_id?: string | null
          created_at?: string | null
          current_guest_id?: string | null
          current_reservation_id?: string | null
          floor?: number | null
          housekeeping_status?: string | null
          id?: string | null
          metadata?: Json | null
          notes?: string | null
          number?: string | null
          rate?: number | null
          status?: string | null
          tenant_id?: string | null
          type?: string | null
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
            foreignKeyName: "rooms_current_guest_id_fkey"
            columns: ["current_guest_id"]
            isOneToOne: false
            referencedRelation: "v_guests"
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
            foreignKeyName: "rooms_current_reservation_id_fkey"
            columns: ["current_reservation_id"]
            isOneToOne: false
            referencedRelation: "v_bookings"
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
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_bookings"
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
      attach_booking_payments_to_folio: {
        Args: { p_booking_id: string; p_folio_id: string; p_tenant_id: string }
        Returns: Json
      }
      booking_room_integrity_diagnostics: {
        Args: { p_tenant_id: string }
        Returns: Json
      }
      calculate_folio_stats_by_type: {
        Args: { p_audit_date: string; p_tenant_id: string }
        Returns: Json
      }
      calculate_org_remaining_limit: {
        Args: {
          p_amount: number
          p_department: string
          p_guest_id: string
          p_org_id: string
        }
        Returns: Json
      }
      check_tenant_access: { Args: { _tenant_id: string }; Returns: Json }
      clear_approval_token: {
        Args: { p_approver_id: string; p_tenant_id: string }
        Returns: undefined
      }
      close_child_folio_to_master: {
        Args: { p_child_folio_id: string; p_master_folio_id: string }
        Returns: Json
      }
      complete_night_audit_for_folio: {
        Args: { p_folio_id: string }
        Returns: Json
      }
      create_group_master_folio: {
        Args: {
          p_group_id: string
          p_group_name: string
          p_guest_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      current_user_tenant: { Args: never; Returns: string }
      execute_payment_posting: {
        Args: {
          p_amount: number
          p_booking_id: string
          p_payment_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      find_open_folio_by_guest_phone: {
        Args: { p_phone: string; p_tenant_id: string }
        Returns: {
          balance: number
          booking_id: string
          folio_id: string
          guest_id: string
          room_id: string
        }[]
      }
      find_open_folio_by_room: {
        Args: { p_room_id: string; p_tenant_id: string }
        Returns: {
          balance: number
          booking_id: string
          created_at: string
          folio_id: string
          guest_id: string
        }[]
      }
      folio_merge: {
        Args: { p_source_folio_id: string; p_target_folio_id: string }
        Returns: Json
      }
      folio_post_charge: {
        Args: {
          p_amount: number
          p_department?: string
          p_description: string
          p_folio_id: string
          p_reference_id?: string
          p_reference_type?: string
        }
        Returns: Json
      }
      folio_post_payment: {
        Args: { p_amount: number; p_folio_id: string; p_payment_id: string }
        Returns: Json
      }
      folio_split_charge: {
        Args: { p_splits: Json; p_transaction_id: string }
        Returns: Json
      }
      folio_transfer_charge: {
        Args: {
          p_amount: number
          p_source_folio_id: string
          p_target_folio_id: string
          p_transaction_id: string
        }
        Returns: Json
      }
      generate_approval_token: {
        Args: {
          p_action_reference?: string
          p_action_type: string
          p_amount?: number
          p_approver_id: string
          p_tenant_id: string
        }
        Returns: string
      }
      generate_folio_number: {
        Args: {
          p_booking_id: string
          p_folio_type: string
          p_tenant_id: string
        }
        Returns: string
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_receipt_number: {
        Args: { p_receipt_type: string; p_tenant_id: string }
        Returns: string
      }
      generate_request_number: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      get_bookings_for_user: {
        Args: { uid: string }
        Returns: {
          check_in: string
          check_out: string
          id: string
          room_id: string
          tenant_id: string
        }[]
      }
      get_department_staff: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: {
          branch: string
          email: string
          full_name: string
          phone: string
          role: string
          staff_id: string
          status: string
        }[]
      }
      get_group_master_folio: {
        Args: { p_group_id: string; p_tenant_id: string }
        Returns: Json
      }
      get_low_stock_items: {
        Args: { p_tenant_id: string }
        Returns: {
          current_qty: number
          item_id: string
          item_name: string
          reorder_level: number
        }[]
      }
      get_request_messages: {
        Args: { _qr_token: string; _request_id: string }
        Returns: {
          created_at: string
          direction: string
          id: string
          message: string
          sender_name: string
          sent_by: string
        }[]
      }
      get_tenant_by_domain: { Args: { _domain: string }; Returns: string }
      get_user_tenant: { Args: { _user_id: string }; Returns: string }
      has_platform_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      initialize_tenant_onboarding: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_system_locked_user: { Args: { _user_id: string }; Returns: boolean }
      post_group_master_charge: {
        Args: {
          p_amount: number
          p_description: string
          p_group_id: string
          p_reference_id: string
          p_reference_type: string
          p_tenant_id: string
        }
        Returns: Json
      }
      post_group_master_charge_direct: {
        Args: {
          p_amount: number
          p_description: string
          p_group_id: string
          p_reference_id: string
          p_reference_type: string
          p_tenant_id: string
        }
        Returns: Json
      }
      prepare_folio_for_night_audit: {
        Args: { p_audit_day: string; p_folio_id: string }
        Returns: Json
      }
      restore_tenant: { Args: { _tenant_id: string }; Returns: Json }
      soft_delete_tenant: {
        Args: { _deleted_by: string; _tenant_id: string }
        Returns: Json
      }
      sync_master_folio_totals: {
        Args: { p_master_folio_id: string }
        Returns: Json
      }
      user_has_permission: {
        Args: { _permission_key: string; _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      validate_approval_token: {
        Args: {
          p_action_type: string
          p_approver_id: string
          p_tenant_id: string
          p_token: string
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
      validate_qr_token: {
        Args: { _token: string }
        Returns: {
          assigned_to: string
          display_name: string
          qr_id: string
          room_id: string
          scope: string
          services: Json
          tenant_id: string
          welcome_message: string
        }[]
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
        | "finance"
        | "restaurant"
        | "bar"
        | "accountant"
        | "supervisor"
        | "store_manager"
        | "procurement"
        | "spa"
        | "concierge"
        | "admin"
        | "hr"
        | "limited_ops"
        | "guest_portal_access"
        | "store_user"
        | "kitchen"
        | "super_admin"
        | "support_admin"
        | "billing_bot"
        | "marketplace_admin"
        | "monitoring_bot"
      department_type:
        | "front_office"
        | "housekeeping"
        | "maintenance"
        | "food_beverage"
        | "kitchen"
        | "bar"
        | "finance"
        | "management"
        | "security"
        | "spa"
        | "concierge"
        | "admin"
        | "inventory"
        | "hr"
      item_category:
        | "food"
        | "beverage"
        | "cleaning"
        | "linen"
        | "amenities"
        | "maintenance"
        | "office"
        | "kitchen_equipment"
        | "other"
      movement_type:
        | "purchase"
        | "issue"
        | "return"
        | "transfer"
        | "adjustment"
        | "wastage"
        | "consumption"
        | "expired"
      request_status:
        | "pending"
        | "approved"
        | "issued"
        | "rejected"
        | "cancelled"
      service_category:
        | "room_service"
        | "bar"
        | "fb"
        | "spa"
        | "laundry"
        | "minibar"
        | "transport"
        | "misc"
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
        "finance",
        "restaurant",
        "bar",
        "accountant",
        "supervisor",
        "store_manager",
        "procurement",
        "spa",
        "concierge",
        "admin",
        "hr",
        "limited_ops",
        "guest_portal_access",
        "store_user",
        "kitchen",
        "super_admin",
        "support_admin",
        "billing_bot",
        "marketplace_admin",
        "monitoring_bot",
      ],
      department_type: [
        "front_office",
        "housekeeping",
        "maintenance",
        "food_beverage",
        "kitchen",
        "bar",
        "finance",
        "management",
        "security",
        "spa",
        "concierge",
        "admin",
        "inventory",
        "hr",
      ],
      item_category: [
        "food",
        "beverage",
        "cleaning",
        "linen",
        "amenities",
        "maintenance",
        "office",
        "kitchen_equipment",
        "other",
      ],
      movement_type: [
        "purchase",
        "issue",
        "return",
        "transfer",
        "adjustment",
        "wastage",
        "consumption",
        "expired",
      ],
      request_status: [
        "pending",
        "approved",
        "issued",
        "rejected",
        "cancelled",
      ],
      service_category: [
        "room_service",
        "bar",
        "fb",
        "spa",
        "laundry",
        "minibar",
        "transport",
        "misc",
      ],
    },
  },
} as const
