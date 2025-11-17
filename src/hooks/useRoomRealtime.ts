import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to enable real-time updates for rooms
 * Listens to INSERT, UPDATE, DELETE events on rooms table
 */
export function useRoomRealtime() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('rooms-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log('Room change detected:', payload);
          
          // Invalidate relevant queries to refetch data
          queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
          queryClient.invalidateQueries({ queryKey: ['room-detail'] });
          queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);
}

/**
 * Hook to enable real-time updates for bookings
 */
export function useBookingRealtime() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('bookings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log('Booking change detected:', payload);
          
          queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
          queryClient.invalidateQueries({ queryKey: ['room-detail'] });
          queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
          queryClient.invalidateQueries({ queryKey: ['overstay-rooms'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);
}

/**
 * Hook to enable real-time updates for payments
 */
export function usePaymentRealtime() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('payments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log('Payment change detected:', payload);
          
          queryClient.invalidateQueries({ queryKey: ['booking-folio'] });
          queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);
}
