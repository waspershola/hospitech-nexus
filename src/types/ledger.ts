import type { Database } from '@/integrations/supabase/types';

export type LedgerEntry = Database['public']['Tables']['ledger_entries']['Row'];

export interface LedgerFilters {
  dateFrom?: string;
  dateTo?: string;
  transactionType?: string[];
  paymentMethod?: string[];
  providerId?: string;
  locationId?: string;
  department?: string[];
  category?: string[];
  status?: string[];
  reconciliationStatus?: string[];
  staffId?: string;
  shift?: string;
  groupBookingId?: string;
  guestId?: string;
  roomId?: string;
  search?: string;
}
