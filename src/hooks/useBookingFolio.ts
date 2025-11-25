import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * FOLIO SYSTEM ARCHITECTURE (Phase 4 - Zero Fallback)
 * =====================================================
 * 
 * This hook is the SINGLE SOURCE OF TRUTH for all folio data in the system.
 * 
 * CRITICAL RULES:
 * ---------------
 * 1. Pre-Check-In (status: 'reserved', 'pending', 'cancelled'):
 *    - Use booking.total_amount for preview calculations
 *    - Calculate balance as: booking.total_amount - sum(payments)
 * 
 * 2. Post-Check-In (status: 'checked_in', 'completed'):
 *    - ONLY use stay_folios table data (NEVER fall back to booking calculations)
 *    - If stay_folio is missing for checked-in booking → THROW ERROR
 *    - All values come from database: total_charges, total_payments, balance
 * 
 * 3. Platform Fee Separation:
 *    - Platform fees are BACKEND-ONLY (never appear in folio_transactions)
 *    - For guest-pays mode: booking.total_amount includes platform fee
 *    - stay_folios.total_charges mirrors booking.total_amount (includes fee)
 *    - Platform fees tracked separately in platform_fee_ledger table
 *    - Guests see single total without platform fee breakdown
 * 
 * PROHIBITED PATTERNS:
 * --------------------
 * ❌ booking.total_amount - sum(payments) for checked-in bookings
 * ❌ SQL aggregation queries (SELECT SUM(amount) FROM payments)
 * ❌ Fallback logic (folio?.balance || calculated_balance)
 * ❌ Platform fees as folio_transactions entries
 * 
 * ERROR HANDLING:
 * ---------------
 * - Missing folio for checked-in booking = THROW ERROR (data integrity issue)
 * - This enforces the requirement that checkin-guest edge function MUST create folios
 * - Loud failures are better than silent data corruption
 * 
 * See: docs/PHASE-4-FOLIO-FALLBACK-REMOVAL.md
 */

export interface TaxBreakdown {
  baseAmount: number;
  vatAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
  vatRate?: number;
  serviceCharge?: number;
}

export interface PaymentDetail {
  id: string;
  amount: number;
  method: string;
  method_provider?: string | null;
  transaction_ref: string;
  created_at: string;
  tax_breakdown?: TaxBreakdown;
}

export interface FolioBalance {
  bookingId: string;
  folioId?: string | null;
  totalCharges: number;
  totalPayments: number;
  balance: number;
  currency: string;
  bookingTaxBreakdown?: TaxBreakdown;
  payments: PaymentDetail[];
  isGroupBooking?: boolean;
  numberOfBookings?: number;
  groupId?: string | null;
  guestEmail?: string | null;
  guestName?: string;
}

/**
 * Hook to fetch folio balance for a booking
 * Supports group bookings by aggregating all bookings in the group
 */
export function useBookingFolio(bookingId: string | null) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  // Real-time folio updates via Supabase channels
  useEffect(() => {
    if (!bookingId || !tenantId) return;
    
    console.log('[folio] Setting up real-time subscription for booking:', bookingId);
    
    const channel = supabase
      .channel(`folio-updates-${bookingId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stay_folios',
        filter: `booking_id=eq.${bookingId}`
      }, (payload) => {
        console.log('[folio] Real-time update received:', payload);
        queryClient.invalidateQueries({ queryKey: ['booking-folio', bookingId, tenantId] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'folio_transactions',
      }, (payload) => {
        console.log('[folio-txn] Transaction update received:', payload);
        queryClient.invalidateQueries({ queryKey: ['booking-folio', bookingId, tenantId] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `booking_id=eq.${bookingId}`
      }, (payload) => {
        console.log('[payment] Payment update received:', payload);
        queryClient.invalidateQueries({ queryKey: ['booking-folio', bookingId, tenantId] });
      })
      .subscribe();
    
    // Multi-tab sync via postMessage
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'FOLIO_UPDATED' && e.data?.bookingId === bookingId) {
        console.log('[folio] Multi-tab update received:', e.data);
        queryClient.invalidateQueries({ queryKey: ['booking-folio', bookingId, tenantId] });
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      console.log('[folio] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
      window.removeEventListener('message', handleMessage);
    };
  }, [bookingId, tenantId, queryClient]);

  return useQuery({
    queryKey: ['booking-folio', bookingId, tenantId],
    queryFn: async (): Promise<FolioBalance | null> => {
      if (!bookingId || !tenantId) return null;

      // Fetch booking details to check for group_id
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('total_amount, metadata, status')
        .eq('id', bookingId)
        .eq('tenant_id', tenantId)
        .single();

      if (bookingError) throw bookingError;

      const bookingMeta = booking?.metadata as any;
      const groupId = bookingMeta?.group_id;

      // If this is a group booking, fetch all bookings in the group
      if (groupId) {
        const { data: groupBookings, error: groupError } = await supabase
          .from('bookings')
          .select('id, status')
          .eq('tenant_id', tenantId)
          .contains('metadata', { group_id: groupId });

        if (groupError) throw groupError;

        const bookingIds = groupBookings?.map(b => b.id) || [];

        // Fetch REAL folio data for all bookings in group
        const { data: folios, error: foliosError } = await supabase
          .from('stay_folios')
          .select('id, booking_id, total_charges, total_payments, balance')
          .in('booking_id', bookingIds)
          .eq('tenant_id', tenantId);

        if (foliosError) throw foliosError;

        // Sum from REAL folio totals (not booking.total_amount)
        const totalCharges = folios?.reduce((sum, f) => sum + Number(f.total_charges || 0), 0) || 0;
        const totalPayments = folios?.reduce((sum, f) => sum + Number(f.total_payments || 0), 0) || 0;

        // Fetch payments for display details only
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('id, amount, currency, method, method_provider, transaction_ref, created_at, metadata')
          .eq('tenant_id', tenantId)
          .in('booking_id', bookingIds)
          .order('created_at', { ascending: false });

        if (paymentsError) throw paymentsError;

        const currency = payments?.[0]?.currency || 'NGN';

        const paymentDetails: PaymentDetail[] = payments?.map(p => {
          const paymentMeta = p.metadata as any;
          return {
            id: p.id,
            amount: Number(p.amount),
            method: p.method,
            method_provider: p.method_provider,
            transaction_ref: p.transaction_ref || '',
            created_at: p.created_at,
            tax_breakdown: paymentMeta?.tax_breakdown as TaxBreakdown | undefined,
          };
        }) || [];

        return {
          bookingId: groupId,
          totalCharges,
          totalPayments,
          balance: totalCharges - totalPayments,
          currency,
          payments: paymentDetails,
          isGroupBooking: true,
          numberOfBookings: groupBookings?.length || 0,
          groupId,
        };
      }

      // Single booking: check if checked-in (folio exists)
      const isCheckedIn = booking.status === 'checked_in' || booking.status === 'completed';

      if (isCheckedIn) {
        // POST-CHECK-IN: ONLY read from REAL folio data (NO FALLBACK)
        const { data: folio, error: folioError } = await supabase
          .from('stay_folios')
          .select('id, total_charges, total_payments, balance')
          .eq('booking_id', bookingId)
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (folioError) throw folioError;

        // CRITICAL: No fallback. Checked-in bookings MUST have folios.
        if (!folio) {
          throw new Error(
            `FOLIO MISSING: Booking ${bookingId} is checked-in but has no stay_folio. ` +
            `This indicates a critical data integrity issue. Check checkin-guest edge function deployment.`
          );
        }
        // Fetch payments from the canonical ledger (folio_transactions)
        const { data: transactions, error: txError } = await supabase
          .from('folio_transactions')
          .select('id, amount, created_at, description, reference_type, reference_id, transaction_type, metadata')
          .eq('folio_id', folio.id)
          .eq('transaction_type', 'payment')
          .order('created_at', { ascending: false });

        if (txError) throw txError;

        const currency = 'NGN';
        const bookingTaxBreakdown = bookingMeta?.tax_breakdown as TaxBreakdown | undefined;

        const paymentDetails: PaymentDetail[] = (transactions || []).map((ft: any) => ({
          id: ft.reference_id || ft.id,
          amount: Number(ft.amount),
          method: ft.metadata?.method || 'unknown',
          method_provider: ft.metadata?.provider || null,
          transaction_ref: ft.reference_id || '',
          created_at: ft.created_at,
          tax_breakdown: ft.metadata?.tax_breakdown as TaxBreakdown | undefined
        }));

        return {
          bookingId,
          folioId: folio.id,
          totalCharges: Number(folio.total_charges),
          totalPayments: Number(folio.total_payments),
          balance: Number(folio.balance),
          currency,
          bookingTaxBreakdown,
          payments: paymentDetails,
          isGroupBooking: false,
          numberOfBookings: 1,
        };
      }

      // PRE-CHECK-IN: Use booking.total_amount for preview
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount, currency, method, method_provider, transaction_ref, created_at, metadata')
        .eq('booking_id', bookingId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      const totalCharges = Number(booking?.total_amount || 0);
      const totalPayments = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const currency = payments?.[0]?.currency || 'NGN';
      const bookingTaxBreakdown = bookingMeta?.tax_breakdown as TaxBreakdown | undefined;

      const paymentDetails: PaymentDetail[] = payments?.map(p => {
        const paymentMeta = p.metadata as any;
        return {
          id: p.id,
          amount: Number(p.amount),
          method: p.method,
          method_provider: p.method_provider,
          transaction_ref: p.transaction_ref || '',
          created_at: p.created_at,
          tax_breakdown: paymentMeta?.tax_breakdown as TaxBreakdown | undefined,
        };
      }) || [];

      return {
        bookingId,
        totalCharges,
        totalPayments,
        balance: totalCharges - totalPayments,
        currency,
        bookingTaxBreakdown,
        payments: paymentDetails,
        isGroupBooking: false,
        numberOfBookings: 1,
      };
    },
    enabled: !!bookingId && !!tenantId,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });
}
