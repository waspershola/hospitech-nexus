/**
 * Offline-Aware Folio Charge Hook - Phase 3
 * Wraps folio charge posting with offline queue support
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { offlineAwareRPC } from '@/lib/offline/offlineAwareClient';

interface PostChargeParams {
  folioId: string;
  amount: number;
  description: string;
  department?: string;
  metadata?: Record<string, any>;
  requestId?: string;
  billingReferenceCode?: string;
}

export function useOfflineAwareFolioCharge() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation({
    mutationFn: async (params: PostChargeParams) => {
      // Use offline-aware RPC wrapper
      const { data, error, queued } = await offlineAwareRPC('folio_post_charge', {
        p_tenant_id: tenantId,
        p_folio_id: params.folioId,
        p_amount: params.amount,
        p_description: params.description,
        p_department: params.department,
        p_staff_id: user?.id,
        p_metadata: params.metadata,
        p_request_id: params.requestId,
        p_billing_reference_code: params.billingReferenceCode,
      });

      if (queued) {
        return { success: true, queued: true, message: 'Charge queued for sync' };
      }

      if (error) throw error;
      if (!data) throw new Error('Failed to post charge');

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate folio queries
      queryClient.invalidateQueries({ queryKey: ['folio', variables.folioId] });
      queryClient.invalidateQueries({ queryKey: ['booking-folio'] });
      
      if (data.queued) {
        toast.info('Charge queued for sync when online', {
          description: 'Charge will be posted automatically when connection is restored'
        });
      } else {
        toast.success('Charge posted to folio');
      }
    },
    onError: (error: any) => {
      toast.error(`Failed to post charge: ${error.message}`);
    },
  });
}
