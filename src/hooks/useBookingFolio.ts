import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  totalCharges: number;
  totalPayments: number;
  balance: number;
  currency: string;
  bookingTaxBreakdown?: TaxBreakdown;
  payments: PaymentDetail[];
}

/**
 * Hook to fetch folio balance for a booking
 * Prepared for integration with upcoming finance module
 */
export function useBookingFolio(bookingId: string | null) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['booking-folio', bookingId, tenantId],
    queryFn: async (): Promise<FolioBalance | null> => {
      if (!bookingId || !tenantId) return null;

      // Fetch booking details
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('total_amount, metadata')
        .eq('id', bookingId)
        .eq('tenant_id', tenantId)
        .single();

      if (bookingError) throw bookingError;

      // Fetch payments for this booking
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

      // Extract tax breakdown from booking metadata
      const bookingMeta = booking?.metadata as any;
      const bookingTaxBreakdown = bookingMeta?.tax_breakdown as TaxBreakdown | undefined;

      // Map payments with tax breakdown
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
      };
    },
    enabled: !!bookingId && !!tenantId,
  });
}
