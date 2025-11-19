import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface GuestSnapshot {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  total_bookings: number;
  total_spent: number;
  last_stay_date: string | null;
  status: string;
  loyalty_tier?: string;
  lifetime_value: number;
  average_booking_value: number;
  tags: string[];
}

export function useGuestSnapshot(guestId: string | null) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['guest-snapshot', guestId, tenantId],
    queryFn: async () => {
      if (!guestId || !tenantId) {
        return null;
      }

      // Fetch guest details
      const { data: guest, error: guestError } = await supabase
        .from('guests')
        .select('*')
        .eq('id', guestId)
        .eq('tenant_id', tenantId)
        .single();

      if (guestError) {
        console.error('[useGuestSnapshot] Error fetching guest:', guestError);
        throw guestError;
      }

      if (!guest) {
        return null;
      }

      // Calculate lifetime stats
      const totalBookings = guest.total_bookings || 0;
      const totalSpent = guest.total_spent || 0;
      const averageBookingValue = totalBookings > 0 ? totalSpent / totalBookings : 0;

      // Determine loyalty tier based on total spent
      let loyaltyTier = 'Bronze';
      if (totalSpent >= 1000000) loyaltyTier = 'Platinum';
      else if (totalSpent >= 500000) loyaltyTier = 'Gold';
      else if (totalSpent >= 100000) loyaltyTier = 'Silver';

      const snapshot: GuestSnapshot = {
        id: guest.id,
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        total_bookings: totalBookings,
        total_spent: totalSpent,
        last_stay_date: guest.last_stay_date,
        status: guest.status,
        loyalty_tier: loyaltyTier,
        lifetime_value: totalSpent,
        average_booking_value: averageBookingValue,
        tags: (guest.tags as string[]) || [],
      };

      console.log('[useGuestSnapshot] Guest snapshot loaded:', snapshot);
      return snapshot;
    },
    enabled: !!guestId && !!tenantId,
  });
}
