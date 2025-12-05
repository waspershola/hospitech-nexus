import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInHours, format } from 'date-fns';
import { isOfflineMode } from '@/lib/offline/requestInterceptor';

interface CheckoutReminder {
  id: string;
  roomNumber: string;
  guestName: string;
  checkoutDate: string;
  hoursUntilCheckout: number;
  bookingId: string;
}

export function useCheckoutReminders() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['checkout-reminders', tenantId],
    queryFn: async (): Promise<CheckoutReminder[]> => {
      if (!tenantId) return [];

      // Phase 14B: Return empty when offline in Electron
      if (isOfflineMode()) {
        console.log('[useCheckoutReminders] Offline: Returning empty array');
        return [];
      }

      // Get checkout time configuration
      const { data: configData } = await supabase
        .from('hotel_configurations')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('key', 'check_out_time')
        .maybeSingle();

      const checkoutTime = configData?.value ? String(configData.value).replace(/"/g, '') : '12:00';
      const [hours, minutes] = checkoutTime.split(':').map(Number);

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      // Get all checked-in bookings checking out today or tomorrow
      const { data: upcomingCheckouts } = await supabase
        .from('bookings')
        .select(`
          id,
          check_out,
          room:rooms(number),
          guest:guests(name)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'checked_in')
        .lte('check_out', tomorrow.toISOString())
        .gte('check_out', now.toISOString());

      if (!upcomingCheckouts || upcomingCheckouts.length === 0) return [];

      const reminders: CheckoutReminder[] = upcomingCheckouts.map((booking: any) => {
        const checkoutDateTime = new Date(booking.check_out);
        checkoutDateTime.setHours(hours, minutes, 0, 0);
        
        const hoursUntilCheckout = differenceInHours(checkoutDateTime, now);

        return {
          id: booking.id,
          roomNumber: booking.room?.number || '',
          guestName: booking.guest?.name || 'Unknown Guest',
          checkoutDate: booking.check_out,
          hoursUntilCheckout,
          bookingId: booking.id,
        };
      }).filter(r => r.hoursUntilCheckout >= 0 && r.hoursUntilCheckout <= 24); // Only show 24h reminders

      return reminders.sort((a, b) => a.hoursUntilCheckout - b.hoursUntilCheckout);
    },
    enabled: !!tenantId,
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
  });
}
