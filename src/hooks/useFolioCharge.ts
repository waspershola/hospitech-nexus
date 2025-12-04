/**
 * Folio Charge Hook - Phase 9 Offline Support
 * Attempts Electron offline path first, falls back to online Supabase RPC
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  isElectronContext,
  offlinePostCharge,
  saveFolioEvent,
} from '@/lib/offline/electronFolioBridge';

interface PostChargeParams {
  folioId: string;
  bookingId?: string;
  amount: number;
  description: string;
  department?: string;
  metadata?: Record<string, any>;
  requestId?: string;
  billingReferenceCode?: string;
}

export function useFolioCharge() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation({
    mutationFn: async (params: PostChargeParams) => {
      // Phase 9: Electron offline path first
      if (isElectronContext() && tenantId) {
        console.log('[useFolioCharge] Attempting offline charge...');
        const offlineResult = await offlinePostCharge(tenantId, {
          folioId: params.folioId,
          amount: params.amount,
          description: params.description,
          department: params.department,
          metadata: params.metadata,
        });

        if (offlineResult.data?.success) {
          console.log('[useFolioCharge] Offline charge successful');
          
          // Save event to journal
          await saveFolioEvent(tenantId, {
            type: 'charge_posted',
            folioId: params.folioId,
            bookingId: params.bookingId || '',
            timestamp: new Date().toISOString(),
            payload: {
              amount: params.amount,
              description: params.description,
              department: params.department,
              postedBy: user?.id,
            },
          });

          return { success: true, offline: true, transaction: offlineResult.data.transaction };
        }

        // If offline failed with error, log but continue to online
        if (offlineResult.error) {
          console.warn('[useFolioCharge] Offline charge failed, trying online:', offlineResult.error);
        }
      }

      // Online path - Direct Supabase RPC call
      const { data, error } = await supabase.rpc('folio_post_charge', {
        p_tenant_id: tenantId,
        p_folio_id: String(params.folioId),
        p_amount: params.amount,
        p_description: params.description,
        p_department: params.department || null,
        p_staff_id: user?.id || null,
        p_metadata: params.metadata || null,
        p_request_id: params.requestId || null,
        p_billing_reference_code: params.billingReferenceCode || null,
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to post charge');

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate folio queries
      queryClient.invalidateQueries({ queryKey: ['folio', variables.folioId] });
      queryClient.invalidateQueries({ queryKey: ['folio-transactions', variables.folioId] });
      queryClient.invalidateQueries({ queryKey: ['booking-folio'] });
      
      // Check if offline result (has offline property)
      const isOffline = typeof data === 'object' && data !== null && 'offline' in data && data.offline;
      if (isOffline) {
        toast.success('Charge posted (offline - will sync)');
      } else {
        toast.success('Charge posted to folio');
      }
    },
    onError: (error: any) => {
      toast.error(`Failed to post charge: ${error.message}`);
    },
  });
}

// Re-export for backward compatibility
export { useFolioCharge as usePostFolioCharge };
