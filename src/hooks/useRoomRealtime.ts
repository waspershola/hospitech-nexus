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

    console.log('[useRoomRealtime] Setting up real-time subscription for tenantId:', tenantId);

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
          console.log('[useRoomRealtime] Room change detected for tenant:', tenantId, payload);
          
          // PHASE 2: Verify payload belongs to current tenant before invalidating
          if (payload.new && (payload.new as any).tenant_id !== tenantId) {
            console.error('[useRoomRealtime] IGNORED: Room change from different tenant', {
              currentTenantId: tenantId,
              payloadTenantId: (payload.new as any).tenant_id
            });
            return; // Don't invalidate cache for other tenants
          }
          
          // Invalidate relevant queries to refetch data (tenant-scoped)
          queryClient.invalidateQueries({ queryKey: ['rooms-grid', tenantId] });
          queryClient.invalidateQueries({ queryKey: ['room-detail'] });
          queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
        }
      )
      .subscribe();

    return () => {
      console.log('[useRoomRealtime] Cleaning up subscription for tenantId:', tenantId);
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

    console.log('[useBookingRealtime] Setting up real-time subscription for tenantId:', tenantId);

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
          console.log('[useBookingRealtime] Booking change detected for tenant:', tenantId, payload);
          
          // PHASE 2: Verify payload belongs to current tenant before invalidating
          if (payload.new && (payload.new as any).tenant_id !== tenantId) {
            console.error('[useBookingRealtime] IGNORED: Booking change from different tenant', {
              currentTenantId: tenantId,
              payloadTenantId: (payload.new as any).tenant_id
            });
            return; // Don't invalidate cache for other tenants
          }
          
          // Invalidate tenant-scoped queries only
          queryClient.invalidateQueries({ queryKey: ['rooms-grid', tenantId] });
          queryClient.invalidateQueries({ queryKey: ['room-detail'] });
          queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
          queryClient.invalidateQueries({ queryKey: ['overstay-rooms'] });
        }
      )
      .subscribe();

    return () => {
      console.log('[useBookingRealtime] Cleaning up subscription for tenantId:', tenantId);
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
