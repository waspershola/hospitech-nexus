import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useRingtone } from './useRingtone';

/**
 * QR Billing Tasks Hook
 * Fetches pending billing tasks and sets up realtime notifications
 */
export function useQRBillingTasks() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const { playRingtone } = useRingtone();

  // Fetch pending billing tasks count
  const { data: count = 0 } = useQuery({
    queryKey: ['qr-billing-tasks-count', tenantId],
    queryFn: async () => {
      if (!tenantId) return 0;

      const { count, error } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('billing_status', 'pending_frontdesk')
        .eq('billing_routed_to', 'frontdesk');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Setup realtime subscription for new billing tasks
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`qr-billing-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          
          // Check if this is a new billing task (just transferred to front desk)
          if (
            newRow.billing_status === 'pending_frontdesk' &&
            newRow.billing_routed_to === 'frontdesk' &&
            newRow.billing_reference_code
          ) {
            // Play notification sound
            playRingtone('/sounds/notification-default.mp3', { volume: 0.7 });
            
            // Invalidate query to refresh count
            queryClient.invalidateQueries({ 
              queryKey: ['qr-billing-tasks-count', tenantId] 
            });
            queryClient.invalidateQueries({ 
              queryKey: ['qr-billing-tasks', tenantId] 
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient, playRingtone]);

  return {
    count,
  };
}
