import type { Database } from '@/integrations/supabase/types';

export type LedgerEntry = Database['public']['Tables']['ledger_entries']['Row'];

export interface LedgerFilters {
  dateFrom?: string;
  dateTo?: string;
  transactionType?: string[];
  paymentMethod?: string[];
  paymentMethodId?: string;      // FK to payment_methods
  providerId?: string;
  paymentProviderId?: string;     // FK to finance_providers
  locationId?: string;
  paymentLocationId?: string;     // FK to finance_locations
  department?: string[];
  category?: string[];
  status?: string[];
  reconciliationStatus?: string[];
  staffId?: string;
  shift?: string;
  sourceType?: string[];          // folio, qr_request, wallet, etc.
  walletType?: string[];          // guest, department, organization
  groupBookingId?: string;
  organizationId?: string;        // Corporate filter
  guestId?: string;
  roomId?: string;
  roomCategory?: string;          // Room category filter
  search?: string;
}
