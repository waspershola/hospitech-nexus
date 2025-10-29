import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FolioBalance {
  bookingId: string;
  totalCharges: number;
  totalPayments: number;
  balance: number;
  currency: string;
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
        .select('total_amount')
        .eq('id', bookingId)
        .eq('tenant_id', tenantId)
        .single();

      if (bookingError) throw bookingError;

      // Fetch payments for this booking
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, currency')
        .eq('booking_id', bookingId)
        .eq('tenant_id', tenantId);

      if (paymentsError) throw paymentsError;

      const totalCharges = Number(booking?.total_amount || 0);
      const totalPayments = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const currency = payments?.[0]?.currency || 'NGN';

      return {
        bookingId,
        totalCharges,
        totalPayments,
        balance: totalCharges - totalPayments,
        currency,
      };
    },
    enabled: !!bookingId && !!tenantId,
  });
}
