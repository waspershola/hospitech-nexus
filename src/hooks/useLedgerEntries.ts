import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { LedgerFilters, LedgerEntry } from '@/types/ledger';

export function useLedgerEntries(filters: LedgerFilters, options?: { limit?: number; offset?: number }) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['ledger-entries', tenantId, filters, options?.limit, options?.offset],
    queryFn: async () => {
      if (!tenantId) return { data: [], count: 0 };

      // Build base query with count
      let query: any = supabase
        .from('ledger_entries')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      // Date filters
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }

      // Transaction type filter
      if (filters.transactionType?.length) {
        query = query.in('transaction_type', filters.transactionType);
      }

      // Payment method filter (legacy text-based)
      if (filters.paymentMethod?.length) {
        query = query.in('payment_method', filters.paymentMethod);
      }

      // Payment method filter (FK-based)
      if (filters.paymentMethodId) {
        query = query.eq('payment_method_id', filters.paymentMethodId);
      }

      // Provider filter (legacy)
      if (filters.providerId) {
        query = query.eq('payment_provider_id', filters.providerId);
      }

      // Provider filter (FK-based)
      if (filters.paymentProviderId) {
        query = query.eq('payment_provider_id', filters.paymentProviderId);
      }

      // Location filter (legacy)
      if (filters.locationId) {
        query = query.eq('payment_location_id', filters.locationId);
      }

      // Location filter (FK-based)
      if (filters.paymentLocationId) {
        query = query.eq('payment_location_id', filters.paymentLocationId);
      }

      // Department filter
      if (filters.department?.length) {
        query = query.in('department', filters.department);
      }

      // Status filter
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }

      // Reconciliation status filter
      if (filters.reconciliationStatus?.length) {
        query = query.in('reconciliation_status', filters.reconciliationStatus);
      }

      // Staff filter
      if (filters.staffId) {
        query = query.or(`staff_id_initiated.eq.${filters.staffId},staff_id_confirmed.eq.${filters.staffId}`);
      }

      // Shift filter
      if (filters.shift) {
        query = query.eq('shift', filters.shift);
      }

      // Group booking filter
      if (filters.groupBookingId) {
        query = query.eq('group_booking_id', filters.groupBookingId);
      }

      // Guest filter
      if (filters.guestId) {
        query = query.eq('guest_id', filters.guestId);
      }

      // Room filter
      if (filters.roomId) {
        query = query.eq('room_number', filters.roomId);
      }

      // Room category filter
      if (filters.roomCategory) {
        query = query.ilike('room_category', `%${filters.roomCategory}%`);
      }

      // Source type filter
      if (filters.sourceType?.length) {
        query = query.in('source_type', filters.sourceType);
      }

      // Wallet type filter
      if (filters.walletType?.length) {
        query = query.in('wallet_type', filters.walletType);
      }

      // Organization filter
      if (filters.organizationId) {
        query = query.eq('organization_id', filters.organizationId);
      }

      // Search filter (ledger reference or guest name)
      if (filters.search) {
        query = query.or(`ledger_reference.ilike.%${filters.search}%,guest_name.ilike.%${filters.search}%`);
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    enabled: !!tenantId,
    staleTime: 30000, // 30 seconds cache for performance
  });
}
